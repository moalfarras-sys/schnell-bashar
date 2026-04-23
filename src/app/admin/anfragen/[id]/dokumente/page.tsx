import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { Container } from "@/components/container";
import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { prisma } from "@/server/db/prisma";

export default async function InquiryDocumentsPage({
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
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <Container className="py-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dokumente zur Anfrage</h1>
            <p className="mt-2 text-slate-600">
              Anfrage {order.publicId} · Workflow {order.workflowStatus}
            </p>
          </div>
          <Link href={`/admin/dokumente/neu?orderId=${order.id}`} className="inline-flex rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
            Aus Anfrage erstellen
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          {order.documents.length === 0 ? (
            <p className="text-sm text-slate-600">Noch keine Dokumente vorhanden.</p>
          ) : (
            <div className="grid gap-3">
              {order.documents.map((document) => (
                <Link key={document.id} href={`/admin/dokumente/${document.id}`} className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                  <div className="font-semibold text-slate-900">{document.number || document.id}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {document.type} · {document.status}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
