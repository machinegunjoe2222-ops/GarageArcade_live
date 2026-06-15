// lib/admin-auth.js
//
// Simple HTTP Basic Auth middleware for the Guide Editor admin area.
//
// Credentials come from environment variables (set in a local .env
// file — see .env.example). When the browser hits a protected route
// without valid credentials, it shows its native username/password
// prompt.
//
// This is intentionally simple (no sessions, no database). It's
// enough to keep the editor away from random visitors when the site
// is deployed publicly.

const crypto = require('crypto');

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));

  // Buffers must be the same length for timingSafeEqual, so pad/hash
  // first to avoid leaking length information via early return.
  const hashA = crypto.createHash('sha256').update(bufA).digest();
  const hashB = crypto.createHash('sha256').update(bufB).digest();

  return crypto.timingSafeEqual(hashA, hashB);
}

function adminAuth(req, res, next) {
  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;

  if (!user || !pass) {
    // Misconfigured — fail closed rather than leaving the editor open.
    res.set('Content-Type', 'text/plain');
    return res
      .status(500)
      .send(
        'Admin area is not configured. Set ADMIN_USERNAME and ' +
          'ADMIN_PASSWORD (see .env.example) and restart the server.'
      );
  }

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded) {
    let decoded = '';
    try {
      decoded = Buffer.from(encoded, 'base64').toString('utf8');
    } catch (e) {
      decoded = '';
    }

    const sepIndex = decoded.indexOf(':');
    const reqUser = sepIndex >= 0 ? decoded.slice(0, sepIndex) : decoded;
    const reqPass = sepIndex >= 0 ? decoded.slice(sepIndex + 1) : '';

    if (timingSafeEqual(reqUser, user) && timingSafeEqual(reqPass, pass)) {
      return next();
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="Garage Arcade Admin"');
  return res.status(401).send('Authentication required.');
}

module.exports = adminAuth;
