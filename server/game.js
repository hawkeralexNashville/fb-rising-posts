'use strict';

/**
 * Authoritative game simulation for online matches.
 *
 * The server owns the ball and the score. Each client owns its own paddle
 * position (client-side prediction) and reports it to the server, which uses
 * those positions for collision and rebroadcasts them to the opponent.
 *
 * A `GameManager` owns all active games and handles reconnection lookups.
 *
 * NOTE: The physics constants and collision math here are mirrored on the
 * client in `client/engine.js`, which powers the offline "vs Computer" mode.
 * Keep the two in sync.
 */

const crypto = require('crypto');
const db = require('./db');

// ---- Shared constants (mirror client/engine.js) ----
const FIELD = {
  WIDTH: 800,
  HEIGHT: 500,
  PADDLE_WIDTH: 12,
  PADDLE_HEIGHT: 80,
  PADDLE_OFFSET: 24, // gap between paddle outer edge and the wall
  BALL_RADIUS: 8,
  BASE_SPEED: 6, // px per tick (~360 px/s at 60 ticks)
  SPEED_MULT: 1.05, // speed gain per paddle hit
  MAX_SPEED: 14,
  MAX_BOUNCE_ANGLE: (60 * Math.PI) / 180, // sharpest deflection off a paddle edge
  WIN_SCORE: 7,
};

const TICK_MS = 1000 / 60; // ~60 ticks/second
const COUNTDOWN_STEPS = [3, 2, 1]; // "3... 2... 1..." before each serve
const COUNTDOWN_STEP_MS = 700; // ~2 second countdown total
const RECONNECT_WINDOW_MS = 10000; // 10s window to reconnect mid-game

