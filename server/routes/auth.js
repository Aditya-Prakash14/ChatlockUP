const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyTokenMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Validation helper
function validateUsername(username) {
  if (!username || typeof username !== 'string') return false;
  if (username.length < 3 || username.length > 50) return false;
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return false;
  return true;
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8) return false;
  return true;
}

function validatePublicKey(publicKey) {
  if (!publicKey || typeof publicKey !== 'string') return false;
  if (publicKey.length < 100 || publicKey.length > 10000) return false;
  return true;
}

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, publicKey } = req.body;

    // Validate inputs
    if (!validateUsername(username)) {
      return res.status(400).json({ error: 'Invalid username (3-50 chars, alphanumeric + _ -)' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!validatePublicKey(publicKey)) {
      return res.status(400).json({ error: 'Invalid public key' });
    }

    const existing = await User.findByUsername(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, passwordHash, publicKey });

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, username: user.username });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validate inputs
    if (!validateUsername(username)) {
      return res.status(400).json({ error: 'Invalid username' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password required' });
    }

    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, username: user.username });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
