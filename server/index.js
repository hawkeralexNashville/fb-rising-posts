'use strict';

/**
 * Retro Pong server: HTTP (static client + REST API) and WebSocket (realtime).
 *
 * Routes:
 *   GET  /health           health check (returns 200 OK)
 *   GET  /robots.txt       SEO
 *   GET  /sitemap.xml      SEO (generated from BASE_URL)
 *   POST /api/register     { username, password } -> { token, username }
 *   POST /api/login        { username, password } -> { token, username }
 *   GET  /api/leaderboard  -> { leaderboard: [...] }
 *   GET  /*                static files from /client (defaults to index.html)
 *
 * WebSocket protocol is documented in client/game.js.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { WebSocketServer } = require('ws');

const db = require('./db');
const auth = require('./auth');
const { GameManager } = require('./game');
const { Matchmaker } = require('./matchmaker');

const PORT = process.env.PORT || 3000;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const CLIENT_DIR = path.join(__dirname, '..', 'client');
const ROOT_DIR = path.join(__dirname, '..');

const gameManager = new GameManager();
const matchmaker = new Matchmaker(gameManager);

// ---- Fun random guest names ----
const ADJECTIVES = [
  'Swift', 'Neon', 'Retro', 'Pixel', 'Turbo', 'Atomic', 'Cosmic', 'Vapor',
  'Laser', 'Quantum', 'Static', 'Glitch', 'Volt', 'Chrome', 'Cyber', 'Phantom',
];
const NOUNS = [
  'Paddle', 'Bat', 'Bounce', 'Ace', 'Rally', 'Spin', 'Volley', 'Smash',
  'Pong', 'Blip', 'Pulse', 'Arc', 'Dash', 'Bot', 'Striker', 'Comet',
];

function randomGuestName() {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a}${n}${Math.floor(Math.random() * 90 + 10)}`;
}

// ---- Static file helpers ----
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, BASE_URL).pathname);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(CLIENT_DIR, urlPath);
  // Prevent path traversal outside the client directory.
  if (!filePath.startsWith(CLIENT_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function readJsonBody(req, limit = 1e5) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

// ---- HTTP server ----
const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, BASE_URL);

  // Health check
  if (req.method === 'GET' && pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('OK');
  }

  // SEO: robots.txt
  if (req.method === 'GET' && pathname === '/robots.txt') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(
      `User-agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml\n`
    );
  }

  // SEO: sitemap.xml (generated so it always reflects BASE_URL)
  if (req.method === 'GET' && pathname === '/sitemap.xml') {
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    return res.end(
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        `  <url>\n    <loc>${BASE_URL}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n` +
        `</urlset>\n`
    );
  }

  // API: register
  if (req.method === 'POST' && pathname === '/api/register') {
    try {
      const { username, password } = await readJsonBody(req);
      const result = await auth.register(username, password);
      return sendJson(res, 201, result);
    } catch (err) {
      return sendJson(res, err.status || 500, { error: err.message || 'Server error' });
    }
  }

  // API: login
  if (req.method === 'POST' && pathname === '/api/login') {
    try {
      const { username, password } = await readJsonBody(req);
      const result = await auth.login(username, password);
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, err.status || 500, { error: err.message || 'Server error' });
    }
  }

  // API: leaderboard
  if (req.method === 'GET' && pathname === '/api/leaderboard') {
    try {
      const leaderboard = await db.getLeaderboard(25);
      return sendJson(res, 200, { leaderboard });
    } catch (err) {
      console.error('Leaderboard error:', err.message);
      return sendJson(res, 500, { error: 'Could not load leaderboard' });
    }
  }

  // Everything else: static client files
  if (req.method === 'GET') {
    return serveStatic(req, res);
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method not allowed');
});

// ---- WebSocket server ----
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  // Identify the player from the optional ?token query parameter.
  let identity;
  try {
    const url = new URL(req.url, BASE_URL);
    const token = url.searchParams.get('token');
    const payload = auth.verifyToken(token);
    if (payload) {
      identity = { userId: payload.userId, username: payload.username, isGuest: false };
    }
  } catch (e) {
    /* fall through to guest */
  }
  if (!identity) {
    identity = { userId: null, username: randomGuestName(), isGuest: true };
  }

  // Attach identity to the socket for later message handling.
  ws.identity = identity;

  ws.send(
    JSON.stringify({
      type: 'welcome',
      username: identity.username,
      isGuest: identity.isGuest,
    })
  );

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      return;
    }

    switch (msg.type) {
      case 'join_queue': {
        matchmaker.enqueue({
          ws,
          userId: identity.userId,
          username: identity.username,
          isGuest: identity.isGuest,
        });
        break;
      }
      case 'leave_queue': {
        matchmaker.remove(ws);
        break;
      }
      case 'paddle': {
        if (ws.gameId && typeof msg.y === 'number') {
          const game = gameManager.get(ws.gameId);
          if (game) game.setPaddle(ws.gameSide, msg.y);
        }
        break;
      }
      case 'reconnect': {
        const ok = gameManager.reconnect(msg.gameId, msg.side, ws, msg.reconnectToken);
        if (!ok) {
          ws.send(JSON.stringify({ type: 'reconnect_failed' }));
        }
        break;
      }
      case 'ping': {
        // Echo timestamp back for client-side latency measurement.
        ws.send(JSON.stringify({ type: 'pong', t: msg.t }));
        break;
      }
      default:
        break;
    }
  });

  ws.on('close', () => {
    matchmaker.remove(ws);
    if (ws.gameId) {
      const game = gameManager.get(ws.gameId);
      if (game) game.handleDisconnect(ws.gameSide);
    }
  });

  ws.on('error', () => {
    /* connection-level errors are handled via close */
  });
});

// ---- Startup ----
async function startServer() {
  try {
    await db.init();
  } catch (err) {
    console.error('FATAL: database migration failed:', err.message);
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`Retro Pong server listening on port ${PORT}`);
    console.log(`Base URL: ${BASE_URL}`);
  });
}

startServer();
