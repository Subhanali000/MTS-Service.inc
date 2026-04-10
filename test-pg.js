import { prisma } from "./lib/prisma";

async function main() {
  try {
    console.log("🔗 Testing Prisma connection...");
    const res = await prisma.$queryRaw`SELECT 1 AS connected`;
    console.log("✅ Prisma connected successfully:", res);
  } catch (err) {
    console.error("❌ Prisma connection failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
