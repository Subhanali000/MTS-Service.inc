import { prisma } from "./lib/prisma";

async function main() {
  try {
    console.log("🔗 Testing Prisma connection...");
    const result = await prisma.$queryRaw`SELECT 1 AS connected`;
    console.log("✅ Connection successful!", result);
  } catch (err) {
    console.error("❌ Connection failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
