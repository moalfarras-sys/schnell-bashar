import { NextResponse } from "next/server";
import crypto from "node:crypto";

import { requireAdminPermission } from "@/server/auth/require-admin-permission";
import { getSupabaseAdmin, STORAGE_BUCKETS } from "@/lib/supabase";

export const runtime = "nodejs";

const ALLOWED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "webp"]);
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export async function POST(req: Request) {
  const claims = await requireAdminPermission("accounting.update");
  if (!claims) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Datei fehlt." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Datei zu groß. Maximal 10 MB." }, { status: 400 });
  }

  const extension = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return NextResponse.json({ error: "Nur PDF, PNG, JPG, JPEG und WEBP sind erlaubt." }, { status: 400 });
  }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Nur PDF, PNG, JPG, JPEG und WEBP sind erlaubt." }, { status: 400 });
  }

  const key = `receipts/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;

  const admin = getSupabaseAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage.from(STORAGE_BUCKETS.EXPENSE_RECEIPTS).upload(key, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) {
    return NextResponse.json({ error: `Upload fehlgeschlagen: ${error.message}` }, { status: 500 });
  }
  const { data } = admin.storage.from(STORAGE_BUCKETS.EXPENSE_RECEIPTS).getPublicUrl(key);
  return NextResponse.json({ url: data.publicUrl, key });
}
