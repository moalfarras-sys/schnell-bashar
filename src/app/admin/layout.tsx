import Link from "next/link";

import { logoutAction } from "@/app/admin/actions";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin/admin-nav";
import { prisma } from "@/server/db/prisma";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let newOrderCount = 0;
  try {
    newOrderCount = await prisma.order.count({ where: { status: "NEW" } });
  } catch {
    /* DB unavailable — nav still renders */
  }

  return (
    <div className="luxury-bg min-h-screen text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-50 border-b border-[color:var(--line-soft)] bg-[color:var(--surface-elevated)]/90 backdrop-blur-xl">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
              Admin · Schnell Sicher Umzug
            </Link>
            <Link href="/" className="text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              Zur Website
            </Link>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="outline-light" size="sm">
              Abmelden
            </Button>
          </form>
        </Container>
      </header>

      <Container className="grid gap-6 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="surface-glass h-fit rounded-2xl border p-3">
          <AdminNav newOrderCount={newOrderCount} />
        </aside>
        <main>{children}</main>
      </Container>
    </div>
  );
}
