const { prisma } = require('../db');

const User = {
  async create({ username, passwordHash, publicKey }) {
    return prisma.user.create({
      data: { username, password_hash: passwordHash, public_key: publicKey }
    });
  },

  async findByUsername(username) {
    return prisma.user.findUnique({ where: { username } });
  },

  async findById(id) {
    return prisma.user.findUnique({ where: { id } });
  },

  async updatePublicKey(id, publicKey) {
    await prisma.user.update({
      where: { id },
      data: { public_key: publicKey }
    });
  }
};

module.exports = User;
