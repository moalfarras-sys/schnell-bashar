import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = [path.join(ROOT, "src")];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".md", ".css"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "prisma", "generated"]);

const BAD_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "latin1-utf8-artifact", re: /Ã[\u0080-\u00BF]/g },
  { name: "latin1-prefix", re: /Â[^\s]/g },
  { name: "broken-ellipsis-or-dash", re: /â[\u0080-\u00BF]/g },
  { name: "replacement-char", re: /�/g },
  { name: "control-char", re: /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g },
];

function walk(dir: string, out: string[]) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, out);
      continue;
    }
    if (EXTENSIONS.has(path.extname(entry.name))) out.push(abs);
  }
}

function lineOf(text: string, index: number) {
  return text.slice(0, index).split("\n").length;
}

function main() {
  const files: string[] = [];
  for (const dir of TARGET_DIRS) walk(dir, files);

  const violations: string[] = [];
  for (const abs of files) {
    const content = fs.readFileSync(abs, "utf8");
    for (const pattern of BAD_PATTERNS) {
      pattern.re.lastIndex = 0;
      const match = pattern.re.exec(content);
      if (!match) continue;
      const line = lineOf(content, match.index);
      const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
      const token = JSON.stringify(match[0]);
      violations.push(`${rel}:${line} [${pattern.name}] ${token}`);
    }
  }

  if (violations.length) {
    console.error("[check-mojibake] FAILED:");
    for (const v of violations) console.error(`  - ${v}`);
    process.exitCode = 1;
    return;
  }

  console.log("[check-mojibake] OK: no suspicious mojibake patterns found");
}

main();
