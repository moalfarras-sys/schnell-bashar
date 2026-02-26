import "dotenv/config";
import { defineConfig } from "prisma/config";

const directUrl = process.env.DIRECT_URL?.trim();
const databaseUrl = directUrl || process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error("Missing database connection string. Set DATABASE_URL (and optionally DIRECT_URL).");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
