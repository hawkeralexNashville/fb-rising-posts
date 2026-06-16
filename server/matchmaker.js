'use strict';

/**
 * Auto-matchmaking queue. Pairs the first two waiting players into a game.
 *
 * Players who wait longer than QUEUE_TIMEOUT_MS are dropped from the queue
 * and told to try again.
 */

const QUEUE_TIMEOUT_MS = 60000; // 60s before "no opponent found"

class Matchmaker {
  /**
   * @param {GameManager} gameManager
   */
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.queue = []; // entries: { player, timer }
  }

  /**
   * Add a player to the queue. `player` is { ws, userId, username, isGuest }.
   * If an opponent is already waiting, a game starts immediately.
   */
  enqueue(player) {
    // Guard against the same socket queuing twice.
    if (this.queue.some((e) => e.player.ws === player.ws)) return;

    if (this.queue.length > 0) {
      const opponent = this.queue.shift();
      clearTimeout(opponent.timer);
      // First queued player takes the left paddle.
      this.gameManager.createGame(opponent.player, player);
      return;
    }

    const timer = setTimeout(() => {
      this.remove(player.ws);
      if (player.ws && player.ws.readyState === 1) {
        player.ws.send(JSON.stringify({ type: 'queue_timeout' }));
      }
    }, QUEUE_TIMEOUT_MS);

    this.queue.push({ player, timer });
    if (player.ws && player.ws.readyState === 1) {
      player.ws.send(JSON.stringify({ type: 'queued' }));
    }
  }

  /** Remove a player's socket from the queue (on leave or disconnect). */
  remove(ws) {
    const idx = this.queue.findIndex((e) => e.player.ws === ws);
    if (idx !== -1) {
      clearTimeout(this.queue[idx].timer);
      this.queue.splice(idx, 1);
    }
  }
}

module.exports = { Matchmaker };
