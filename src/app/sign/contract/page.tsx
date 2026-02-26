import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/container";
import { SignContractForm } from "@/app/sign/contract/sign-contract-form";
import { prisma } from "@/server/db/prisma";
import {
  buildFallbackSigningUrl,
  getFallbackSigningExpiry,
  hashFallbackSigningToken,
  issueFallbackSigningToken,
} from "@/server/signing/fallback-signing";

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

const contractInclude = {
  offer: {
    select: {
      customerName: true,
      moveFrom: true,
      moveTo: true,
      moveDate: true,
      grossCents: true,
      token: true,
    },
  },
} as const;

export default async function SignContractPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; offer?: string }>;
}) {
  const { token, offer } = await searchParams;
  const tokenValue = typeof token === "string" ? token.trim() : "";
  const offerToken = typeof offer === "string" ? offer.trim() : "";

  if (!tokenValue && !offerToken) {
    return (
      <div className="luxury-bg-dark min-h-screen">
        <Container className="py-16">
          <div className="mx-auto max-w-2xl rounded-2xl border border-red-500/40 bg-red-900/20 p-6 text-red-100">
            <h1 className="text-xl font-bold">Signatur-Link fehlt</h1>
            <p className="mt-2 text-sm">Bitte nutzen Sie den Link aus Ihrer E-Mail.</p>
          </div>
        </Container>
      </div>
    );
  }

  const now = new Date();
  let contract =
    tokenValue.length > 0
      ? await prisma.contract.findFirst({
          where: { signatureTokenHash: hashFallbackSigningToken(tokenValue) },
          include: contractInclude,
        })
      : null;

  const tokenLooksValid =
    !!contract &&
    contract.status === "PENDING_SIGNATURE" &&
    !!contract.signatureTokenHash &&
    !!contract.signatureTokenExpiresAt &&
    contract.signatureTokenExpiresAt >= now;

  if (!tokenLooksValid) {
    const pendingContract =
      (offerToken
        ? await prisma.contract.findFirst({
            where: {
              status: "PENDING_SIGNATURE",
              offer: { token: offerToken },
            },
            include: contractInclude,
          })
        : null) ||
      (tokenValue
        ? await prisma.contract.findFirst({
            where: {
              status: "PENDING_SIGNATURE",
              signingUrl: { contains: tokenValue },
            },
            include: contractInclude,
          })
        : null) ||
      (contract?.status === "PENDING_SIGNATURE" ? contract : null);

    if (pendingContract) {
      const tokenPayload = issueFallbackSigningToken();
      const signingUrl = buildFallbackSigningUrl(tokenPayload.token, pendingContract.offer.token);

      await prisma.contract.update({
        where: { id: pendingContract.id },
        data: {
          signatureProvider: "INTERNAL",
          docusignStatus: "internal_pending",
          signingUrl,
          signatureTokenHash: tokenPayload.tokenHash,
          signatureTokenExpiresAt: getFallbackSigningExpiry(now),
          sentForSigningAt: pendingContract.sentForSigningAt ?? now,
        },
      });

      redirect(signingUrl);
    }
  }

  if (!contract || contract.status !== "PENDING_SIGNATURE" || !contract.signatureTokenHash) {
    return (
      <div className="luxury-bg-dark min-h-screen">
        <Container className="py-16">
          <div className="mx-auto max-w-2xl rounded-2xl border border-amber-500/40 bg-amber-900/20 p-6 text-amber-100">
            <h1 className="text-xl font-bold">Signatur-Link ist ungültig oder abgelaufen</h1>
            <p className="mt-2 text-sm">
              Bitte fordern Sie einen neuen Signatur-Link an. Wir senden ihn Ihnen sofort erneut.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/kontakt" className="inline-block underline">
                Zum Kontakt
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="luxury-bg-dark min-h-screen text-slate-100">
      <Container className="py-12">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 p-6">
            <h1 className="text-2xl font-extrabold">Vertrag digital unterschreiben</h1>
            <p className="mt-2 text-sm text-slate-300">
              Bitte prüfen Sie die Angaben und unterschreiben Sie den Vertrag verbindlich.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 p-6 text-sm">
            <div>
              <span className="font-semibold">Kunde:</span> {contract.offer.customerName}
            </div>
            {contract.offer.moveFrom && contract.offer.moveTo ? (
              <div className="mt-1">
                <span className="font-semibold">Route:</span> {contract.offer.moveFrom} {"->"}{" "}
                {contract.offer.moveTo}
              </div>
            ) : null}
            {contract.offer.moveDate ? (
              <div className="mt-1">
                <span className="font-semibold">Termin:</span>{" "}
                {contract.offer.moveDate.toLocaleDateString("de-DE")}
              </div>
            ) : null}
            <div className="mt-1">
              <span className="font-semibold">Gesamt:</span> {formatEuro(contract.offer.grossCents)}
            </div>
            {(contract.contractPdfUrl || contract.signedPdfUrl) ? (
              <div className="mt-2">
                <a
                  href={`/api/contracts/signature/${contract.offer.token}/pdf?kind=contract`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Vertrags-PDF ansehen
                </a>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 p-6">
            <SignContractForm token={tokenValue} customerName={contract.offer.customerName} />
          </div>
        </div>
      </Container>
    </div>
  );
}
