import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: node scripts/run-supabase-sql.mjs <sql-file>");
  process.exit(1);
}

const sql = readFileSync(filePath, "utf8");
const result = spawnSync("npx", ["supabase", "db", "query", sql], {
  stdio: "inherit",
  shell: true
});

process.exit(result.status ?? 1);
