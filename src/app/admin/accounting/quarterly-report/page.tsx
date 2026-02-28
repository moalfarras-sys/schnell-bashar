import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { Container } from "@/components/container";
import { QuarterlyReportClient } from "./quarterly-report-client";

export const dynamic = "force-dynamic";

export default async function QuarterlyReportPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) redirect("/admin/login");
  try {
    await verifyAdminToken(token);
  } catch {
    redirect("/admin/login");
  }

  const now = new Date();
  return (
    <div>
      <Container className="py-2">
        <h1 className="text-3xl font-bold text-slate-900">Quartalsbericht</h1>
        <p className="mt-2 text-slate-600">
          Steuergeeignete Quartalsauswertung mit bezahlten Umsätzen, Betriebsausgaben und USt-Übersicht.
        </p>
        <div className="mt-6">
          <QuarterlyReportClient defaultYear={now.getFullYear()} />
        </div>
      </Container>
    </div>
  );
}