function send(ws, obj) {
  if (ws && ws.readyState === 1 /* OPEN */) {
    ws.send(JSON.stringify(obj));
  }
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

class Game {
  /**
   * @param {object} manager  the owning GameManager
   * @param {object} p1  left player  { ws, userId, username, isGuest }
   * @param {object} p2  right player { ws, userId, username, isGuest }
   */
  constructor(manager, p1, p2) {
    this.manager = manager;
    this.id = crypto.randomBytes(8).toString('hex');

    const paddleCenter = FIELD.HEIGHT / 2;

    this.players = {
      left: {
        ...p1,
        side: 'left',
        paddleY: paddleCenter,
        connected: true,
        reconnectToken: crypto.randomBytes(8).toString('hex'),
      },
      right: {
        ...p2,
        side: 'right',
        paddleY: paddleCenter,
        connected: true,
        reconnectToken: crypto.randomBytes(8).toString('hex'),
      },
    };

    this.score = { left: 0, right: 0 };
    this.ball = { x: FIELD.WIDTH / 2, y: FIELD.HEIGHT / 2, vx: 0, vy: 0, speed: FIELD.BASE_SPEED };
    this.state = 'countdown'; // countdown | playing | paused | finished
    this.tickTimer = null;
    this.countdownTimer = null;
    this.reconnectTimer = null;
    this.finished = false;

    // Tag each socket so the manager can route messages and disconnects.
    this.attachSocket('left', p1.ws);
    this.attachSocket('right', p2.ws);

    this.start();
  }

  attachSocket(side, ws) {
    const player = this.players[side];
    player.ws = ws;
    ws.gameId = this.id;
    ws.gameSide = side;
  }

  start() {
    // Announce the match to both players.
    for (const side of ['left', 'right']) {
      const me = this.players[side];
      const opp = this.players[side === 'left' ? 'right' : 'left'];
      send(me.ws, {
        type: 'match_found',
        gameId: this.id,
        side,
        opponent: opp.username,
        reconnectToken: me.reconnectToken,
        field: FIELD,
      });
    }
    // First serve direction is random.
    this.beginCountdown(Math.random() < 0.5 ? 'left' : 'right');
    this.tickTimer = setInterval(() => this.tick(), TICK_MS);
  }

  /** Reset ball to centre and run the 3-2-1 countdown, then serve. */
  beginCountdown(serveToward) {
    this.state = 'countdown';
    this.ball.x = FIELD.WIDTH / 2;
    this.ball.y = FIELD.HEIGHT / 2;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.speed = FIELD.BASE_SPEED; // speed resets after each point

    let i = 0;
    const step = () => {
      if (this.finished) return;
      if (i < COUNTDOWN_STEPS.length) {
        this.broadcast({ type: 'countdown', value: COUNTDOWN_STEPS[i] });
        i += 1;
        this.countdownTimer = setTimeout(step, COUNTDOWN_STEP_MS);
      } else {
        this.serve(serveToward);
      }
    };
    step();
  }

  /** Launch the ball toward the player who just lost the point. */
  serve(towardSide) {
    const dir = towardSide === 'left' ? -1 : 1;
    // Random launch angle within +/- 30 degrees of horizontal.
    const angle = (Math.random() * 2 - 1) * (Math.PI / 6);
    this.ball.speed = FIELD.BASE_SPEED;
    this.ball.vx = dir * this.ball.speed * Math.cos(angle);
    this.ball.vy = this.ball.speed * Math.sin(angle);
    this.state = 'playing';
    this.broadcast({ type: 'serve' });
  }

  setPaddle(side, y) {
    const player = this.players[side];
    if (!player) return;
    player.paddleY = clamp(y, FIELD.PADDLE_HEIGHT / 2, FIELD.HEIGHT - FIELD.PADDLE_HEIGHT / 2);
  }

  tick() {
    if (this.state !== 'playing') {
      // Still stream state during countdown/pause so paddles stay in sync.
      this.broadcastState();
      return;
    }

    const b = this.ball;
    b.x += b.vx;
    b.y += b.vy;

    // Top / bottom walls
    if (b.y - FIELD.BALL_RADIUS <= 0) {
      b.y = FIELD.BALL_RADIUS;
      b.vy = Math.abs(b.vy);
    } else if (b.y + FIELD.BALL_RADIUS >= FIELD.HEIGHT) {
      b.y = FIELD.HEIGHT - FIELD.BALL_RADIUS;
      b.vy = -Math.abs(b.vy);
    }

    this.handlePaddle('left');
    this.handlePaddle('right');

    // Scoring
    if (b.x + FIELD.BALL_RADIUS < 0) {
      this.scorePoint('right'); // left player missed
    } else if (b.x - FIELD.BALL_RADIUS > FIELD.WIDTH) {
      this.scorePoint('left'); // right player missed
    } else {
      this.broadcastState();
    }
  }

  handlePaddle(side) {
    const b = this.ball;
    const player = this.players[side];
    const half = FIELD.PADDLE_HEIGHT / 2;

    // X of the paddle's inner face.
    const faceX =
      side === 'left'
        ? FIELD.PADDLE_OFFSET + FIELD.PADDLE_WIDTH
        : FIELD.WIDTH - FIELD.PADDLE_OFFSET - FIELD.PADDLE_WIDTH;

    const movingTowardPaddle = side === 'left' ? b.vx < 0 : b.vx > 0;
    if (!movingTowardPaddle) return;

    const crossed =
      side === 'left'
        ? b.x - FIELD.BALL_RADIUS <= faceX && b.x > FIELD.PADDLE_OFFSET
        : b.x + FIELD.BALL_RADIUS >= faceX && b.x < FIELD.WIDTH - FIELD.PADDLE_OFFSET;

    if (!crossed) return;

    const withinPaddle =
      b.y >= player.paddleY - half - FIELD.BALL_RADIUS &&
      b.y <= player.paddleY + half + FIELD.BALL_RADIUS;

    if (!withinPaddle) return;

    // Deflection angle depends on where the ball struck the paddle.
    const relative = clamp((b.y - player.paddleY) / half, -1, 1);
    const bounceAngle = relative * FIELD.MAX_BOUNCE_ANGLE;

    b.speed = Math.min(b.speed * FIELD.SPEED_MULT, FIELD.MAX_SPEED);
    const dir = side === 'left' ? 1 : -1;
    b.vx = dir * b.speed * Math.cos(bounceAngle);
    b.vy = b.speed * Math.sin(bounceAngle);

    // Nudge the ball off the paddle face so it can't get stuck inside it.
    b.x = side === 'left' ? faceX + FIELD.BALL_RADIUS : faceX - FIELD.BALL_RADIUS;
  }

  scorePoint(scoringSide) {
    this.score[scoringSide] += 1;
    const losingSide = scoringSide === 'left' ? 'right' : 'left';

    this.broadcast({
      type: 'goal',
      scorer: scoringSide,
      score: { ...this.score },
    });

    if (this.score[scoringSide] >= FIELD.WIN_SCORE) {
      this.finish(scoringSide, false);
    } else {
      // Serve toward the player who just lost the point.
      this.beginCountdown(losingSide);
    }
  }

  broadcastState() {
    const payload = {
      type: 'state',
      state: this.state,
      ball: { x: Math.round(this.ball.x), y: Math.round(this.ball.y) },
      paddles: {
        left: Math.round(this.players.left.paddleY),
        right: Math.round(this.players.right.paddleY),
      },
      score: { ...this.score },
    };
    this.broadcast(payload);
  }

  broadcast(obj) {
    send(this.players.left.ws, obj);
    send(this.players.right.ws, obj);
  }

  /**
   * End the game normally or by forfeit, persist it, and notify both players.
   */
  async finish(winningSide, byForfeit) {
    if (this.finished) return;
    this.finished = true;
    this.state = 'finished';
    this.clearTimers();

    const winner = this.players[winningSide];
    const loserSide = winningSide === 'left' ? 'right' : 'left';

    this.broadcast({
      type: 'game_over',
      winner: winningSide,
      winnerName: winner.username,
      byForfeit: !!byForfeit,
      score: { ...this.score },
    });

    // Per-player "you scored X points" prompt for guests is handled client-side.

    // Persist the game. Both-guest games are recorded with null ids and are
    // harmless; they never reach the leaderboard.
    try {
      await db.recordGame({
        player1Id: this.players.left.userId,
        player2Id: this.players.right.userId,
        winnerId: this.players[winningSide].userId,
        player1Score: this.score.left,
        player2Score: this.score.right,
        endedByForfeit: !!byForfeit,
      });
    } catch (err) {
      console.error('Failed to record game:', err.message);
    }

    this.manager.removeGame(this.id);
  }

  // ---- Disconnect / reconnect handling ----

  handleDisconnect(side) {
    if (this.finished) return;
    const player = this.players[side];
    player.connected = false;
    player.ws = null;

    const other = this.players[side === 'left' ? 'right' : 'left'];

    if (!other.connected) {
      // Both players gone simultaneously -> cancel, no points awarded.
      this.cancel();
      return;
    }

    // Pause and give the disconnected player a window to return.
    this.state = 'paused';
    let secondsLeft = Math.ceil(RECONNECT_WINDOW_MS / 1000);
    send(other.ws, { type: 'opponent_disconnected', secondsLeft });

    const startedAt = Date.now();
    const countdown = setInterval(() => {
      secondsLeft = Math.ceil((RECONNECT_WINDOW_MS - (Date.now() - startedAt)) / 1000);
      if (secondsLeft > 0 && other.connected) {
        send(other.ws, { type: 'opponent_disconnected', secondsLeft });
      }
    }, 1000);

    this.reconnectTimer = setTimeout(() => {
      clearInterval(countdown);
      this.reconnectTimer = null;
      if (this.finished) return;
      // No reconnect: remaining player wins by forfeit.
      this.finish(other.side, true);
    }, RECONNECT_WINDOW_MS);

    // Stash the interval so cancel/reconnect can clear it.
    this._reconnectCountdown = countdown;
  }

  handleReconnect(side, ws, token) {
    const player = this.players[side];
    if (!player || player.reconnectToken !== token || this.finished) {
      return false;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this._reconnectCountdown) {
      clearInterval(this._reconnectCountdown);
      this._reconnectCountdown = null;
    }

    player.connected = true;
    this.attachSocket(side, ws);

    const opp = this.players[side === 'left' ? 'right' : 'left'];
    send(ws, {
      type: 'reconnected',
      gameId: this.id,
      side,
      opponent: opp.username,
      score: { ...this.score },
      field: FIELD,
    });
    send(opp.ws, { type: 'opponent_reconnected' });

    // Resume with a fresh countdown serving toward the side that disconnected,
    // so play restarts fairly from centre.
    this.beginCountdown(side);
    return true;
  }

  cancel() {
    if (this.finished) return;
    this.finished = true;
    this.state = 'finished';
    this.clearTimers();
    this.broadcast({ type: 'game_cancelled' });
    this.manager.removeGame(this.id);
  }

  clearTimers() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.countdownTimer) clearTimeout(this.countdownTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this._reconnectCountdown) clearInterval(this._reconnectCountdown);
    this.tickTimer = this.countdownTimer = this.reconnectTimer = null;
    this._reconnectCountdown = null;
  }
}

class GameManager {
  constructor() {
    this.games = new Map(); // gameId -> Game
  }

  createGame(p1, p2) {
    const game = new Game(this, p1, p2);
    this.games.set(game.id, game);
    return game;
  }

  get(gameId) {
    return this.games.get(gameId);
  }

  removeGame(gameId) {
    this.games.delete(gameId);
  }

  /** Attempt to reattach a returning socket to its in-progress game. */
  reconnect(gameId, side, ws, token) {
    const game = this.games.get(gameId);
    if (!game) return false;
    return game.handleReconnect(side, ws, token);
  }
}

module.exports = { GameManager, FIELD };
