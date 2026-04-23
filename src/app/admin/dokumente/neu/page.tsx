import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { DocumentEditor } from "@/components/admin/documents/document-editor";
import { Container } from "@/components/container";
import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";

export default async function NewAdminDocumentPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) redirect("/admin/login");
  try {
    await verifyAdminToken(token);
  } catch {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Container className="max-w-4xl py-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Neues Dokument</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">Manuelles Dokument anlegen und als Entwurf speichern.</p>
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
          <DocumentEditor mode="create" />
        </div>
      </Container>
    </div>
  );
}
