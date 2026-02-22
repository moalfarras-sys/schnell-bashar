"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Download, Search } from "lucide-react";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

function BuchungBestaetigtContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const pdfToken = searchParams.get("token") ?? "";

  const pdfUrl = code
    ? `/api/orders/${encodeURIComponent(code)}/pdf${pdfToken ? `?token=${encodeURIComponent(pdfToken)}` : ""}`
    : null;

  return (
    <Container className="py-14">
      <div className="mx-auto max-w-2xl text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
          Buchung bestätigt
        </h1>
        <p className="mt-4 text-base text-slate-700 dark:text-slate-300">
          Vielen Dank! Ihre Buchung wurde erfolgreich abgeschlossen. Sie erhalten in Kürze eine
          Bestätigungs-E-Mail mit dem Angebot als PDF-Anhang.
        </p>

        {code && (
          <div className="mt-8 rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="text-sm font-bold text-slate-600 dark:text-slate-400">Ihr Tracking-Code</div>
            <div className="mt-2 font-mono text-2xl font-extrabold text-slate-950 dark:text-white">{code}</div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Notieren Sie diesen Code, um Ihre Anfrage jederzeit verfolgen zu können.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {code && (
            <>
              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Button size="lg" variant="outline" className="w-full gap-2 sm:w-auto">
                    <Download className="h-5 w-5" />
                    PDF herunterladen
                  </Button>
                </a>
              )}
              <Link href={`/anfrage/${code}`}>
                <Button size="lg" className="w-full gap-2 sm:w-auto">
                  <Search className="h-5 w-5" />
                  Anfrage verfolgen
                </Button>
              </Link>
            </>
          )}
        </div>

        <p className="mt-8 text-sm text-slate-600 dark:text-slate-400">
          Bei Fragen erreichen Sie uns unter{" "}
          <a href="tel:+491729573681" className="font-semibold text-brand-700 hover:underline dark:text-brand-400">
            +49 172 9573681
          </a>{" "}
          oder per{" "}
          <a
            href="https://wa.me/491729573681"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-700 hover:underline dark:text-brand-400"
          >
            WhatsApp
          </a>
          .
        </p>
      </div>
    </Container>
  );
}

export default function BuchungBestaetigtPage() {
  return (
    <Suspense fallback={
      <Container className="py-14">
        <div className="mx-auto max-w-2xl animate-pulse rounded-3xl border-2 border-slate-200 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-800/40">
          <div className="h-20 w-20 mx-auto rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="mt-6 h-8 w-48 mx-auto rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-4 h-4 w-64 mx-auto rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </Container>
    }>
      <BuchungBestaetigtContent />
    </Suspense>
  );
}
