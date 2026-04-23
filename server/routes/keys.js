const express = require('express');
const User = require('../models/User');
const { verifyTokenMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get a user's public key by username
router.get('/:username', verifyTokenMiddleware, async (req, res) => {
  try {
    const user = await User.findByUsername(req.params.username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ username: user.username, publicKey: user.public_key });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch public key' });
  }
});

// Update own public key
router.put('/', verifyTokenMiddleware, async (req, res) => {
  try {
    const { publicKey } = req.body;
    if (!publicKey) {
      return res.status(400).json({ error: 'publicKey is required' });
    }

    await User.updatePublicKey(req.user.userId, publicKey);
    res.json({ message: 'Public key updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update public key' });
  }
});

module.exports = router;
