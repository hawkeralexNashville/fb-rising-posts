'use strict';

/**
 * Client game controller: canvas rendering, keyboard input, the WebSocket
 * client for online play, and the offline vs-Computer loop.
 *
 * WebSocket protocol
 * ------------------
 * Client -> Server:
 *   { type: 'join_queue' }
 *   { type: 'leave_queue' }
 *   { type: 'paddle', y }
 *   { type: 'reconnect', gameId, side, reconnectToken }
 *   { type: 'ping', t }
 *
 * Server -> Client:
 *   { type: 'welcome', username, isGuest }
 *   { type: 'queued' }
 *   { type: 'queue_timeout' }
 *   { type: 'match_found', gameId, side, opponent, reconnectToken, field }
 *   { type: 'countdown', value }
 *   { type: 'serve' }
 *   { type: 'state', state, ball, paddles, score }
 *   { type: 'goal', scorer, score }
 *   { type: 'game_over', winner, winnerName, byForfeit, score }
 *   { type: 'opponent_disconnected', secondsLeft }
 *   { type: 'opponent_reconnected' }
 *   { type: 'reconnected', gameId, side, opponent, score, field }
 *   { type: 'reconnect_failed' }
 *   { type: 'game_cancelled' }
 *   { type: 'pong', t }
 */
