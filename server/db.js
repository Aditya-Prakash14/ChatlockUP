const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Check your .env file.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      public_key TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id UUID REFERENCES users(id),
      recipient_id UUID REFERENCES users(id),
      ciphertext TEXT NOT NULL,
      nonce TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_messages_recipient
    ON messages(recipient_id);
  `);
}

module.exports = { pool, initDB };
