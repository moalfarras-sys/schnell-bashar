import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const PUBLIC_GALLERY_DIR = path.join(ROOT, "public", "media", "gallery");

const FORBIDDEN = [
  "/media/gallery/heavy-move.jpeg",
  "/media/gallery/hero_truck_v1_1771507453273.png",
  "/media/gallery/hero_truck_v1_1771507592052.png",
  "/media/gallery/hero_truck_v2_1771507469281.png",
  "/media/gallery/hero_truck_v4_1771507501491.png",
  "/media/gallery/loading-crew.jpeg",
  "/media/gallery/move-action-01.jpeg",
  "/media/gallery/workshop.jpeg",
];

function walkFiles(dir: string, out: string[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") {
      continue;
    }
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(abs, out);
      continue;
    }
    if (/\.(ts|tsx|js|jsx|json|md|css)$/i.test(entry.name)) out.push(abs);
  }
}

function main() {
  const srcFiles: string[] = [];
  walkFiles(SRC_DIR, srcFiles);

  const violations: string[] = [];
  for (const abs of srcFiles) {
    const content = fs.readFileSync(abs, "utf8");
    for (const forbidden of FORBIDDEN) {
      if (content.includes(forbidden)) {
        violations.push(
          `[ref] ${path.relative(ROOT, abs).replace(/\\/g, "/")} -> ${forbidden}`,
        );
      }
    }
  }

  for (const forbidden of FORBIDDEN) {
    const filename = forbidden.split("/").pop();
    if (!filename) continue;
    const abs = path.join(PUBLIC_GALLERY_DIR, filename);
    if (fs.existsSync(abs)) {
      violations.push(`[file] public/media/gallery/${filename}`);
    }
  }

  if (violations.length === 0) {
    console.log("[check-forbidden-image-paths] OK: no forbidden image path found");
    return;
  }

  console.error("[check-forbidden-image-paths] FAILED:");
  for (const line of violations) console.error(`  - ${line}`);
  process.exitCode = 1;
}

main();

