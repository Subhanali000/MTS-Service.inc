import { prisma } from "@/lib/prisma"
import { randomBytes } from "crypto"

export async function generateInvoiceNumber() {
  // ✅ Atomic increment for invoice counter
  const counter = await prisma.counter.upsert({
    where: { id: "invoiceNumber" },
    update: {
      seq: { increment: 1 },
    },
    create: {
      id: "invoiceNumber",
      seq: 1,
    },
  })

  const seq = counter.seq.toString().padStart(5, "0")

  // ✅ Add cryptographic randomness for security
  const randomPart = randomBytes(2).toString("hex").toUpperCase()

  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")

  // Format: INV-YYYY-MM-XXXXX-XX
  // Example: INV-2026-04-00001-A3F7
  return `INV-${yyyy}-${mm}-${seq}-${randomPart}`
}
