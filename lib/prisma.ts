import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

import { PrismaClient } from "@prisma/client/index"

const connectionString = process.env.DATABASE_URL

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

type PrismaClientInstance = PrismaClient

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

export default prisma