import { DocumentFooter } from "@/components/document/DocumentFooter";
import { DocumentHeader } from "@/components/document/DocumentHeader";
import { ItemsTable } from "@/components/document/ItemsTable";
import { MoveDetails } from "@/components/document/MoveDetails";
import { SignatureFields } from "@/components/document/SignatureFields";
import { TotalsBox } from "@/components/document/TotalsBox";
import { formatDate } from "@/lib/number-format";
import { paymentNotice } from "@/lib/payment-notice";
import type { Company, Job } from "@/types/document";
import { AgbPage } from "@/templates/agb/AgbPage";

function OfferFirstPage({
  company,
  job,
  mode
}: {
  company: Company;
  job: Job;
  mode: "angebot" | "vertrag";
}) {
  const isContract = mode === "vertrag";

  return (
    <article className="a4-page-tight flex flex-col p-[11mm] text-[10.8px] font-medium leading-4 text-slate-950">
      <DocumentHeader
        company={company}
        job={job}
        title={isContract ? "Vertrag" : "Angebot"}
        number={isContract ? job.contractNumber : job.offerNumber}
        compact
      />

      <main className="flex-1">
        <section className="print-section mt-3">
          <div className="flex items-start justify-between gap-8">
            <div>
              <h1 className="text-[18px] font-black text-slate-950">
                {isContract
                  ? "Auftragsbestätigung / Umzugsvertrag"
                  : "Angebot für Ihren Umzug"}
              </h1>
              <p className="mt-0.5 max-w-2xl font-semibold text-slate-900">
                {isContract
                  ? `Bezug auf Angebot ${job.offerNumber}. Die nachstehenden Leistungen werden verbindlich vereinbart.`
                  : "Vielen Dank für Ihre Anfrage. Auf Grundlage der angegebenen Daten erstellen wir folgendes Angebot."}
              </p>
            </div>
            <div className="min-w-44 rounded-sm border border-slate-500 bg-slate-100 p-2 text-[10.5px] font-semibold">
              <p>
                <span>Gültig bis:</span>{" "}
                <strong>{formatDate(job.validUntil)}</strong>
              </p>
              <p>
                <span>Zahlung:</span>{" "}
                <strong>{job.paymentMethod}</strong>
              </p>
            </div>
          </div>
        </section>

        <MoveDetails job={job} compact />
        <ItemsTable items={job.items} compact />
        <TotalsBox items={job.items} compact />

        <section className="print-section mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-sm border border-slate-500 p-2.5">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-800">
              Zahlungshinweis
            </p>
            <p className="mt-1 font-semibold">{paymentNotice}</p>
          </div>
          <div className="rounded-sm border border-slate-500 p-2.5">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-800">
              Anmerkungen
            </p>
            <p className="mt-1">{job.notes || "Keine Anmerkungen."}</p>
          </div>
        </section>

        {!isContract ? (
          <section className="print-section mt-3 rounded-sm border-l-4 border-[#f26b21] bg-orange-50 p-2.5 text-[10.8px] font-bold">
            Dieses Angebot kann durch Unterschrift oder schriftliche Bestätigung
            in einen verbindlichen Auftrag bzw. Vertrag umgewandelt werden.
          </section>
        ) : null}

        <SignatureFields compact />
      </main>

      <DocumentFooter company={company} />
    </article>
  );
}

export function OfferDocument({
  company,
  job,
  includeAgb = true
}: {
  company: Company;
  job: Job;
  includeAgb?: boolean;
}) {
  return (
    <div className="grid gap-6 print:block">
      <OfferFirstPage company={company} job={job} mode="angebot" />
      {includeAgb ? <AgbPage company={company} /> : null}
    </div>
  );
}

export function ContractDocument({
  company,
  job,
  includeAgb = true
}: {
  company: Company;
  job: Job;
  includeAgb?: boolean;
}) {
  return (
    <div className="grid gap-6 print:block">
      <OfferFirstPage company={company} job={job} mode="vertrag" />
      {includeAgb ? <AgbPage company={company} /> : null}
    </div>
  );
}
