const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'ems_super_secret_jwt_key_team_e7_pes';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function isTokenRevoked(token) {
  try {
    const tokenHash = hashToken(token);
    const row = db.prepare('SELECT token_hash FROM revoked_tokens WHERE token_hash = ?').get(tokenHash);
    return !!row;
  } catch (err) {
    console.error('Error checking revoked token:', err);
    return false;
  }
}

function revokeToken(token, userId = null, expiresAt = null) {
  const tokenHash = hashToken(token);
  let expiresIso = null;
  if (expiresAt) {
    expiresIso = typeof expiresAt === 'number' ? new Date(expiresAt * 1000).toISOString() : new Date(expiresAt).toISOString();
  }
  db.prepare(`
    INSERT OR IGNORE INTO revoked_tokens (token_hash, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(tokenHash, userId, expiresIso);
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  // Check if token has been revoked in database (SEC-04)
  if (isTokenRevoked(token)) {
    return res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    req.token = token;
    next();
  });
}

function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  if (isTokenRevoked(token)) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err && user) {
      req.user = user;
      req.token = token;
    } else {
      req.user = null;
    }
    next();
  });
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to perform this action.'
      });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  optionalAuthenticate,
  authorizeRoles,
  revokeToken,
  isTokenRevoked,
  hashToken
};
