import path from "path";
import { access, readFile } from "fs/promises";
import { constants as fsConstants } from "fs";

const PDF_HEADERS = {
  "Content-Type": "application/pdf",
  "Cache-Control": "no-store",
} as const;

function isRemoteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function normalizeLocalUrlPath(urlOrPath: string): string | null {
  if (!urlOrPath) return null;
  if (isRemoteUrl(urlOrPath)) return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed.startsWith("/")) return null;
  return trimmed.replace(/^\/+/, "");
}

function localCandidates(relativePath: string): string[] {
  const cwd = process.cwd();
  return [
    path.join(cwd, "public", relativePath),
    path.join(cwd, ".next", "standalone", "public", relativePath),
    path.join(cwd, "..", "public", relativePath),
  ];
}

async function readFirstExisting(paths: string[]): Promise<Buffer | null> {
  for (const candidate of paths) {
    try {
      await access(candidate, fsConstants.R_OK);
      return await readFile(candidate);
    } catch {
      // Continue with next candidate.
    }
  }
  return null;
}

export async function loadContractPdfBuffer(urlOrPath?: string | null): Promise<Buffer | null> {
  if (!urlOrPath) return null;

  if (isRemoteUrl(urlOrPath)) {
    const response = await fetch(urlOrPath, { cache: "no-store" });
    if (!response.ok) return null;
    const arr = await response.arrayBuffer();
    return Buffer.from(arr);
  }

  const localPath = normalizeLocalUrlPath(urlOrPath);
  if (!localPath) return null;
  return readFirstExisting(localCandidates(localPath));
}

export function buildInlinePdfResponse(buffer: Buffer, fileName: string): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      ...PDF_HEADERS,
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
