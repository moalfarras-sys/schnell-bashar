import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const standaloneDir = resolve(root, ".next/standalone");

if (!existsSync(standaloneDir)) {
  console.log("[standalone:sync] skipped (no .next/standalone directory)");
  process.exit(0);
}

const staticSrc = resolve(root, ".next/static");
const staticDest = resolve(standaloneDir, ".next/static");
const publicSrc = resolve(root, "public");
const publicDest = resolve(standaloneDir, "public");

mkdirSync(resolve(standaloneDir, ".next"), { recursive: true });

if (existsSync(staticSrc)) {
  cpSync(staticSrc, staticDest, { recursive: true, force: true });
  console.log("[standalone:sync] synced .next/static");
}

if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true, force: true });
  console.log("[standalone:sync] synced public");
}

