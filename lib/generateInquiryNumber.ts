import { prisma } from "@/lib/prisma"

export async function generateInquiryNumber() {
  const counter = await prisma.counter.upsert({
    where: { id: "bulkInquiryNumber" },
    update: {
      seq: { increment: 1 },
    },
    create: {
      id: "bulkInquiryNumber",
      seq: 1,
    },
  })

  const seq = counter.seq.toString().padStart(6, "0")

  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")

  return `INQ-${yyyy}-${mm}-${dd}-${seq}`
}