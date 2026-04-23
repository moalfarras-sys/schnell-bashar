import { SignDocumentForm } from "@/app/dokumente/unterschrift/[token]/sign-document-form";
import { Container } from "@/components/container";
import { hashSigningToken } from "@/lib/documents/signature";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export default async function DocumentSignaturePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const signingToken = await prisma.signingToken.findUnique({
    where: { tokenHash: hashSigningToken(token) },
    include: {
      document: {
        include: {
          currentVersion: true,
        },
      },
    },
  });

  const invalid =
    !signingToken ||
    signingToken.status !== "ACTIVE" ||
    signingToken.usedAt ||
    signingToken.expiresAt < new Date() ||
    !signingToken.document.customerSignatureEnabled ||
    !signingToken.document.approvedAt ||
    !signingToken.document.approvedByUserId ||
    !signingToken.document.currentVersion ||
    signingToken.document.currentVersion.id !== signingToken.documentVersionId ||
    signingToken.document.currentVersion.hash !== signingToken.documentHash ||
    (signingToken.document.status !== "ADMIN_APPROVED" &&
      signingToken.document.status !== "SIGNATURE_PENDING");

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <Container className="max-w-3xl">
        {invalid ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <h1 className="text-2xl font-bold">
              Dieses Dokument ist noch nicht zur Unterschrift freigegeben.
            </h1>
            <p className="mt-3 text-sm">
              Bitte warten Sie auf die Prüfung durch Schnell Sicher Umzug.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h1 className="text-2xl font-bold text-slate-900">Dokument elektronisch bestätigen</h1>
              <p className="mt-2 text-sm text-slate-600">
                Dieses Dokument wurde von Schnell Sicher Umzug geprüft und zur Unterschrift freigegeben.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
              <div>
                <span className="font-semibold">Dokument:</span> {signingToken.document.number}
              </div>
              <div className="mt-1">
                <span className="font-semibold">Typ:</span> {signingToken.document.type}
              </div>
              <div className="mt-1">
                <span className="font-semibold">Freigegeben am:</span>{" "}
                {signingToken.document.approvedAt?.toLocaleString("de-DE")}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <SignDocumentForm
                token={token}
                defaultName={
                  String(
                    (signingToken.document.customerData as { name?: string } | null)?.name ||
                      "",
                  ) || ""
                }
              />
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
