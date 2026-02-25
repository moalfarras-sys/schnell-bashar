import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";
import { IMAGE_FALLBACK_MAP } from "./image-fallback-map";

async function ensureCompatibilityImage(targetPath: string, sourcePath: string) {
  const targetAbsolute = path.join(process.cwd(), "public", targetPath.replace(/^\//, ""));
  const sourceAbsolute = path.join(process.cwd(), "public", sourcePath.replace(/^\//, ""));
  try {
    await fs.access(targetAbsolute);
    return { created: false, targetPath, sourcePath, reason: "already-exists" };
  } catch {
    // Continue: target is missing
  }

  try {
    await fs.access(sourceAbsolute);
  } catch {
    return { created: false, targetPath, sourcePath, reason: "source-missing" };
  }

  await fs.mkdir(path.dirname(targetAbsolute), { recursive: true });
  await fs.copyFile(sourceAbsolute, targetAbsolute);
  return { created: true, targetPath, sourcePath, reason: "copied" };
}

async function main() {
  const entries = Object.entries(IMAGE_FALLBACK_MAP);
  const results = await Promise.all(entries.map(([target, source]) => ensureCompatibilityImage(target, source)));
  console.log("[generate-image-placeholders] done (compatibility copies)");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error("[generate-image-placeholders] failed", error);
  process.exitCode = 1;
});

