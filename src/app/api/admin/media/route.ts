import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { requireAdminSession } from "@/server/auth/require-admin";
import { slotAdminDelegates } from "@/server/content/slot-admin-db";
import { getImageDimensions } from "@/server/media/image-meta";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function sanitizeFileBaseName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "asset"
  );
}

function extensionForMime(mime: string): string {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return ".jpg";
}

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const delegates = slotAdminDelegates();
  if (!delegates.mediaAsset) {
    return NextResponse.json({ error: "Media DB nicht bereit" }, { status: 503 });
  }

  try {
    const assets = (await delegates.mediaAsset.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    })) as unknown[];
    return NextResponse.json({ assets });
  } catch {
    return NextResponse.json({ error: "Media DB Fehler" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const delegates = slotAdminDelegates();
  if (!delegates.mediaAsset) {
    return NextResponse.json({ error: "Media DB nicht bereit" }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const alt = String(formData.get("alt") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Datei fehlt" }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: "Dateityp nicht erlaubt" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "Datei zu gross (max 8MB)" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const dims = getImageDimensions(bytes, file.type);

    const base = sanitizeFileBaseName(file.name);
    const ext = extensionForMime(file.type);
    const filename = `${base}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
    const publicRelative = `/uploads/media/${filename}`;
    const absolute = path.join(process.cwd(), "public", "uploads", "media", filename);

    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, bytes);

    const asset = await delegates.mediaAsset.create({
      data: {
        filename,
        path: publicRelative,
        alt: alt || null,
        title: title || null,
        mime: file.type,
        size: file.size,
        width: dims?.width ?? null,
        height: dims?.height ?? null,
      },
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 });
  }
}
