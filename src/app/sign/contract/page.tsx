import Link from "next/link";

import { Container } from "@/components/container";

export default function LegacySignContractPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <Container className="max-w-2xl">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-2xl font-bold">Signatur-Link nicht mehr gültig</h1>
          <p className="mt-3 text-sm">
            Verträge können erst nach Prüfung und ausdrücklicher Freigabe durch Schnell Sicher Umzug
            elektronisch bestätigt werden. Bitte verwenden Sie nur den aktuellen Freigabe-Link aus
            unserer E-Mail.
          </p>
          <div className="mt-4">
            <Link href="/kontakt" className="font-semibold underline">
              Zum Kontakt
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
