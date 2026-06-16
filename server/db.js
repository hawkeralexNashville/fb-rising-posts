'use strict';

/**
 * PostgreSQL connection + query helpers for Retro Pong.
 *
 * Exposes:
 *   - init()              run migrations on startup (idempotent)
 *   - createUser()        register a new player
 *   - getUserByUsername() lookup for login / uniqueness checks
 *   - recordGame()        persist a completed game
 *   - getLeaderboard()    top-25 ranked registered players
 */

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

// Railway's managed Postgres requires SSL, but local instances usually don't.
// Detect a local connection string and disable SSL only in that case.
const isLocal =
  !connectionString ||
  /localhost|127\.0\.0\.1/.test(connectionString);

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  // A backend connection died unexpectedly; log and let the pool recover.
  console.error('Unexpected idle Postgres client error:', err.message);
});

/**
 * Create tables if they do not already exist. Safe to run on every startup.
 */
async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      VARCHAR(20) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS games (
      id              SERIAL PRIMARY KEY,
      player1_id      INTEGER REFERENCES users(id),
      player2_id      INTEGER REFERENCES users(id),
      winner_id       INTEGER REFERENCES users(id),
      player1_score   INTEGER NOT NULL,
      player2_score   INTEGER NOT NULL,
      ended_by_forfeit BOOLEAN DEFAULT FALSE,
      played_at       TIMESTAMP DEFAULT NOW()
    );
  `);

  // Helpful index for the leaderboard aggregation.
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_games_players ON games (player1_id, player2_id);`
  );

  console.log('Database migrations complete.');
}

async function createUser(username, passwordHash) {
  const { rows } = await pool.query(
    `INSERT INTO users (username, password_hash)
     VALUES ($1, $2)
     RETURNING id, username, created_at`,
    [username, passwordHash]
  );
  return rows[0];
}

async function getUserByUsername(username) {
  // Case-insensitive lookup so usernames are unique regardless of case.
  const { rows } = await pool.query(
    `SELECT id, username, password_hash FROM users WHERE LOWER(username) = LOWER($1)`,
    [username]
  );
  return rows[0] || null;
}

/**
 * Persist a completed game.
 * Guest players are passed as null ids. Games where both players are guests
 * are still recorded but never surface on the leaderboard.
 */
async function recordGame({
  player1Id,
  player2Id,
  winnerId,
  player1Score,
  player2Score,
  endedByForfeit,
}) {
  await pool.query(
    `INSERT INTO games
       (player1_id, player2_id, winner_id, player1_score, player2_score, ended_by_forfeit)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      player1Id || null,
      player2Id || null,
      winnerId || null,
      player1Score,
      player2Score,
      !!endedByForfeit,
    ]
  );
}

/**
 * Compute the all-time leaderboard.
 *
 * Points model (per the spec):
 *   - Win:                 3 points
 *   - Loss (completed):    1 point
 *   - Bonus:               0.5 per point scored (non-forfeit games only)
 *   - Forfeit win:         3 points, no bonus
 *   - Forfeit loss:        0 points
 *
 * Only registered players with >= 5 completed games appear, ranked by points.
 */
async function getLeaderboard(limit = 25) {
  const { rows } = await pool.query(
    `
    WITH per_player AS (
      -- Player 1's perspective of each game
      SELECT
        player1_id AS user_id,
        CASE
          WHEN ended_by_forfeit THEN CASE WHEN winner_id = player1_id THEN 3 ELSE 0 END
          ELSE (CASE WHEN winner_id = player1_id THEN 3 ELSE 1 END) + 0.5 * player1_score
        END AS points,
        CASE WHEN winner_id = player1_id THEN 1 ELSE 0 END AS win
      FROM games
      WHERE player1_id IS NOT NULL

      UNION ALL

      -- Player 2's perspective of each game
      SELECT
        player2_id AS user_id,
        CASE
          WHEN ended_by_forfeit THEN CASE WHEN winner_id = player2_id THEN 3 ELSE 0 END
          ELSE (CASE WHEN winner_id = player2_id THEN 3 ELSE 1 END) + 0.5 * player2_score
        END AS points,
        CASE WHEN winner_id = player2_id THEN 1 ELSE 0 END AS win
      FROM games
      WHERE player2_id IS NOT NULL
    )
    SELECT
      u.id                          AS user_id,
      u.username                    AS username,
      COALESCE(SUM(pp.points), 0)   AS total_points,
      COALESCE(SUM(pp.win), 0)      AS wins,
      COUNT(*)                      AS games_played
    FROM per_player pp
    JOIN users u ON u.id = pp.user_id
    GROUP BY u.id, u.username
    HAVING COUNT(*) >= 5
    ORDER BY total_points DESC, wins DESC, games_played ASC
    LIMIT $1;
    `,
    [limit]
  );

  return rows.map((r) => ({
    username: r.username,
    points: Number(r.total_points),
    wins: Number(r.wins),
    gamesPlayed: Number(r.games_played),
  }));
}

module.exports = {
  pool,
  init,
  createUser,
  getUserByUsername,
  recordGame,
  getLeaderboard,
};
