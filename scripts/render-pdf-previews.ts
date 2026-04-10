import { mkdirSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const pdfDir = path.join(process.cwd(), "tmp", "pdfs");
const outDir = path.join(process.cwd(), "tmp", "pdf-renders");

function main() {
  if (!existsSync(pdfDir)) {
    console.error(`PDF directory not found: ${pdfDir}`);
    process.exit(1);
  }

  mkdirSync(outDir, { recursive: true });
  const pdfFiles = readdirSync(pdfDir).filter((file) => file.endsWith(".pdf"));
  if (pdfFiles.length === 0) {
    console.error("No PDF files found in tmp/pdfs.");
    process.exit(1);
  }

  const check = spawnSync("pdftoppm", ["-h"], { stdio: "ignore", shell: true });
  if (check.status !== 0) {
    console.error("pdftoppm is not available on PATH. Install Poppler to render preview PNGs.");
    process.exit(1);
  }

  for (const file of pdfFiles) {
    const input = path.join(pdfDir, file);
    const baseName = file.replace(/\.pdf$/i, "");
    const outputPrefix = path.join(outDir, baseName);
    const result = spawnSync("pdftoppm", ["-png", "-r", "150", input, outputPrefix], {
      stdio: "inherit",
      shell: true,
    });
    if (result.status !== 0) {
      console.error(`Failed to render ${file}`);
      process.exit(result.status || 1);
    }
  }

  console.log(`Rendered PDF previews to ${outDir}`);
}

main();
