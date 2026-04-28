import { NextResponse } from "next/server";

import { requireAdminPermission } from "@/server/auth/require-admin";
import { prisma } from "@/server/db/prisma";
import { verifyMailConnection } from "@/lib/mail";
import { getSupabaseAdmin, STORAGE_BUCKETS } from "@/lib/supabase";

export const runtime = "nodejs";

function present(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function hostKind(value: string | undefined) {
  if (!value) return { configured: false, kind: "missing" };
  try {
    const url = new URL(value);
    const host = url.hostname;
    const port = url.port || "default";
    const kind = host.includes("pooler.supabase.com")
      ? "supabase-pooler"
      : host.includes("supabase.co")
        ? "supabase-direct"
        : host.includes("localhost") || host.includes("127.0.0.1")
          ? "local"
          : "other";
    return { configured: true, kind, host, port };
  } catch {
    return { configured: true, kind: "invalid" };
  }
}

async function timed<T>(fn: () => Promise<T>, ms = 5000) {
  const started = Date.now();
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms),
      ),
    ]);
    return { ok: true as const, ms: Date.now() - started, result };
  } catch (error) {
    return {
      ok: false as const,
      ms: Date.now() - started,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function GET() {
  const auth = await requireAdminPermission("settings.read");
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
  }

  const db = await timed(async () => {
    const row = await prisma.$queryRaw<Array<{ ok: number }>>`select 1 as ok`;
    return row[0]?.ok === 1;
  });

  const smtp = await verifyMailConnection();
  const storage = present(process.env.NEXT_PUBLIC_SUPABASE_URL) && present(process.env.SUPABASE_SERVICE_ROLE_KEY)
    ? await timed(async () => {
        const { data, error } = await getSupabaseAdmin().storage.listBuckets();
        if (error) throw new Error(error.message);
        const names = new Set(data.map((bucket) => bucket.name));
        return Object.values(STORAGE_BUCKETS).map((name) => ({
          name,
          exists: names.has(name),
        }));
      })
    : { ok: false as const, ms: 0, message: "Supabase storage env vars missing." };

  return NextResponse.json({
    ok: db.ok && smtp.ok && storage.ok,
    env: {
      databaseUrl: hostKind(process.env.DATABASE_URL),
      directUrl: hostKind(process.env.DIRECT_URL),
      supabaseUrl: present(process.env.NEXT_PUBLIC_SUPABASE_URL),
      supabaseAnonKey: present(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      supabaseServiceRoleKey: present(process.env.SUPABASE_SERVICE_ROLE_KEY),
      adminEmail: present(process.env.ADMIN_EMAIL),
      adminPasswordHash: present(process.env.ADMIN_PASSWORD_HASH),
      sessionSecret: present(process.env.SESSION_SECRET),
      smtpHost: present(process.env.SMTP_HOST),
      smtpUser: present(process.env.SMTP_USER),
      smtpPass: present(process.env.SMTP_PASS),
      mailFrom: present(process.env.MAIL_FROM) || present(process.env.SMTP_FROM),
    },
    checks: {
      db,
      smtp,
      storage,
    },
  });
}
