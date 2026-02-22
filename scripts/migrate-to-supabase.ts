import "dotenv/config";
import { mkdir, rm } from "node:fs/promises";
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

async function main() {
  const sourceUrl = requiredEnv("LOCAL_DATABASE_URL");
  const targetUrl = requiredEnv("DIRECT_URL");

  if (!targetUrl.includes("supabase.com")) {
    throw new Error("DIRECT_URL must point to your Supabase direct Postgres host.");
  }

  const projectRoot = process.cwd();
  const tmpDir = path.join(projectRoot, ".tmp");
  const dumpFile = "/work/.tmp/supabase-data.sql";

  await mkdir(tmpDir, { recursive: true });

  console.log("[supabase:migrate] Applying Prisma migrations to Supabase...");
  await run("npx", ["prisma", "migrate", "deploy"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      DATABASE_URL: targetUrl,
      DIRECT_URL: targetUrl,
    },
  });

  console.log("[supabase:migrate] Exporting data from local Docker/Postgres...");
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
    `pg_dump "$SRC_URL" --data-only --no-owner --no-privileges --schema=public --exclude-table=public._prisma_migrations --file=${dumpFile}`,
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
    `psql "$DST_URL" -v ON_ERROR_STOP=1 -f ${dumpFile}`,
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
    `psql "$DST_URL" -v ON_ERROR_STOP=1 -c "ANALYZE;"`,
  ]);

  if (process.env.KEEP_SUPABASE_DUMP !== "true") {
    await rm(path.join(tmpDir, "supabase-data.sql"), { force: true });
  }

  console.log("[supabase:migrate] Done. Supabase now has migrated schema+data from local DB.");
}

main().catch((error) => {
  console.error("[supabase:migrate] Failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
