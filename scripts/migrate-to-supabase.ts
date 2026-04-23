import "dotenv/config";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

type RunOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

function run(command: string, args: string[], options: RunOptions = {}) {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: "inherit",
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: process.platform === "win32",
    });

    proc.on("error", reject);
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed with code ${code ?? "unknown"}`));
    });
  });
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing ${name}. Set it in .env before running this script.`);
  }
  return value;
}

function getSourceDatabaseUrl() {
  return process.env.SOURCE_DATABASE_URL?.trim() || process.env.LOCAL_DATABASE_URL?.trim() || "";
}

async function main() {
  const sourceUrl = getSourceDatabaseUrl();
  const targetUrl = requiredEnv("DIRECT_URL");

  if (!sourceUrl) {
    throw new Error("Missing SOURCE_DATABASE_URL (preferred) or LOCAL_DATABASE_URL.");
  }
  if (!targetUrl.includes("supabase.com")) {
    throw new Error("DIRECT_URL must point to your Supabase direct Postgres host.");
  }

  const projectRoot = process.cwd();
  const tmpDir = path.join(projectRoot, ".tmp");
  const dumpFile = path.join(tmpDir, "supabase-data.sql");
  const verifySql = path.join(tmpDir, "supabase-verify-counts.sql");

  await mkdir(tmpDir, { recursive: true });
  await writeFile(
    verifySql,
    [
      "SELECT 'Order' AS table_name, COUNT(*) AS row_count FROM \"Order\";",
      "SELECT 'Offer' AS table_name, COUNT(*) AS row_count FROM \"Offer\";",
      "SELECT 'Contract' AS table_name, COUNT(*) AS row_count FROM \"Contract\";",
      "SELECT 'Invoice' AS table_name, COUNT(*) AS row_count FROM \"Invoice\";",
      "SELECT 'Document' AS table_name, COUNT(*) AS row_count FROM \"Document\";",
      "SELECT 'DocumentVersion' AS table_name, COUNT(*) AS row_count FROM \"DocumentVersion\";",
      "SELECT 'SigningToken' AS table_name, COUNT(*) AS row_count FROM \"SigningToken\";",
    ].join("\n"),
    "utf8",
  );

  console.log("[supabase:migrate] Applying Prisma migrations to Supabase...");
  await run("npx", ["prisma", "migrate", "deploy"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      DATABASE_URL: targetUrl,
      DIRECT_URL: targetUrl,
    },
  });

  console.log("[supabase:migrate] Exporting data from source Postgres...");
  await run("docker", [
    "run",
    "--rm",
    "-e",
    `SRC_URL=${sourceUrl}`,
    "-v",
    `${projectRoot}:/work`,
    "postgres:16",
    "sh",
    "-lc",
    'pg_dump "$SRC_URL" --data-only --no-owner --no-privileges --schema=public --exclude-table=public._prisma_migrations --file=/work/.tmp/supabase-data.sql',
  ]);

  console.log("[supabase:migrate] Cleaning Supabase public tables (except _prisma_migrations)...");
  await run("docker", [
    "run",
    "--rm",
    "-e",
    `DST_URL=${targetUrl}`,
    "postgres:16",
    "sh",
    "-lc",
    `psql "$DST_URL" -v ON_ERROR_STOP=1 -c "DO \\$\\$ DECLARE r RECORD; BEGIN FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations') LOOP EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE'; END LOOP; END \\$\\$;"`,
  ]);

  console.log("[supabase:migrate] Importing data into Supabase...");
  await run("docker", [
    "run",
    "--rm",
    "-e",
    `DST_URL=${targetUrl}`,
    "-v",
    `${projectRoot}:/work`,
    "postgres:16",
    "sh",
    "-lc",
    'psql "$DST_URL" -v ON_ERROR_STOP=1 -f /work/.tmp/supabase-data.sql',
  ]);

  console.log("[supabase:migrate] Running ANALYZE on Supabase...");
  await run("docker", [
    "run",
    "--rm",
    "-e",
    `DST_URL=${targetUrl}`,
    "postgres:16",
    "sh",
    "-lc",
    'psql "$DST_URL" -v ON_ERROR_STOP=1 -c "ANALYZE;"',
  ]);

  console.log("[supabase:migrate] Verifying key table counts on source...");
  await run("docker", [
    "run",
    "--rm",
    "-e",
    `SRC_URL=${sourceUrl}`,
    "-v",
    `${projectRoot}:/work`,
    "postgres:16",
    "sh",
    "-lc",
    'psql "$SRC_URL" -v ON_ERROR_STOP=1 -f /work/.tmp/supabase-verify-counts.sql',
  ]);

  console.log("[supabase:migrate] Verifying key table counts on Supabase...");
  await run("docker", [
    "run",
    "--rm",
    "-e",
    `DST_URL=${targetUrl}`,
    "-v",
    `${projectRoot}:/work`,
    "postgres:16",
    "sh",
    "-lc",
    'psql "$DST_URL" -v ON_ERROR_STOP=1 -f /work/.tmp/supabase-verify-counts.sql',
  ]);

  if (process.env.KEEP_SUPABASE_DUMP !== "true") {
    await rm(dumpFile, { force: true });
    await rm(verifySql, { force: true });
  }

  console.log("[supabase:migrate] Done. Supabase now has migrated schema and data from the source database.");
}

main().catch((error) => {
  console.error("[supabase:migrate] Failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
