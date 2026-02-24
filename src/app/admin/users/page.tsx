import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db/prisma";
import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { ensureDefaultRbac } from "@/server/auth/admin-users";
import {
  createAdminUserAction,
  resetAdminPasswordAction,
  setAdminRoleAction,
  toggleAdminUserAction,
} from "@/app/admin/users/actions";

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) redirect("/admin/login");
  try {
    await verifyAdminToken(token);
  } catch {
    redirect("/admin/login");
  }

  await ensureDefaultRbac();

  const [users, roles] = await Promise.all([
    prisma.adminUser.findMany({
      where: { deletedAt: null },
      include: {
        roles: {
          where: { deletedAt: null },
          include: { role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.role.findMany({ orderBy: { slug: "asc" } }),
  ]);

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <h1 className="text-xl font-bold text-white">Benutzerverwaltung</h1>
        <p className="mt-1 text-sm text-slate-300">Konten erstellen, aktivieren/deaktivieren, Passwort zurücksetzen und Rollen zuweisen.</p>
      </section>

      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-300">Neuer Admin-Benutzer</h2>
        <form action={createAdminUserAction} className="grid gap-3 md:grid-cols-4">
          <input name="name" required placeholder="Name" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white" />
          <input name="email" type="email" required placeholder="E-Mail" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white" />
          <input name="password" type="password" required placeholder="Passwort" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white" />
          <select name="roleId" required className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white">
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.slug}</option>
            ))}
          </select>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white md:col-span-4 md:w-fit">
            Benutzer anlegen
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-300">Bestehende Benutzer</h2>
        <div className="grid gap-3">
          {users.map((user) => {
            const roleId = user.roles[0]?.roleId ?? "";
            return (
              <div key={user.id} className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-white">{user.name}</div>
                    <div className="text-xs text-slate-300">{user.email}</div>
                  </div>
                  <div className={`rounded-full px-2 py-0.5 text-xs font-bold ${user.isActive ? "bg-emerald-600/20 text-emerald-300" : "bg-red-600/20 text-red-300"}`}>
                    {user.isActive ? "Aktiv" : "Deaktiviert"}
                  </div>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <form action={toggleAdminUserAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <button className="w-full rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700">
                      {user.isActive ? "Deaktivieren" : "Aktivieren"}
                    </button>
                  </form>

                  <form action={setAdminRoleAction} className="flex gap-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <select name="roleId" defaultValue={roleId} className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white">
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>{role.slug}</option>
                      ))}
                    </select>
                    <button className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200">Rolle</button>
                  </form>

                  <form action={resetAdminPasswordAction} className="flex gap-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <input name="password" type="password" required placeholder="Neues Passwort" className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white" />
                    <button className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200">Reset</button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

