"use client";

import Link from "next/link";

import { Container } from "@/components/container";

export function ManualContractForm() {
  return (
    <Container className="py-8">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h1 className="text-2xl font-bold">Legacy-Ansicht</h1>
        <p className="mt-3 text-sm">
          Der alte manuelle Vertragsweg wurde deaktiviert. Bitte erstellen und verwalten Sie neue
          Vertragsentwürfe ausschließlich im Dokumentenbereich.
        </p>
        <div className="mt-4">
          <Link href="/admin/dokumente/neu" className="font-semibold underline">
            Zum neuen Dokumentenbereich
          </Link>
        </div>
      </div>
    </Container>
  );
}
