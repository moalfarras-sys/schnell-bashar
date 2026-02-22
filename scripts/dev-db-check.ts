import "dotenv/config";
import { inspect } from "node:util";

import { prisma } from "../src/server/db/prisma";

type ColumnRow = { table_name: string; column_name: string };

const REQUIRED_COLUMNS: Record<string, string[]> = {
  Order: ["orderNo", "deletedAt"],
  Offer: ["offerNo"],
  Contract: ["contractNo"],
};

async function assertSchemaColumns() {
  const rows = await prisma.$queryRawUnsafe<ColumnRow[]>(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('Order', 'Offer', 'Contract')
  `);

  const byTable = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!byTable.has(row.table_name)) byTable.set(row.table_name, new Set());
    byTable.get(row.table_name)!.add(row.column_name);
  }

  const missing: string[] = [];
  for (const [table, cols] of Object.entries(REQUIRED_COLUMNS)) {
    const existing = byTable.get(table) ?? new Set<string>();
    for (const col of cols) {
      if (!existing.has(col)) {
        missing.push(`${table}.${col}`);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Schema mismatch: missing columns [${missing.join(", ")}]. Run prisma generate + migrate.`,
    );
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "(not set)";
  const maskedUrl = databaseUrl.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");

  console.log("[db:doctor] Checking database connection...");
  console.log(`[db:doctor] DATABASE_URL=${maskedUrl}`);

  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    await assertSchemaColumns();

    const [activePricing, activeRules, exceptions] = await Promise.all([
      prisma.pricingConfig.count({ where: { active: true } }),
      prisma.availabilityRule.count({ where: { active: true } }),
      prisma.availabilityException.count(),
    ]);

    console.log("[db:doctor] Connection OK.");
    console.log(
      `[db:doctor] pricing(active)=${activePricing}, availabilityRules(active)=${activeRules}, availabilityExceptions=${exceptions}`,
    );

    if (activePricing === 0 || activeRules === 0) {
      console.warn(
        "[db:doctor] Missing required seed data. Run `npm run db:seed` after migrations.",
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[db:doctor] Database is not reachable.");
    console.warn(`[db:doctor] ${message || "Unknown connection error."}`);
    if (error && typeof error === "object") {
      console.warn(`[db:doctor] details=${inspect(error, { depth: 2, breakLength: 120 })}`);
    }
    console.warn(
      "[db:doctor] Start local PostgreSQL on localhost:5432 and ensure database `schnell_sicher_umzug` exists.",
    );
    console.warn(
      "[db:doctor] Then run: npm run prisma:generate && npm run prisma:migrate && npm run db:seed",
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

void main();
