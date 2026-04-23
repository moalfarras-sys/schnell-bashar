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
    <div className="min-h-screen bg-slate-50">
      <Container className="py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-slate-900">Neues Dokument</h1>
        <p className="mt-2 text-slate-600">Manuelles Dokument anlegen und als Entwurf speichern.</p>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <DocumentEditor mode="create" />
        </div>
      </Container>
    </div>
  );
}
