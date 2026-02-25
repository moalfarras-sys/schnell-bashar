import "dotenv/config";
import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/prisma/client";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/schnell_sicher_umzug?schema=public";

const isSupabase = connectionString.includes("supabase.com");
const ssl = isSupabase ? ({ rejectUnauthorized: true } as const) : undefined;
const adapter = new PrismaPg({ connectionString, ...(ssl ? { ssl } : {}) });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [pricingActive, catalogActive] = await Promise.all([
    prisma.pricingConfig.count({ where: { active: true, deletedAt: null } }),
    prisma.catalogItem.count({ where: { active: true, deletedAt: null } }),
  ]);

  const needsSeed = pricingActive === 0 || catalogActive === 0;

  if (!needsSeed) {
    console.log(
      `[seed:core] OK pricing(active)=${pricingActive} catalog(active)=${catalogActive}. Skip seed.`,
    );
    return;
  }

  console.log(
    `[seed:core] Missing baseline data. Running seed (pricing=${pricingActive}, catalog=${catalogActive}).`,
  );
  execSync("npm run db:seed", { stdio: "inherit" });
}

main()
  .catch((error) => {
    console.error("[seed:core] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
