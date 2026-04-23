import { getSupabaseAdmin } from "@/lib/supabase";

const DOCUMENT_BUCKET = "documents-private";
const SIGNED_DOCUMENT_BUCKET = "signed-documents-private";

function ensureServerSide() {
  if (typeof window !== "undefined") {
    throw new Error("Document storage is server-only.");
  }
}

export function privateDocumentBucket() {
  return DOCUMENT_BUCKET;
}

export function privateSignedDocumentBucket() {
  return SIGNED_DOCUMENT_BUCKET;
}

function hasDocumentStorageConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function uploadPrivateDocument(params: {
  bucket?: string;
  key: string;
  buffer: Buffer;
  contentType?: string;
}) {
  ensureServerSide();
  if (!hasDocumentStorageConfig()) {
    return null;
  }
  const admin = getSupabaseAdmin();
  const bucket = params.bucket ?? DOCUMENT_BUCKET;
  const { error } = await admin.storage.from(bucket).upload(params.key, params.buffer, {
    contentType: params.contentType ?? "application/pdf",
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    bucket,
    key: params.key,
  };
}

export async function downloadPrivateDocument(params: {
  bucket?: string;
  key: string;
}) {
  ensureServerSide();
  if (!hasDocumentStorageConfig()) {
    throw new Error("Private document storage is not configured.");
  }
  const admin = getSupabaseAdmin();
  const bucket = params.bucket ?? DOCUMENT_BUCKET;
  const { data, error } = await admin.storage.from(bucket).download(params.key);
  if (error || !data) {
    throw new Error(error?.message || "Document download failed.");
  }

  return Buffer.from(await data.arrayBuffer());
}
