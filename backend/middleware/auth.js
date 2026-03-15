const jwt = require('jsonwebtoken');

/**
 * requireAuth — attaches req.user or responds 401.
 * Used on routes that the Celestal Eye app must be authenticated to access.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or malformed' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalid or expired' });
  }
}

/**
 * optionalAuth — attaches req.user if a valid token is present, but never blocks.
 * Used on routes shared between the dashboard (no token) and the app (with token).
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    } catch {
      // ignore invalid token — treat as unauthenticated
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
