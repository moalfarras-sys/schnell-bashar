import fs from "node:fs/promises";
import path from "node:path";

import { STORAGE_BUCKETS, getSupabaseAdmin } from "@/lib/supabase";

type DeleteWarning = {
  target: string;
  message: string;
};

type DeleteResult = {
  deletedCount: number;
  warnings: DeleteWarning[];
};

type ParsedSupabasePublic = {
  bucket: string;
  objectPath: string;
};

const SUPABASE_PUBLIC_MARKER = "/storage/v1/object/public/";

function getAllowedUploadRoots(): string[] {
  const configured =
    process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim().length > 0
      ? process.env.UPLOAD_DIR
      : path.join(process.cwd(), "public", "uploads");
  const publicUploads = path.join(process.cwd(), "public", "uploads");
  return [configured, publicUploads].map((p) => path.resolve(p));
}

function toLocalAbsolutePath(filePath: string): string {
  if (path.isAbsolute(filePath)) return path.resolve(filePath);
  if (filePath.startsWith("/")) return path.resolve(path.join(process.cwd(), "public", filePath.slice(1)));
  return path.resolve(filePath);
}

function isWithinAllowedRoots(absPath: string, allowedRoots: string[]): boolean {
  const normalized = path.resolve(absPath);
  return allowedRoots.some((root) => {
    const rel = path.relative(root, normalized);
    return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
  });
}

function parseSupabasePublicUrl(rawUrl: string): ParsedSupabasePublic | null {
  try {
    const url = new URL(rawUrl);
    const idx = url.pathname.indexOf(SUPABASE_PUBLIC_MARKER);
    if (idx < 0) return null;
    const suffix = url.pathname.slice(idx + SUPABASE_PUBLIC_MARKER.length);
    const slash = suffix.indexOf("/");
    if (slash <= 0) return null;
    const bucket = decodeURIComponent(suffix.slice(0, slash));
    const objectPath = decodeURIComponent(suffix.slice(slash + 1));
    if (!bucket || !objectPath) return null;
    return { bucket, objectPath };
  } catch {
    return null;
  }
}

function canDeleteBucket(bucket: string): boolean {
  return bucket === STORAGE_BUCKETS.OFFERS || bucket === STORAGE_BUCKETS.SIGNED_CONTRACTS;
}

async function deleteLocalFile(target: string, allowedRoots: string[]): Promise<{ deleted: boolean; warning?: DeleteWarning }> {
  const abs = toLocalAbsolutePath(target);
  if (!isWithinAllowedRoots(abs, allowedRoots)) {
    return {
      deleted: false,
      warning: { target, message: "Skipped local path outside allowed roots." },
    };
  }

  try {
    await fs.unlink(abs);
    return { deleted: true };
  } catch (error: unknown) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
    if (code === "ENOENT") {
      return { deleted: false, warning: { target, message: "File not found." } };
    }
    return {
      deleted: false,
      warning: { target, message: error instanceof Error ? error.message : "Failed to delete local file." },
    };
  }
}

async function deleteSupabasePublicUrl(target: string): Promise<{ deleted: boolean; warning?: DeleteWarning }> {
  const parsed = parseSupabasePublicUrl(target);
  if (!parsed) {
    return { deleted: false, warning: { target, message: "Invalid Supabase public URL." } };
  }
  if (!canDeleteBucket(parsed.bucket)) {
    return { deleted: false, warning: { target, message: `Bucket '${parsed.bucket}' is not allowed for deletion.` } };
  }

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.storage.from(parsed.bucket).remove([parsed.objectPath]);
    if (error) {
      return { deleted: false, warning: { target, message: error.message } };
    }
    return { deleted: true };
  } catch (error) {
    return {
      deleted: false,
      warning: { target, message: error instanceof Error ? error.message : "Failed to delete Supabase object." },
    };
  }
}

export async function hardDeleteAssetTargets(targets: Array<string | null | undefined>): Promise<DeleteResult> {
  const unique = Array.from(
    new Set(
      targets
        .map((t) => (typeof t === "string" ? t.trim() : ""))
        .filter((t) => t.length > 0),
    ),
  );

  const allowedRoots = getAllowedUploadRoots();
  let deletedCount = 0;
  const warnings: DeleteWarning[] = [];

  for (const target of unique) {
    const isSupabasePublic = target.startsWith("http://") || target.startsWith("https://");
    const result = isSupabasePublic
      ? await deleteSupabasePublicUrl(target)
      : await deleteLocalFile(target, allowedRoots);
    if (result.deleted) deletedCount += 1;
    if (result.warning) warnings.push(result.warning);
  }

  return { deletedCount, warnings };
}

