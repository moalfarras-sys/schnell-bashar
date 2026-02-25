import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db/prisma";
import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";

export default async function AuditLogPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) redirect("/admin/login");
  try {
    await verifyAdminToken(token);
  } catch {
    redirect("/admin/login");
  }

  const logs = await prisma.auditLog.findMany({
    take: 150,
    orderBy: { createdAt: "desc" },
    include: {
      actor: {
        select: { email: true, name: true },
      },
    },
  });

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <h1 className="text-xl font-bold text-white">Audit-Log</h1>
        <p className="mt-1 text-sm text-slate-300">Letzte administrative Aktionen und Ä?nderungen.</p>
      </section>

      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead>
              <tr className="border-b border-slate-700 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-2 py-2">Zeit</th>
                <th className="px-2 py-2">Akteur</th>
                <th className="px-2 py-2">Aktion</th>
                <th className="px-2 py-2">Objekt</th>
                <th className="px-2 py-2">Pfad</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-800">
                  <td className="px-2 py-2 text-xs">{log.createdAt.toLocaleString("de-DE")}</td>
                  <td className="px-2 py-2 text-xs">{log.actor?.email ?? "system"}</td>
                  <td className="px-2 py-2">{log.action}</td>
                  <td className="px-2 py-2 text-xs">{log.entityType}{log.entityId ? `:${log.entityId}` : ""}</td>
                  <td className="px-2 py-2 text-xs">{log.path ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

