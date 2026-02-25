import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, "src");
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".md"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);

const BAD_PATTERNS = [/Ã/g, /Â/g, /â€/g, /â€“/g, /â€”/g, /â€¢/g];
const DIRECT_FIXES: Array<[RegExp, string]> = [
  [/â€“/g, "–"],
  [/â€”/g, "—"],
  [/â€¢/g, "•"],
  [/â€œ/g, "“"],
  [/â€/g, "”"],
  [/â€˜/g, "‘"],
  [/â€™/g, "’"],
  [/Â·/g, "·"],
  [/Â³/g, "³"],
  [/Ã—/g, "×"],
];

function walk(dir: string, out: string[]) {
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

function badScore(value: string) {
  return BAD_PATTERNS.reduce((acc, re) => acc + (value.match(re)?.length ?? 0), 0);
}

function repairText(input: string) {
  let candidate = input;
  for (const [re, replacement] of DIRECT_FIXES) {
    candidate = candidate.replace(re, replacement);
  }
  // Common mojibake conversion: UTF-8 bytes misread as Latin-1.
  const latin1Candidate = Buffer.from(candidate, "latin1").toString("utf8");
  const before = badScore(candidate);
  const after = badScore(latin1Candidate);
  if (after < before) {
    candidate = latin1Candidate;
  }
  return candidate;
}

function main() {
  const files: string[] = [];
  walk(SRC_ROOT, files);

  let changed = 0;
  for (const abs of files) {
    const original = fs.readFileSync(abs, "utf8");
    if (badScore(original) === 0) continue;
    const repaired = repairText(original);
    if (repaired === original) continue;
    if (badScore(repaired) > badScore(original)) continue;
    fs.writeFileSync(abs, repaired, "utf8");
    changed += 1;
    console.log(path.relative(ROOT, abs).replace(/\\/g, "/"));
  }
  console.log(`[fix-mojibake] changed ${changed} file(s)`);
}

main();

