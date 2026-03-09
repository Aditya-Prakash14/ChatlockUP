// server/index.js
require('dotenv').config();

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { initDB } = require('./db');
const authRoutes = require('./routes/auth');
const keysRoutes = require('./routes/keys');
const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// ── Security middleware ──
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100                   // max 100 requests per window
}));
app.use(cors());
app.use(express.json());

// ── REST routes ──
app.use('/api/auth', authRoutes);
app.use('/api/keys', keysRoutes);

// ── WebSocket ──
const users = new Map(); // username → socketId

io.on('connection', (socket) => {
  // Register user
  socket.on('register', async (username) => {
    users.set(username, socket.id);
    console.log(`${username} connected`);

    // Deliver any offline messages
    const user = await User.findByUsername(username);
    if (!user) return;

    const pending = await Message.findPendingFor(user.id);
    for (const msg of pending) {
      socket.emit('receive_message', {
        from: msg.sender_username,
        encryptedPayload: { ciphertext: msg.ciphertext, iv: msg.nonce },
        messageId: msg.id
      });
      await Message.deleteById(msg.id);
    }
  });

  // Relay encrypted message (server never decrypts)
  socket.on('send_message', async ({ to, from, encryptedPayload }) => {
    const sender = await User.findByUsername(from);
    const recipient = await User.findByUsername(to);
    if (!sender || !recipient) return;

    // Persist ciphertext
    const saved = await Message.create({
      senderId: sender.id,
      recipientId: recipient.id,
      ciphertext: encryptedPayload.ciphertext,
      nonce: encryptedPayload.iv
    });

    const recipientSocket = users.get(to);
    if (recipientSocket) {
      io.to(recipientSocket).emit('receive_message', {
        from,
        encryptedPayload, // forward as-is, never read
        messageId: saved.id
      });
      // Delivered in real-time → remove from DB
      await Message.deleteById(saved.id);
    }
    // If recipient offline, message stays in DB for later delivery
  });

  socket.on('disconnect', () => {
    users.forEach((sid, uname) => {
      if (sid === socket.id) users.delete(uname);
    });
  });
});

// ── Start ──
const PORT = process.env.PORT || 3001;

initDB()
  .then(() => {
    console.log('PostgreSQL tables ready');
    httpServer.listen(PORT, () => console.log(`Server running on :${PORT}`));
  })
  .catch((err) => {
    console.error('DB init failed:', err);
    process.exit(1);
  });