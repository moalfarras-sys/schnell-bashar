import Link from "next/link";
import { CheckCircle2, Download, FileText, Mail, MessageCircle, Phone, Search } from "lucide-react";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; token?: string; offerToken?: string; offerNo?: string }>;
}) {
  const {
    order: orderParam,
    token: tokenParam,
    offerToken: offerTokenParam,
    offerNo: offerNoParam,
  } = await searchParams;
  const order = orderParam ?? "";
  const pdfToken = tokenParam ?? "";
  const offerToken = offerTokenParam ?? "";
  const offerNo = offerNoParam ?? "";
  const waText = encodeURIComponent(
    `Hallo! Ich habe eine Anfrage über die Website gesendet. Auftrags-ID: ${order}.`,
  );
  const waUrl = `https://wa.me/491729573681?text=${waText}`;
  const offerUrl = offerToken ? `/offer/${encodeURIComponent(offerToken)}` : null;
  const pdfUrl = order
    ? `/api/orders/${encodeURIComponent(order)}/pdf${pdfToken ? `?token=${encodeURIComponent(pdfToken)}` : ""}`
    : null;

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border-2 border-emerald-400 bg-[color:var(--surface-elevated)] p-8 shadow-lg backdrop-blur-sm dark:border-emerald-500/40 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 shadow-sm dark:bg-emerald-950/40">
              <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="font-display text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                Anfrage erfolgreich gesendet
              </div>
              <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
                Wir haben Ihre Daten erhalten. Ihr Termin ist angefragt und wird zeitnah bestätigt.
              </p>
            </div>
          </div>

          {offerUrl ? (
            <div className="mt-6">
              <Link href={offerUrl} className="block">
                <Button size="xl" className="w-full gap-2">
                  <FileText className="h-5 w-5" />
                  Angebot öffnen und verbindlich bestätigen
                </Button>
              </Link>
              {offerNo ? (
                <div className="mt-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Angebot {offerNo}
                </div>
              ) : null}
            </div>
          ) : null}

          {order ? (
            <div className="mt-5 rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-5 dark:border-emerald-500/40 dark:bg-emerald-950/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Ihre Auftrags-ID</div>
                  <div className="mt-1 font-mono text-xl font-extrabold text-slate-950 dark:text-white">
                    {order}
                  </div>
                </div>
                {pdfUrl ? (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--surface-elevated)] px-4 py-2.5 text-sm font-bold text-brand-700 shadow-sm transition-all hover:bg-brand-50 hover:shadow-md dark:bg-slate-800 dark:text-brand-400 dark:hover:bg-slate-700"
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </a>
                ) : null}
              </div>
              <div className="mt-2 text-xs text-slate-700 dark:text-slate-400">
                Bitte notieren Sie diese ID, um Ihre Anfrage jederzeit verfolgen zu können.
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex items-start gap-3 rounded-2xl border-2 border-blue-300 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-950/30">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
            <div className="text-sm text-slate-800 dark:text-slate-200">
              <span className="font-bold">Bestätigung per E-Mail:</span> Wir haben Ihnen eine Bestätigungsmail
              mit allen Details und Ihrem Angebot als PDF-Anhang gesendet. Bitte prüfen Sie auch den Spam-Ordner.
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href={order ? `/anfrage/${encodeURIComponent(order)}` : "/anfrage"}>
              <Button className="w-full gap-2" variant="outline">
                <Search className="h-4 w-4" />
                Anfrage verfolgen
              </Button>
            </Link>
            <a href={waUrl} target="_blank" rel="noreferrer">
              <Button className="w-full gap-2">
                <MessageCircle className="h-4 w-4" />
                WhatsApp öffnen
              </Button>
            </a>
          </div>

          {pdfUrl && !offerUrl ? (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-[color:var(--surface-elevated)] px-4 py-3 text-sm font-bold text-slate-800 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50 hover:shadow-md dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700"
            >
              <FileText className="h-4 w-4 text-brand-600" />
              Angebot als PDF herunterladen
            </a>
          ) : null}
        </div>

        <div className="mt-6 rounded-3xl border-2 border-slate-200 bg-[color:var(--surface-elevated)] p-6 shadow-md backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
          <div className="text-sm font-extrabold text-slate-900 dark:text-white">Wie geht es weiter?</div>
          <div className="mt-4 grid gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 shadow-sm dark:bg-brand-950/50 dark:text-brand-400">
                1
              </div>
              <div className="text-sm text-slate-800 dark:text-slate-200">
                <span className="font-semibold text-slate-900 dark:text-white">Anfrage erhalten:</span> Termin
                angefragt. Wir prüfen Ihre Angaben und bestätigen den finalen Termin zeitnah.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 shadow-sm dark:bg-brand-950/50 dark:text-brand-400">
                2
              </div>
              <div className="text-sm text-slate-800 dark:text-slate-200">
                <span className="font-semibold text-slate-900 dark:text-white">Angebot bestätigen:</span> Öffnen
                Sie Ihr Angebot und bestätigen Sie verbindlich mit Unterschrift.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 shadow-sm dark:bg-brand-950/50 dark:text-brand-400">
                3
              </div>
              <div className="text-sm text-slate-800 dark:text-slate-200">
                <span className="font-semibold text-slate-900 dark:text-white">Durchführung:</span> Nach
                bestätigtem Termin kümmern wir uns um alles.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="tel:+491729573681"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            <Phone className="h-4 w-4" />
            +49 172 9573681
          </a>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            Zur Startseite
          </Link>
        </div>

        <p className="mt-4 text-center text-xs text-slate-600 dark:text-slate-400">
          Tipp: Wenn Sie Fotos nicht hochgeladen haben, können Sie diese auch per WhatsApp nachreichen.
        </p>
      </div>
    </Container>
  );
}
