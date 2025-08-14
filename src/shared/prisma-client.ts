import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient

// Global variable to store Prisma client in development
declare global {
  var __prisma: PrismaClient | undefined
}

// Singleton pattern for Prisma client to avoid connection issues in Lambda
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: ['error'],
  })
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    })
  }
  prisma = global.__prisma
}

// Graceful shutdown for Lambda
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

export { prisma }