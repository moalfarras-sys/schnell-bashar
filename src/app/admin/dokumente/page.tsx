import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { FileDown, FileText, FileSignature, ReceiptText } from "lucide-react";
import { DocumentStatusBadge } from "@/components/admin/documents/document-status-badge";
import { Container } from "@/components/container";
import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { prisma } from "@/server/db/prisma";

export default async function AdminDocumentsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) redirect("/admin/login");
  try {
    await verifyAdminToken(token);
  } catch {
    redirect("/admin/login");
  }

  const documents = await prisma.document.findMany({
    include: {
      order: {
        select: {
          publicId: true,
          workflowStatus: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Container className="py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dokumente</h1>
            <p className="mt-2 text-slate-600">Angebote, Rechnungen, Verträge und Mahnungen verwalten.</p>
          </div>
          <Link href="/admin/dokumente/neu" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
            Neues Dokument
          </Link>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900">Angebotsvorlage</h3>
            </div>
            <div className="mt-4 flex gap-2">
              <a href="/api/templates/download?type=offer&format=pdf" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                <FileDown className="h-4 w-4" /> PDF
              </a>
              <a href="/api/templates/download?type=offer&format=word" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                <FileDown className="h-4 w-4" /> Word
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <FileSignature className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900">Vertragsvorlage</h3>
            </div>
            <div className="mt-4 flex gap-2">
              <a href="/api/templates/download?type=contract&format=pdf" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                <FileDown className="h-4 w-4" /> PDF
              </a>
              <a href="/api/templates/download?type=contract&format=word" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                <FileDown className="h-4 w-4" /> Word
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <ReceiptText className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900">Rechnungsvorlage</h3>
            </div>
            <div className="mt-4 flex gap-2">
              <a href="/api/templates/download?type=invoice&format=pdf" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                <FileDown className="h-4 w-4" /> PDF
              </a>
              <a href="/api/templates/download?type=invoice&format=word" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                <FileDown className="h-4 w-4" /> Word
              </a>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Nummer</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Typ</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Kunde</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Anfrage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((document) => {
                const customer = document.customerData as { name?: string } | null;
                return (
                  <tr key={document.id}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/dokumente/${document.id}`} className="font-semibold text-brand-700 hover:underline">
                        {document.number || document.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{document.type}</td>
                    <td className="px-4 py-3">{customer?.name || "-"}</td>
                    <td className="px-4 py-3"><DocumentStatusBadge status={document.status} /></td>
                    <td className="px-4 py-3">{document.order?.publicId || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Container>
    </div>
  );
}
