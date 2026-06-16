'use strict';

/**
 * Shared Pong physics + offline game engine.
 *
 * The constants and collision math here mirror the authoritative server
 * (server/game.js). This module is used for the offline "vs Computer" mode,
 * which runs entirely client-side with no WebSocket connection.
 *
 * Exposes a global `PongEngine` with:
 *   - FIELD       the shared dimensions / physics constants
 *   - LocalGame   a self-contained single-player match vs an AI opponent
 */
(function (global) {
  const FIELD = {
    WIDTH: 800,
    HEIGHT: 500,
    PADDLE_WIDTH: 12,
    PADDLE_HEIGHT: 80,
    PADDLE_OFFSET: 24,
    BALL_RADIUS: 8,
    BASE_SPEED: 6,
    SPEED_MULT: 1.05,
    MAX_SPEED: 14,
    MAX_BOUNCE_ANGLE: (60 * Math.PI) / 180,
    WIN_SCORE: 7,
  };

  const COUNTDOWN_MS = 2100; // "3... 2... 1..." (~0.7s each)
  const PADDLE_SPEED = 7; // px per frame for the human paddle

  // AI tuning per difficulty.
  //   speed       max px the AI paddle moves per frame
  //   reactionMs  how often the AI re-reads the ball (reaction delay)
  //   error       random aim error added to the target (px)
  //   mistake     chance per decision to deliberately mis-aim (miss)
  const AI = {
    easy: { speed: 4.2, reactionMs: 230, error: 70, mistake: 0.14 },
    medium: { speed: 6.5, reactionMs: 150, error: 16, mistake: 0 },
    hard: { speed: 9.5, reactionMs: 0, error: 5, mistake: 0 },
  };

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  class LocalGame {
    constructor(difficulty) {
      this.ai = AI[difficulty] || AI.medium;
      this.difficulty = difficulty;
      const mid = FIELD.HEIGHT / 2;

      this.left = { paddleY: mid }; // human
      this.right = { paddleY: mid }; // AI
      this.score = { left: 0, right: 0 };
      this.ball = { x: FIELD.WIDTH / 2, y: mid, vx: 0, vy: 0, speed: FIELD.BASE_SPEED };

      this.state = 'countdown'; // countdown | playing | finished
      this.countdownValue = 3;
      this.winner = null;

      this._aiTarget = mid;
      this._aiLastDecision = 0;
      this._countdownEnd = 0;
      this._serveToward = Math.random() < 0.5 ? 'left' : 'right';
      this._started = false;
    }

    /** Move the human paddle directly (client-controlled). */
    setPlayerPaddle(y) {
      this.left.paddleY = clamp(y, FIELD.PADDLE_HEIGHT / 2, FIELD.HEIGHT - FIELD.PADDLE_HEIGHT / 2);
    }

    movePlayer(dir) {
      // dir: -1 up, +1 down, 0 none
      this.setPlayerPaddle(this.left.paddleY + dir * PADDLE_SPEED);
    }

    beginCountdown(now, serveToward) {
      this.state = 'countdown';
      this._serveToward = serveToward;
      this._countdownEnd = now + COUNTDOWN_MS;
      this.ball.x = FIELD.WIDTH / 2;
      this.ball.y = FIELD.HEIGHT / 2;
      this.ball.vx = 0;
      this.ball.vy = 0;
      this.ball.speed = FIELD.BASE_SPEED;
    }

    serve(towardSide) {
      const dir = towardSide === 'left' ? -1 : 1;
      const angle = (Math.random() * 2 - 1) * (Math.PI / 6);
      this.ball.speed = FIELD.BASE_SPEED;
      this.ball.vx = dir * this.ball.speed * Math.cos(angle);
      this.ball.vy = this.ball.speed * Math.sin(angle);
      this.state = 'playing';
    }

    /** Advance the simulation. Call once per animation frame with a timestamp. */
    update(now) {
      if (!this._started) {
        this._started = true;
        this.beginCountdown(now, this._serveToward);
      }

      if (this.state === 'finished') return;

      if (this.state === 'countdown') {
        const remaining = this._countdownEnd - now;
        if (remaining <= 0) {
          this.serve(this._serveToward);
        } else {
          this.countdownValue = Math.ceil(remaining / 700);
        }
        return;
      }

      this.updateAI(now);
      this.stepBall();
    }

    updateAI(now) {
      const b = this.ball;
      // Re-decide the target only after the reaction delay has elapsed.
      if (now - this._aiLastDecision >= this.ai.reactionMs) {
        this._aiLastDecision = now;
        const movingToAI = b.vx > 0;
        if (!movingToAI) {
          // Drift toward centre when the ball is heading away.
          this._aiTarget = FIELD.HEIGHT / 2;
        } else if (Math.random() < this.ai.mistake) {
          // Deliberate mistake: aim away from the ball so it misses.
          this._aiTarget = b.y > FIELD.HEIGHT / 2 ? b.y - 180 : b.y + 180;
        } else {
          this._aiTarget = b.y + (Math.random() * 2 - 1) * this.ai.error;
        }
      }

      const target = clamp(
        this._aiTarget,
        FIELD.PADDLE_HEIGHT / 2,
        FIELD.HEIGHT - FIELD.PADDLE_HEIGHT / 2
      );
      const diff = target - this.right.paddleY;
      const move = clamp(diff, -this.ai.speed, this.ai.speed);
      this.right.paddleY += move;
    }

    stepBall() {
      const b = this.ball;
      b.x += b.vx;
      b.y += b.vy;

      if (b.y - FIELD.BALL_RADIUS <= 0) {
        b.y = FIELD.BALL_RADIUS;
        b.vy = Math.abs(b.vy);
      } else if (b.y + FIELD.BALL_RADIUS >= FIELD.HEIGHT) {
        b.y = FIELD.HEIGHT - FIELD.BALL_RADIUS;
        b.vy = -Math.abs(b.vy);
      }

      this.handlePaddle('left');
      this.handlePaddle('right');

      if (b.x + FIELD.BALL_RADIUS < 0) {
        this.scorePoint('right');
      } else if (b.x - FIELD.BALL_RADIUS > FIELD.WIDTH) {
        this.scorePoint('left');
      }
    }

    handlePaddle(side) {
      const b = this.ball;
      const paddleY = this[side].paddleY;
      const half = FIELD.PADDLE_HEIGHT / 2;

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
        b.y >= paddleY - half - FIELD.BALL_RADIUS && b.y <= paddleY + half + FIELD.BALL_RADIUS;
      if (!withinPaddle) return;

      const relative = clamp((b.y - paddleY) / half, -1, 1);
      const bounceAngle = relative * FIELD.MAX_BOUNCE_ANGLE;

      b.speed = Math.min(b.speed * FIELD.SPEED_MULT, FIELD.MAX_SPEED);
      const dir = side === 'left' ? 1 : -1;
      b.vx = dir * b.speed * Math.cos(bounceAngle);
      b.vy = b.speed * Math.sin(bounceAngle);
      b.x = side === 'left' ? faceX + FIELD.BALL_RADIUS : faceX - FIELD.BALL_RADIUS;
    }

    scorePoint(side) {
      this.score[side] += 1;
      const loser = side === 'left' ? 'right' : 'left';
      if (this.score[side] >= FIELD.WIN_SCORE) {
        this.state = 'finished';
        this.winner = side;
      } else {
        this.beginCountdown(performance.now(), loser);
      }
    }
  }

  global.PongEngine = { FIELD, LocalGame, PADDLE_SPEED };
})(window);
