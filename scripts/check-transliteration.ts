import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = [
  path.join(ROOT, "src", "app"),
  path.join(ROOT, "src", "components"),
  path.join(ROOT, "src", "server", "email"),
];
const EXTENSIONS = new Set([".ts", ".tsx", ".md"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "prisma", "generated"]);

const STRING_LITERAL_RE = /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`/g;

const TRANSLITERATION_RULES: Array<{ needle: RegExp; replacement: string }> = [
  { needle: /\bUngueltig\b/g, replacement: "Ungültig" },
  { needle: /\bungueltig\b/g, replacement: "ungültig" },
  { needle: /\bFuer\b/g, replacement: "Für" },
  { needle: /\bfuer\b/g, replacement: "für" },
  { needle: /\bWaehlen\b/g, replacement: "Wählen" },
  { needle: /\bwaehlen\b/g, replacement: "wählen" },
  { needle: /\bVerfuegbar\b/g, replacement: "Verfügbar" },
  { needle: /\bverfuegbar\b/g, replacement: "verfügbar" },
  { needle: /\bMenue\b/g, replacement: "Menü" },
  { needle: /\bmenue\b/g, replacement: "menü" },
  { needle: /\bMoeglich\b/g, replacement: "Möglich" },
  { needle: /\bmoeglich\b/g, replacement: "möglich" },
  { needle: /\bZurueck\b/g, replacement: "Zurück" },
  { needle: /\bzurueck\b/g, replacement: "zurück" },
  { needle: /\bUeber\b/g, replacement: "Über" },
  { needle: /\bueber\b/g, replacement: "über" },
  { needle: /\bAendern\b/g, replacement: "Ändern" },
  { needle: /\baendern\b/g, replacement: "ändern" },
  { needle: /\bKoennen\b/g, replacement: "Können" },
  { needle: /\bkoennen\b/g, replacement: "können" },
  { needle: /\bSpaeter\b/g, replacement: "Später" },
  { needle: /\bspaeter\b/g, replacement: "später" },
  { needle: /\bKlaeren\b/g, replacement: "Klären" },
  { needle: /\bklaeren\b/g, replacement: "klären" },
  { needle: /\bUeberfaellig\b/g, replacement: "Überfällig" },
  { needle: /\bueberfaellig\b/g, replacement: "überfällig" },
  { needle: /\bNaechste\b/g, replacement: "Nächste" },
  { needle: /\bnaechste\b/g, replacement: "nächste" },
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

function skipLiteral(literal: string) {
  const value = literal.trim();
  if (!value) return true;
  if (value.startsWith("/") || value.includes("://")) return true;
  if (value.startsWith("img.") || value.startsWith("collection://")) return true;
  return false;
}

function isSlugContext(before: string, after: string) {
  return /[\/_\-.]/.test(before) || /[\/_\-.]/.test(after);
}

function main() {
  const files: string[] = [];
  for (const dir of TARGET_DIRS) walk(dir, files);

  const violations: string[] = [];

  for (const abs of files) {
    const content = fs.readFileSync(abs, "utf8");
    for (const literalMatch of content.matchAll(STRING_LITERAL_RE)) {
      const raw = literalMatch[0];
      const literalStart = literalMatch.index ?? 0;
      const literal = raw.slice(1, -1);
      if (skipLiteral(literal)) continue;

      for (const rule of TRANSLITERATION_RULES) {
        rule.needle.lastIndex = 0;
        let needleMatch: RegExpExecArray | null;
        while ((needleMatch = rule.needle.exec(literal)) !== null) {
          const idx = needleMatch.index;
          const word = needleMatch[0];
          const before = literal[idx - 1] ?? "";
          const after = literal[idx + word.length] ?? "";
          if (isSlugContext(before, after)) continue;

          const absoluteIdx = literalStart + 1 + idx;
          const line = lineOf(content, absoluteIdx);
          const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
          violations.push(
            `${rel}:${line} [transliteration] "${word}" -> "${rule.replacement}"`,
          );
          break;
        }
      }
    }
  }

  if (violations.length) {
    console.error("[check-transliteration] FAILED:");
    for (const v of violations) console.error(`  - ${v}`);
    process.exitCode = 1;
    return;
  }

  console.log("[check-transliteration] OK: no user-facing transliteration patterns found");
}

main();
