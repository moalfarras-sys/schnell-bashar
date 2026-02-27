import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { prisma } from "@/server/db/prisma";
import { Container } from "@/components/container";
import { ExpensesClient } from "./expenses-client";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) redirect("/admin/login");
  try {
    await verifyAdminToken(token);
  } catch {
    redirect("/admin/login");
  }

  const categories = await prisma.expenseCategory.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { nameDe: "asc" }],
  });

  return (
    <Container className="py-2">
      <h1 className="text-3xl font-bold text-slate-900">Ausgaben</h1>
      <p className="mt-2 text-slate-600">
        Manuelle Betriebsausgaben verwalten, Belege verknüpfen und monatlich auswerten.
      </p>
      <div className="mt-6">
        <ExpensesClient categories={categories.map((c) => ({ id: c.id, nameDe: c.nameDe, defaultVatRate: c.defaultVatRate }))} />
      </div>
    </Container>
  );
}

