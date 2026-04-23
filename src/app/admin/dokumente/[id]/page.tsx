import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";

import { ApprovalPanel } from "@/components/admin/documents/approval-panel";
import { DocumentEditor } from "@/components/admin/documents/document-editor";
import { DocumentFileActions } from "@/components/admin/documents/document-file-actions";
import { DocumentStatusBadge } from "@/components/admin/documents/document-status-badge";
import { Container } from "@/components/container";
import {
  documentTypeLabel,
  requestWorkflowStatusLabel,
  signingTokenStatusLabel,
} from "@/lib/admin-labels";
import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { prisma } from "@/server/db/prisma";

export default async function AdminDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) redirect("/admin/login");
  try {
    await verifyAdminToken(token);
  } catch {
    redirect("/admin/login");
  }

  const { id } = await params;
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      lineItems: true,
      signingTokens: {
        orderBy: { createdAt: "desc" },
      },
      order: {
        select: { publicId: true, workflowStatus: true },
      },
    },
  });

  if (!document) notFound();

  const customer = document.customerData as {
    name?: string;
    email?: string;
    phone?: string;
    billingAddress?: string;
  } | null;
  const serviceData = document.serviceData as { serviceType?: string } | null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Container className="max-w-5xl py-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {document.number || document.id}
          </h1>
          <DocumentStatusBadge status={document.status} />
        </div>

        <div className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          Dokumenttyp: <span className="font-semibold text-slate-900 dark:text-slate-100">{documentTypeLabel(document.type)}</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900/80">
            <DocumentEditor
              mode="edit"
              documentId={document.id}
              initial={{
                type: document.type,
                customerName: customer?.name || "",
                customerEmail: customer?.email || "",
                customerPhone: customer?.phone || "",
                billingAddress: customer?.billingAddress || "",
                serviceType: serviceData?.serviceType || "",
                visibleNotes: document.visibleNotes || "",
                internalNotes: document.internalNotes || "",
                grossCents: document.grossCents,
              }}
            />
          </div>

          <div className="space-y-6">
            <ApprovalPanel documentId={document.id} status={document.status} />
            <DocumentFileActions
              documentId={document.id}
              hasSignedPdf={Boolean(document.signingTokens.some((tokenRow) => tokenRow.status === "USED"))}
            />

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/80">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Verknüpfte Anfrage</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Anfrage: {document.order?.publicId || "-"}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Workflow: {requestWorkflowStatusLabel(document.order?.workflowStatus)}
              </p>
              {document.order?.publicId ? (
                <div className="mt-4">
                  <Link
                    href={`/admin/orders/${document.order.publicId}`}
                    className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
                  >
                    Anfrage öffnen
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/80">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Signatur-Status</h2>
              {document.signingTokens.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Noch kein Signatur-Link erstellt.</p>
              ) : (
                <div className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  {document.signingTokens.slice(0, 3).map((tokenRow) => (
                    <div
                      key={tokenRow.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div>Status: {signingTokenStatusLabel(tokenRow.status)}</div>
                      <div>Läuft ab: {tokenRow.expiresAt.toLocaleString("de-DE")}</div>
                      <div>Token-Hash: {tokenRow.tokenHash.slice(0, 16)}...</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
