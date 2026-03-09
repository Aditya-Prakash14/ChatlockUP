const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Check your .env file.');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { verifyToken, JWT_SECRET };
