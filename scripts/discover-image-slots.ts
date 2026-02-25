import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";
import { isNonImageRoutePath } from "./image-fallback-map";

type UsageType = "next-image" | "json-ld" | "pdf" | "upload-path" | "css-bg" | "other";

type DiscoveredSlot = {
  key: string;
  defaultPath: string;
  discoveredFrom: string;
  usageType: UsageType;
};
type RejectedCandidate = {
  candidate: string;
  discoveredFrom: string;
  reason: string;
};

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, "src");
const OUTPUT_PATH = path.join(ROOT, "scripts", "generated", "image-slots-map.json");

const EXPLICIT_KEY_BY_SOURCE: Record<string, string> = {
  "/media/brand/hero-logo.jpeg": "img.global.brand.logo_header",
  "/media/gallery/team-back.jpeg": "img.home.cta.bg",
  "/media/gallery/calendar.jpeg": "img.kalender.main",
  "/media/gallery/money.jpeg": "img.preise.banner",
  "/media/brand/company-signature-clean.png": "img.pdf.contract.signature",
  "/media/brand/company-stamp-clean.png": "img.pdf.contract.stamp",
};
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".avif", ".svg"];
const ALLOWED_PREFIXES = ["/media/", "/uploads/"];
const BLOCKED_PREFIXES = ["/api/"];

function normalizePublicPath(raw: string): string {
  let value = raw.trim().replace(/\\/g, "/");
  value = value.replace(/^public\//, "/");
  if (!value.startsWith("/")) value = `/${value}`;
  return value;
}

function deriveUsageType(filePath: string): UsageType {
  if (filePath.includes("/server/pdf/")) return "pdf";
  if (filePath.endsWith("local-business.tsx")) return "json-ld";
  if (filePath.endsWith("orders/route.ts")) return "upload-path";
  if (filePath.endsWith(".css")) return "css-bg";
  if (filePath.endsWith(".tsx")) return "next-image";
  return "other";
}

function toAutoKey(publicPath: string): string {
  return `img.auto.${publicPath.replace(/^\/+/, "").replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase()}`;
}
function isAllowedImagePath(candidate: string): { ok: true } | { ok: false; reason: string } {
  if (BLOCKED_PREFIXES.some((prefix) => candidate.startsWith(prefix))) {
    return { ok: false, reason: "blocked prefix" };
  }
  if (isNonImageRoutePath(candidate)) {
    return { ok: false, reason: "non-image route path" };
  }
  if (!ALLOWED_PREFIXES.some((prefix) => candidate.startsWith(prefix))) {
    return { ok: false, reason: "invalid prefix" };
  }
  const lower = candidate.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return { ok: false, reason: "unsupported extension" };
  }
  return { ok: true };
}

async function listFilesRecursive(rootDir: string): Promise<string[]> {
  const out: string[] = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
      } else if (/\.(ts|tsx|css)$/i.test(entry.name)) {
        out.push(abs);
      }
    }
  }
  return out;
}

function discoverPathsInContent(content: string, relativeFile: string): string[] {
  const found = new Set<string>();
  const directMediaRegex = /\/(?:media|uploads)\/[A-Za-z0-9_./\-]+/g;
  const publicMediaRegex = /public[\\/](?:media|uploads)[\\/][A-Za-z0-9_./\\-]+/g;

  let match: RegExpExecArray | null;
  while ((match = directMediaRegex.exec(content)) !== null) {
    found.add(normalizePublicPath(match[0]));
  }
  while ((match = publicMediaRegex.exec(content)) !== null) {
    found.add(normalizePublicPath(match[0]));
  }

  // PDF seal assets are resolved from filenames.
  if (relativeFile.endsWith("src/server/pdf/company-seal-assets.ts")) {
    const sealFileRegex = /"(company-(?:signature|stamp|signature-stamp)[^"]*)"/g;
    while ((match = sealFileRegex.exec(content)) !== null) {
      found.add(`/media/brand/${match[1]}`);
    }
  }

  return [...found];
}

function discoverExplicitSlotDeclarations(content: string): Array<{ key: string; src: string }> {
  const out: Array<{ key: string; src: string }> = [];
  const patterns = [
    /slotKey:\s*"([^"]+)"\s*,\s*fallbackSrc:\s*"([^"]+)"/g,
    /slotKey:\s*"([^"]+)"\s*,\s*fallbackImage:\s*"([^"]+)"/g,
    /key:\s*"([^"]+)"\s*,\s*fallbackSrc:\s*"([^"]+)"/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      out.push({ key: match[1], src: normalizePublicPath(match[2]) });
    }
  }

  return out;
}

async function main() {
  const files = await listFilesRecursive(SRC_ROOT);
  const slotsByKey = new Map<string, DiscoveredSlot>();
  const rejected: RejectedCandidate[] = [];

  for (const absFile of files) {
    const relative = path.relative(ROOT, absFile).replace(/\\/g, "/");
    const content = await fs.readFile(absFile, "utf8");
    const explicitSlots = discoverExplicitSlotDeclarations(content);
    const paths = discoverPathsInContent(content, relative);

    for (const explicit of explicitSlots) {
      const validity = isAllowedImagePath(explicit.src);
      if (!validity.ok) {
        rejected.push({
          candidate: explicit.src,
          discoveredFrom: relative,
          reason: `explicit: ${validity.reason}`,
        });
        continue;
      }
      if (!slotsByKey.has(explicit.key)) {
        slotsByKey.set(explicit.key, {
          key: explicit.key,
          defaultPath: explicit.src,
          discoveredFrom: relative,
          usageType: deriveUsageType(relative),
        });
      }
    }

    for (const src of paths) {
      const validity = isAllowedImagePath(src);
      if (!validity.ok) {
        rejected.push({
          candidate: src,
          discoveredFrom: relative,
          reason: `auto: ${validity.reason}`,
        });
        continue;
      }
      const key = EXPLICIT_KEY_BY_SOURCE[src] ?? toAutoKey(src);
      if (!slotsByKey.has(key)) {
        slotsByKey.set(key, {
          key,
          defaultPath: src,
          discoveredFrom: relative,
          usageType: deriveUsageType(relative),
        });
      }
    }
  }

  const slots = [...slotsByKey.values()].sort((a, b) => a.key.localeCompare(b.key));
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(
    OUTPUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: slots.length,
        slots,
        rejectedCount: rejected.length,
        rejected,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(
    `[discover-image-slots] wrote ${slots.length} slots (${rejected.length} rejected) to ${OUTPUT_PATH}`,
  );
}

main().catch((error) => {
  console.error("[discover-image-slots] failed", error);
  process.exitCode = 1;
});
