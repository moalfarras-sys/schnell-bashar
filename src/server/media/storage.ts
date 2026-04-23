import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { STORAGE_BUCKETS, getSupabaseAdmin } from "@/lib/supabase";

const PUBLIC_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "media");

export function isSupabaseMediaStorageConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1" || process.env.VERCEL === "true";
}

export function canWriteMediaInCurrentRuntime(): boolean {
  return isSupabaseMediaStorageConfigured() || !isVercelRuntime();
}

export async function storeMediaOriginal(params: {
  buffer: Buffer;
  contentType: string;
  fileName: string;
}): Promise<string> {
  const { buffer, contentType, fileName } = params;

  if (isSupabaseMediaStorageConfigured()) {
    const objectPath = `originals/${fileName}`;
    const admin = getSupabaseAdmin();
    const { error } = await admin.storage.from(STORAGE_BUCKETS.MEDIA_PUBLIC).upload(objectPath, buffer, {
      contentType,
      upsert: false,
    });
    if (error) throw error;
    return admin.storage.from(STORAGE_BUCKETS.MEDIA_PUBLIC).getPublicUrl(objectPath).data.publicUrl;
  }

  if (isVercelRuntime()) {
    throw new Error("Supabase media storage is required on Vercel for admin media uploads.");
  }

  const absolute = path.join(PUBLIC_UPLOAD_ROOT, fileName);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, buffer);
  return `/uploads/media/${fileName}`;
}

export async function storeMediaVariant(params: {
  assetId: string;
  fileName: string;
  buffer: Buffer;
  contentType: string;
}): Promise<string> {
  const { assetId, fileName, buffer, contentType } = params;

  if (isSupabaseMediaStorageConfigured()) {
    const objectPath = `variants/${assetId}/${fileName}`;
    const admin = getSupabaseAdmin();
    const { error } = await admin.storage.from(STORAGE_BUCKETS.MEDIA_PUBLIC).upload(objectPath, buffer, {
      contentType,
      upsert: false,
    });
    if (error) throw error;
    return admin.storage.from(STORAGE_BUCKETS.MEDIA_PUBLIC).getPublicUrl(objectPath).data.publicUrl;
  }

  if (isVercelRuntime()) {
    throw new Error("Supabase media storage is required on Vercel for admin media variants.");
  }

  const absolute = path.join(PUBLIC_UPLOAD_ROOT, "variants", assetId, fileName);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, buffer);
  return `/uploads/media/variants/${assetId}/${fileName}`;
}

export async function readMediaAssetBuffer(source: string): Promise<Buffer> {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Remote media fetch failed with status ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const normalized = source.startsWith("/") ? source.slice(1) : source;
  const absolute = path.join(process.cwd(), "public", normalized);
  return fs.readFile(absolute);
}

export function buildSafeMediaFileName(baseName: string, extension: string): string {
  const cleanBase =
    baseName
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "asset";

  return `${cleanBase}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}${extension}`;
}
