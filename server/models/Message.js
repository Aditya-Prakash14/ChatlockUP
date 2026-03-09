const { prisma } = require('../db');

const Message = {
  async create({ senderId, recipientId, ciphertext, nonce }) {
    return prisma.message.create({
      data: {
        sender_id: senderId,
        recipient_id: recipientId,
        ciphertext,
        nonce
      }
    });
  },

  async findPendingFor(recipientId) {
    const messages = await prisma.message.findMany({
      where: { recipient_id: recipientId },
      include: { sender: { select: { username: true } } },
      orderBy: { created_at: 'asc' }
    });
    // Map to match existing interface: msg.sender_username
    return messages.map((m) => ({
      ...m,
      sender_username: m.sender?.username
    }));
  },

  async deleteById(id) {
    await prisma.message.delete({ where: { id } });
  }
};

module.exports = Message;
