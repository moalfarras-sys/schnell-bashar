import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../../prisma/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function tuneConnectionString(raw: string) {
  if (!raw.includes("supabase.com")) return raw;

  const url = new URL(raw);
  if (!url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");
  const isTransactionPooler = url.port === "6543";
  if (isTransactionPooler && !url.searchParams.has("pgbouncer")) {
    url.searchParams.set("pgbouncer", "true");
  }
  if (!url.searchParams.has("connection_limit")) {
    url.searchParams.set("connection_limit", process.env.DB_CONNECTION_LIMIT ?? "5");
  }
  if (!url.searchParams.has("pool_timeout")) {
    url.searchParams.set("pool_timeout", process.env.DB_POOL_TIMEOUT ?? "20");
  }
  return url.toString();
}

function createPrismaClient() {
  let rawConnectionString =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/schnell_sicher_umzug?schema=public";

  const connectionString = tuneConnectionString(rawConnectionString);
  const isSupabase = connectionString.includes("supabase.com");
  const ssl =
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false"
      ? { rejectUnauthorized: false as const }
      : isSupabase
        ? { rejectUnauthorized: true as const }
        : undefined;

  const adapter = new PrismaPg({
    connectionString,
    ...(ssl ? { ssl } : {}),
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
