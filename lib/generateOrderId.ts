import { prisma } from "@/lib/prisma"
import { randomBytes } from "crypto"

export async function generateOrderId() {
  // ✅ Atomic increment (like MongoDB $inc)
  const counter = await prisma.counter.upsert({
    where: { id: "orderId" },
    update: {
      seq: { increment: 1 },
    },
    create: {
      id: "orderId",
      seq: 1,
    },
  })

  const seq = counter.seq.toString().padStart(6, "0")

  // ✅ Add cryptographic randomness for security (prevents prediction)
  const randomPart = randomBytes(4).toString("hex").toUpperCase().slice(0, 8)

  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")

  return `ORD-${yyyy}-${mm}-${dd}-${seq}-${randomPart}`
}