const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured in production.');
}

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function isTokenRevoked(token) {
  const tokenHash = hashToken(token);
  const row = db.prepare('SELECT token_hash FROM revoked_tokens WHERE token_hash = ?').get(tokenHash);
  return !!row;
}

function getActiveUser(userId) {
  const user = db.prepare(`
    SELECT id, name, email, role, status
    FROM users
    WHERE id = ?
  `).get(userId);

  return user && user.status === 'active' ? user : null;
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

  try {
    if (isTokenRevoked(token)) {
      return res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
    }
  } catch (err) {
    return next(err);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    try {
      const currentUser = getActiveUser(user.id);
      if (!currentUser) {
        return res.status(401).json({ error: 'Account is unavailable. Please log in again.' });
      }

      req.user = { ...user, ...currentUser };
      req.token = token;
      return next();
    } catch (error) {
      return next(error);
    }
  });
}

function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    if (isTokenRevoked(token)) {
      req.user = null;
      return next();
    }
  } catch (err) {
    return next(err);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err && user) {
      try {
        const currentUser = getActiveUser(user.id);
        req.user = currentUser ? { ...user, ...currentUser } : null;
        if (req.user) req.token = token;
      } catch (error) {
        return next(error);
      }
    } else {
      req.user = null;
    }
    return next();
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
