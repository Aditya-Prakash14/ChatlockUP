// server/index.js
require('dotenv').config();

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { prisma } = require('./db');
const authRoutes = require('./routes/auth');
const keysRoutes = require('./routes/keys');
const User = require('./models/User');
const Message = require('./models/Message');

// ── Validate environment variables ──
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`ERROR: Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const app = express();
const httpServer = createServer(app);

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://chatlock-up.vercel.app',
  process.env.CLIENT_URL
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: false,
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6 // 1MB
});

// ── Security middleware ──
app.use(helmet());

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts'
});

app.use(generalLimiter);
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ── Health check ──
app.get('/', (req, res) => res.json({ status: 'ok', service: 'chatlockup-api' }));

// ── REST routes ──
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/keys', keysRoutes);

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  res.status(status).json({ error: message });
});

// ── WebSocket ──
const users = new Map(); // username → socketId
const { verifyToken } = require('./middleware/auth');

io.on('connection', (socket) => {
  let authenticatedUsername = null;

  // Register user with token verification
  socket.on('register', async (data) => {
    try {
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid registration data' });
      }

      const { username, token } = data;

      // Validate inputs
      if (!username || typeof username !== 'string' || username.length > 50 || username.length < 3) {
        return socket.emit('error', { message: 'Invalid username' });
      }

      if (!token || typeof token !== 'string') {
        return socket.emit('error', { message: 'Missing token' });
      }

      // Verify token
      const decoded = verifyToken(token);
      if (decoded.username !== username) {
        return socket.emit('error', { message: 'Token mismatch' });
      }

      authenticatedUsername = username;
      users.set(username, socket.id);
      socket.emit('registered', { message: 'Connected' });
      console.log(`${username} connected via WebSocket`);

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
    } catch (err) {
      console.error('Register error:', err.message);
      socket.emit('error', { message: 'Registration failed' });
    }
  });

  // Relay encrypted message (server never decrypts)
  socket.on('send_message', async ({ to, from, encryptedPayload }) => {
    try {
      if (!authenticatedUsername) {
        return socket.emit('error', { message: 'Not authenticated' });
      }

      if (from !== authenticatedUsername) {
        return socket.emit('error', { message: 'Unauthorized sender' });
      }

      // Validate inputs
      if (!to || typeof to !== 'string' || to.length > 50 || to.length < 3) {
        return socket.emit('error', { message: 'Invalid recipient' });
      }

      if (!encryptedPayload || !encryptedPayload.ciphertext || !encryptedPayload.iv) {
        return socket.emit('error', { message: 'Invalid payload' });
      }

      const sender = await User.findByUsername(from);
      const recipient = await User.findByUsername(to);
      if (!sender || !recipient) {
        return socket.emit('error', { message: 'User not found' });
      }

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
          encryptedPayload,
          messageId: saved.id
        });
        // Delivered in real-time → remove from DB
        await Message.deleteById(saved.id);
      }
      // If recipient offline, message stays in DB for later delivery
    } catch (err) {
      console.error('Send message error:', err.message);
      socket.emit('error', { message: 'Message send failed' });
    }
  });

  socket.on('disconnect', () => {
    if (authenticatedUsername) {
      users.delete(authenticatedUsername);
      console.log(`${authenticatedUsername} disconnected`);
    }
  });

  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
});

io.on('error', (err) => {
  console.error('IO error:', err);
});

// ── Start ──
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

let server;

prisma.$connect()
  .then(() => {
    console.log('✓ Connected to PostgreSQL');
    server = httpServer.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT} (${NODE_ENV})`);
    });
  })
  .catch((err) => {
    console.error('✗ Database connection failed:', err.message);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
  console.log('\n✓ Shutting down gracefully...');
  
  if (server) {
    server.close(async () => {
      console.log('✓ HTTP server closed');
      await prisma.$disconnect();
      console.log('✓ Database disconnected');
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('✗ Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('✗ Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('✗ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
