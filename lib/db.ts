import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const { PrismaClient } = require("@prisma/client") as {
  PrismaClient: new (options?: {
    adapter?: PrismaPg
    log?: Array<"query" | "error" | "warn">
  }) => any
}

const connectionString = process.env.DATABASE_URL

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

type PrismaClientInstance = any

const globalForPrisma = globalThis as unknown as { 
  prisma: PrismaClientInstance | undefined 
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ 
    adapter,
    log: ['query', 'error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}