const { pool } = require('../db');

const User = {
  async create({ username, passwordHash, publicKey }) {
    const { rows } = await pool.query(
      `INSERT INTO users (username, password_hash, public_key) VALUES ($1, $2, $3) RETURNING *`,
      [username, passwordHash, publicKey]
    );
    return rows[0];
  },

  async findByUsername(username) {
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE username = $1`,
      [username]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async updatePublicKey(id, publicKey) {
    await pool.query(
      `UPDATE users SET public_key = $1 WHERE id = $2`,
      [publicKey, id]
    );
  }
};

module.exports = User;
