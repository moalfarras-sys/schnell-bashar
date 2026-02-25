import fs from "node:fs";
import path from "node:path";
import { isNonImageRoutePath } from "./image-fallback-map";

type MissingRef = {
  src: string;
  files: string[];
};

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, "src");

function normalizePublicPath(raw: string): string {
  const value = raw.trim().replace(/\\/g, "/");
  return value.startsWith("/") ? value : `/${value}`;
}

function walk(dir: string, out: string[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, out);
      continue;
    }
    if (/\.(ts|tsx|js|jsx|css|md)$/i.test(entry.name)) out.push(abs);
  }
}

function collectMediaRefs(filePath: string): string[] {
  const content = fs.readFileSync(filePath, "utf8");
  const refs = new Set<string>();
  const re = /\/(?:media|uploads)\/[A-Za-z0-9_./\-]+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    refs.add(normalizePublicPath(match[0]));
  }
  return [...refs];
}

function main() {
  const files: string[] = [];
  walk(SRC_ROOT, files);

  const bySrc = new Map<string, Set<string>>();

  for (const abs of files) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
    for (const src of collectMediaRefs(abs)) {
      if (src.startsWith("/uploads/")) continue;
      if (isNonImageRoutePath(src)) continue;
      if (!bySrc.has(src)) bySrc.set(src, new Set<string>());
      bySrc.get(src)!.add(rel);
    }
  }

  const missing: MissingRef[] = [];
  for (const [src, fileSet] of bySrc.entries()) {
    const abs = path.join(ROOT, "public", src.replace(/^\//, ""));
    if (!fs.existsSync(abs)) {
      missing.push({ src, files: [...fileSet].sort() });
    }
  }

  missing.sort((a, b) => a.src.localeCompare(b.src));

  if (missing.length === 0) {
    console.log("[check-broken-image-paths] OK: 0 broken image paths");
    return;
  }

  console.log(`[check-broken-image-paths] FOUND: ${missing.length} broken image paths`);
  for (const item of missing) {
    console.log(item.src);
    for (const file of item.files.slice(0, 8)) {
      console.log(`  - ${file}`);
    }
    if (item.files.length > 8) console.log(`  - ... +${item.files.length - 8}`);
  }
  process.exitCode = 1;
}

main();

