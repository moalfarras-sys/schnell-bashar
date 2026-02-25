import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { verifyAdminToken, adminCookieName } from "@/server/auth/admin-session";
import { Container } from "@/components/container";
import { NewInvoiceForm } from "./new-invoice-form";

export default async function NewInvoicePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) redirect("/admin/login");
  try {
    await verifyAdminToken(token);
  } catch {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Container className="py-8">
        <Link
          href="/admin/accounting/invoices"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zu Rechnungen
        </Link>
        <h1 className="mb-8 text-3xl font-bold text-slate-900">Neue Rechnung erstellen</h1>
        <NewInvoiceForm />
      </Container>
    </div>
  );
}

