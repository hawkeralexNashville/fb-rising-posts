'use strict';

/**
 * Authentication: registration, login, password hashing, and JWT helpers.
 *
 * Usernames: 3-20 chars, alphanumeric + underscore, unique (case-insensitive).
 * Passwords: minimum 8 chars, hashed with bcrypt (12 salt rounds).
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const SALT_ROUNDS = 12; // spec requires a minimum of 10
const TOKEN_TTL = '30d'; // tokens persist login across sessions via localStorage

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

function signToken(user) {
  return jwt.sign({ userId: user.id, username: user.username }, getSecret(), {
    expiresIn: TOKEN_TTL,
  });
}

/**
 * Verify a JWT. Returns the decoded payload ({ userId, username }) or null.
 */
function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, getSecret());
  } catch (err) {
    return null;
  }
}

function validateCredentials(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string') {
    return 'Username and password are required.';
  }
  if (!USERNAME_RE.test(username)) {
    return 'Username must be 3-20 characters: letters, numbers, or underscores.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  return null;
}

/**
 * Register a new player. Returns { token, username } on success.
 * Throws an Error with a user-facing .message and .status on failure.
 */
async function register(username, password) {
  const validationError = validateCredentials(username, password);
  if (validationError) {
    const err = new Error(validationError);
    err.status = 400;
    throw err;
  }

  const existing = await db.getUserByUsername(username);
  if (existing) {
    const err = new Error('That username is already taken.');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await db.createUser(username, passwordHash);

  return { token: signToken(user), username: user.username };
}

/**
 * Log a player in. Returns { token, username } on success.
 * Uses a uniform error message to avoid leaking which field was wrong.
 */
async function login(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string') {
    const err = new Error('Username and password are required.');
    err.status = 400;
    throw err;
  }

  const user = await db.getUserByUsername(username);
  const invalid = new Error('Invalid username or password.');
  invalid.status = 401;

  if (!user) throw invalid;

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw invalid;

  return { token: signToken(user), username: user.username };
}

module.exports = {
  register,
  login,
  verifyToken,
};
