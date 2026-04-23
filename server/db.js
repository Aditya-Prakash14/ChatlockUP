const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

// Handle connection errors
prisma.$on('error', (e) => {
  console.error('Prisma error:', e.message);
});

module.exports = { prisma };
