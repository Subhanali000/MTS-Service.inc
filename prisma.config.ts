import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    seed: "tsx prisma/seed.ts",
  },

  datasource: {
    url: env("DIRECT_URL"), // ✅ MUST use 5432 here
  },
});