(function (global) {
  const FIELD = global.PongEngine.FIELD;
  const PADDLE_SPEED = global.PongEngine.PADDLE_SPEED;
  const FONT = '"Press Start 2P", monospace';

  let canvas, ctx;
  let rafId = null;

  // Active mode: 'online' | 'local' | null
  let mode = null;

  // Keyboard state.
  const keys = { up: false, down: false };

  // ---- Online networking state ----
  const net = {
    ws: null,
    side: null, // 'left' | 'right'
    opponent: '',
    gameId: null,
    reconnectToken: null,
    ball: { x: FIELD.WIDTH / 2, y: FIELD.HEIGHT / 2 },
    paddles: { left: FIELD.HEIGHT / 2, right: FIELD.HEIGHT / 2 },
    score: { left: 0, right: 0 },
    state: 'idle', // idle | countdown | playing | paused | finished
    countdownValue: 0,
    ownPaddleY: FIELD.HEIGHT / 2, // client-side prediction
    latency: 0,
    highLatency: false,
    overlay: null, // transient status text drawn on the canvas
    reconnecting: false,
  };

  // ---- Offline state ----
  let localGame = null;

  let pingTimer = null;

  function token() {
    return localStorage.getItem('pong_token');
  }

  function wsUrl() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const t = token();
    return `${proto}//${location.host}${t ? `?token=${encodeURIComponent(t)}` : ''}`;
  }

  // ---------------------------------------------------------------------------
  // Canvas setup + rendering
  // ---------------------------------------------------------------------------
  function initCanvas() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    canvas.width = FIELD.WIDTH;
    canvas.height = FIELD.HEIGHT;
  }

  function clearField() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, FIELD.WIDTH, FIELD.HEIGHT);

    // Dotted centre line.
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 16]);
    ctx.beginPath();
    ctx.moveTo(FIELD.WIDTH / 2, 0);
    ctx.lineTo(FIELD.WIDTH / 2, FIELD.HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawPaddle(side, y) {
    const x =
      side === 'left'
        ? FIELD.PADDLE_OFFSET
        : FIELD.WIDTH - FIELD.PADDLE_OFFSET - FIELD.PADDLE_WIDTH;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y - FIELD.PADDLE_HEIGHT / 2, FIELD.PADDLE_WIDTH, FIELD.PADDLE_HEIGHT);
  }

  function drawBall(b) {
    ctx.fillStyle = '#fff';
    // Square "pixel" ball for the retro look.
    const s = FIELD.BALL_RADIUS * 2;
    ctx.fillRect(b.x - FIELD.BALL_RADIUS, b.y - FIELD.BALL_RADIUS, s, s);
  }

  function drawScore(left, right) {
    ctx.fillStyle = '#fff';
    ctx.font = `40px ${FONT}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillText(String(left), FIELD.WIDTH / 2 - 80, 24);
    ctx.fillText(String(right), FIELD.WIDTH / 2 + 80, 24);
  }

  function drawCenterText(text, size) {
    ctx.fillStyle = '#fff';
    ctx.font = `${size}px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, FIELD.WIDTH / 2, FIELD.HEIGHT / 2);
  }

  function drawCornerText(text) {
    ctx.fillStyle = '#fff';
    ctx.font = `10px ${FONT}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'right';
    ctx.fillText(text, FIELD.WIDTH - 12, 12);
  }

  function drawFrame(opts) {
    clearField();
    drawScore(opts.score.left, opts.score.right);
    drawPaddle('left', opts.paddles.left);
    drawPaddle('right', opts.paddles.right);

    if (opts.showBall) drawBall(opts.ball);

    if (opts.countdownValue) {
      drawCenterText(String(opts.countdownValue), 80);
    }
    if (opts.centerText) {
      drawCenterText(opts.centerText, opts.centerSize || 20);
    }
    if (opts.cornerText) {
      drawCornerText(opts.cornerText);
    }
  }

  // ---------------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------------
  function loop(now) {
    if (mode === 'online') {
      renderOnline();
    } else if (mode === 'local') {
      renderLocal(now);
    }
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (rafId === null) rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Online play
  // ---------------------------------------------------------------------------
  function renderOnline() {
    // Move + predict own paddle, then report it to the server.
    if (net.state === 'playing' || net.state === 'countdown') {
      let dir = 0;
      if (keys.up) dir -= 1;
      if (keys.down) dir += 1;
      if (dir !== 0) {
        net.ownPaddleY = clamp(
          net.ownPaddleY + dir * PADDLE_SPEED,
          FIELD.PADDLE_HEIGHT / 2,
          FIELD.HEIGHT - FIELD.PADDLE_HEIGHT / 2
        );
      }
      sendPaddle(net.ownPaddleY);
    }

    const paddles = { left: net.paddles.left, right: net.paddles.right };
    // Render our own paddle from the predicted value for zero input lag.
    paddles[net.side] = net.ownPaddleY;

    const opts = {
      score: net.score,
      paddles,
      ball: net.ball,
      showBall: net.state === 'playing',
      countdownValue: net.state === 'countdown' ? net.countdownValue : 0,
      centerText: net.overlay || null,
      centerSize: 16,
      cornerText: net.highLatency ? 'HIGH LATENCY' : null,
    };
    drawFrame(opts);
  }

  function sendPaddle(y) {
    if (net.ws && net.ws.readyState === WebSocket.OPEN) {
      net.ws.send(JSON.stringify({ type: 'paddle', y }));
    }
  }

  function connect(onOpen) {
    const ws = new WebSocket(wsUrl());
    net.ws = ws;

    ws.addEventListener('open', () => {
      startPing();
      if (onOpen) onOpen();
    });

    ws.addEventListener('message', (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch (e) {
        return;
      }
      handleServerMessage(msg);
    });

    ws.addEventListener('close', () => {
      stopPing();
      // If a game is in progress, attempt to reconnect within the window.
      if (mode === 'online' && net.gameId && net.state !== 'finished' && !net.reconnecting) {
        attemptReconnect();
      }
    });

    ws.addEventListener('error', () => {});
    return ws;
  }

  function handleServerMessage(msg) {
    switch (msg.type) {
      case 'welcome':
        global.PongUI.onWelcome(msg.username, msg.isGuest);
        break;

      case 'queued':
        global.PongUI.showScreen('waiting');
        break;

      case 'queue_timeout':
        global.PongUI.onQueueTimeout();
        break;

      case 'match_found':
        net.side = msg.side;
        net.opponent = msg.opponent;
        net.gameId = msg.gameId;
        net.reconnectToken = msg.reconnectToken;
        net.score = { left: 0, right: 0 };
        net.ownPaddleY = FIELD.HEIGHT / 2;
        net.state = 'countdown';
        net.overlay = null;
        mode = 'online';
        global.PongUI.onMatchFound(msg.opponent, msg.side);
        startLoop();
        break;

      case 'countdown':
        net.state = 'countdown';
        net.countdownValue = msg.value;
        net.overlay = null;
        break;

      case 'serve':
        net.state = 'playing';
        net.countdownValue = 0;
        break;

      case 'state':
        net.state = msg.state;
        net.ball = msg.ball;
        net.paddles = msg.paddles;
        net.score = msg.score;
        break;

      case 'goal':
        net.score = msg.score;
        break;

      case 'opponent_disconnected':
        net.state = 'paused';
        net.overlay = `Opponent disconnected - waiting ${msg.secondsLeft}s...`;
        break;

      case 'opponent_reconnected':
        net.overlay = null;
        break;

      case 'reconnected':
        net.reconnecting = false;
        net.side = msg.side;
        net.opponent = msg.opponent;
        net.score = msg.score;
        net.state = 'countdown';
        net.overlay = null;
        global.PongUI.hideReconnecting();
        break;

      case 'reconnect_failed':
        net.reconnecting = false;
        endOnline();
        global.PongUI.onConnectionLost();
        break;

      case 'game_over':
        net.state = 'finished';
        handleGameOver(msg);
        break;

      case 'game_cancelled':
        net.state = 'finished';
        endOnline();
        global.PongUI.onGameCancelled();
        break;

      case 'pong': {
        const rtt = Date.now() - msg.t;
        net.latency = rtt;
        net.highLatency = rtt > 150;
        break;
      }

      default:
        break;
    }
  }

  function handleGameOver(msg) {
    const won = msg.winner === net.side;
    const myScore = net.score[net.side];
    stopLoop();
    // Final frame so the ending score is visible behind the overlay.
    drawFrame({
      score: net.score,
      paddles: { left: net.paddles.left, right: net.paddles.right },
      ball: net.ball,
      showBall: false,
      centerText: won ? 'YOU WIN' : 'YOU LOSE',
      centerSize: 30,
    });
    closeSocket();
    global.PongUI.onGameOver({
      won,
      byForfeit: msg.byForfeit,
      myScore,
      isGuest: global.PongUI.isGuest(),
      mode: 'online',
    });
  }

  function attemptReconnect() {
    net.reconnecting = true;
    global.PongUI.showReconnecting();
    const ws = connect(() => {
      ws.send(
        JSON.stringify({
          type: 'reconnect',
          gameId: net.gameId,
          side: net.side,
          reconnectToken: net.reconnectToken,
        })
      );
    });
  }

  function startPing() {
    stopPing();
    pingTimer = setInterval(() => {
      if (net.ws && net.ws.readyState === WebSocket.OPEN) {
        net.ws.send(JSON.stringify({ type: 'ping', t: Date.now() }));
      }
    }, 2000);
  }

  function stopPing() {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = null;
  }

  function closeSocket() {
    stopPing();
    if (net.ws) {
      try {
        net.ws.close();
      } catch (e) {}
    }
    net.ws = null;
  }

  function endOnline() {
    closeSocket();
    stopLoop();
    net.gameId = null;
    net.state = 'idle';
    net.overlay = null;
    net.reconnecting = false;
    mode = null;
  }

  // Public: start matchmaking.
  function playOnline() {
    net.gameId = null;
    net.state = 'idle';
    mode = 'online';
    if (net.ws && net.ws.readyState === WebSocket.OPEN) {
      net.ws.send(JSON.stringify({ type: 'join_queue' }));
    } else {
      connect(() => {
        net.ws.send(JSON.stringify({ type: 'join_queue' }));
      });
    }
  }

  function cancelQueue() {
    if (net.ws && net.ws.readyState === WebSocket.OPEN) {
      net.ws.send(JSON.stringify({ type: 'leave_queue' }));
    }
    endOnline();
  }

  // ---------------------------------------------------------------------------
  // Offline vs-Computer play
  // ---------------------------------------------------------------------------
  function playVsComputer(difficulty) {
    endOnline(); // no socket for offline games
    mode = 'local';
    localGame = new global.PongEngine.LocalGame(difficulty);
    startLoop();
  }

  function renderLocal(now) {
    // Human controls the left paddle with W/S.
    let dir = 0;
    if (keys.up) dir -= 1;
    if (keys.down) dir += 1;
    if (dir !== 0) localGame.movePlayer(dir);

    localGame.update(now);

    drawFrame({
      score: localGame.score,
      paddles: { left: localGame.left.paddleY, right: localGame.right.paddleY },
      ball: localGame.ball,
      showBall: localGame.state === 'playing',
      countdownValue: localGame.state === 'countdown' ? localGame.countdownValue : 0,
    });

    if (localGame.state === 'finished') {
      const won = localGame.winner === 'left';
      const myScore = localGame.score.left;
      stopLoop();
      drawFrame({
        score: localGame.score,
        paddles: { left: localGame.left.paddleY, right: localGame.right.paddleY },
        ball: localGame.ball,
        showBall: false,
        centerText: won ? 'YOU WIN' : 'YOU LOSE',
        centerSize: 30,
      });
      mode = null;
      global.PongUI.onGameOver({
        won,
        byForfeit: false,
        myScore,
        isGuest: global.PongUI.isGuest(),
        mode: 'local',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup when leaving the game screen
  // ---------------------------------------------------------------------------
  function leaveGame() {
    endOnline();
    localGame = null;
    mode = null;
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------
  function bindInput() {
    document.addEventListener('keydown', onKey(true));
    document.addEventListener('keyup', onKey(false));
  }

  function onKey(isDown) {
    return (e) => {
      // In online mode, controls depend on which paddle you were assigned:
      // left paddle = W/S, right paddle = Up/Down arrows.
      // In offline mode the human is always the left paddle (W/S).
      const useArrows = mode === 'online' && net.side === 'right';

      let handled = true;
      if (useArrows) {
        if (e.key === 'ArrowUp') keys.up = isDown;
        else if (e.key === 'ArrowDown') keys.down = isDown;
        else handled = false;
      } else {
        if (e.key === 'w' || e.key === 'W') keys.up = isDown;
        else if (e.key === 's' || e.key === 'S') keys.down = isDown;
        else handled = false;
      }
      if (handled) e.preventDefault();
    };
  }

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  // ---------------------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------------------
  function init() {
    initCanvas();
    bindInput();
    // Draw an idle field so the canvas isn't blank before the first game.
    drawFrame({
      score: { left: 0, right: 0 },
      paddles: { left: FIELD.HEIGHT / 2, right: FIELD.HEIGHT / 2 },
      ball: { x: FIELD.WIDTH / 2, y: FIELD.HEIGHT / 2 },
      showBall: false,
    });
  }

  global.Pong = {
    init,
    playOnline,
    cancelQueue,
    playVsComputer,
    leaveGame,
    getLatency: () => net.latency,
  };
})(window);
