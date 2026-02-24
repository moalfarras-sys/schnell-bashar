import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db/prisma";
import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { ensureDefaultRbac } from "@/server/auth/admin-users";

export default async function RolesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) redirect("/admin/login");
  try {
    await verifyAdminToken(token);
  } catch {
    redirect("/admin/login");
  }

  await ensureDefaultRbac();

  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: { permission: true },
      },
    },
    orderBy: { slug: "asc" },
  });

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <h1 className="text-xl font-bold text-white">Rollen & Rechte</h1>
        <p className="mt-1 text-sm text-slate-300">Aktive Rollen und zugewiesene Berechtigungen.</p>
      </section>

      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <div className="grid gap-4">
          {roles.map((role) => (
            <div key={role.id} className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
              <div className="text-sm font-bold text-white">{role.slug}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {role.permissions.map((rp) => (
                  <span key={rp.id} className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-200">
                    {rp.permission.key}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

