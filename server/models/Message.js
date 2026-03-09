const { pool } = require('../db');

const Message = {
  async create({ senderId, recipientId, ciphertext, nonce }) {
    const { rows } = await pool.query(
      `INSERT INTO messages (sender_id, recipient_id, ciphertext, nonce)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [senderId, recipientId, ciphertext, nonce]
    );
    return rows[0];
  },

  async findPendingFor(recipientId) {
    const { rows } = await pool.query(
      `SELECT m.*, u.username AS sender_username
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.recipient_id = $1
       ORDER BY m.created_at ASC`,
      [recipientId]
    );
    return rows;
  },

  async deleteById(id) {
    await pool.query(`DELETE FROM messages WHERE id = $1`, [id]);
  }
};

module.exports = Message;
