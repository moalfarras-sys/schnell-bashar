import { NextResponse } from "next/server";
import crypto from "node:crypto";

import { requireAdminPermission } from "@/server/auth/require-admin-permission";
import { getSupabaseAdmin, STORAGE_BUCKETS } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const claims = await requireAdminPermission("accounting.update");
  if (!claims) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Datei fehlt." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Datei zu groß. Maximal 10MB." }, { status: 400 });
  }

  const extension = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeExt = extension || "bin";
  const key = `receipts/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${safeExt}`;

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
