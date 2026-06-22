import { DocumentFooter } from "@/components/document/DocumentFooter";
import { DocumentHeader } from "@/components/document/DocumentHeader";
import { ItemsTable } from "@/components/document/ItemsTable";
import { TotalsBox } from "@/components/document/TotalsBox";
import { formatDate } from "@/lib/number-format";
import { paymentNotice } from "@/lib/payment-notice";
import type { Company, Job } from "@/types/document";

export function InvoiceDocument({
  company,
  job
}: {
  company: Company;
  job: Job;
}) {
  return (
    <article className="a4-page-tight flex flex-col p-[12mm] text-[11px] font-medium leading-4 text-slate-950">
      <DocumentHeader
        company={company}
        job={job}
        title="Rechnung"
        number={job.invoiceNumber}
        compact
      />

      <main className="flex-1">
        <section className="print-section mt-3">
          <h1 className="text-[21px] font-black text-slate-950">Rechnung</h1>
          <div className="mt-2 grid grid-cols-4 gap-2 rounded-sm border border-slate-500 bg-slate-100 p-2 text-[10.5px] font-bold">
            <div>
              <p className="text-slate-800">Rechnungsnr.</p>
              <p className="font-semibold">{job.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-slate-800">Rechnungsdatum</p>
              <p className="font-semibold">{formatDate(job.invoiceDate)}</p>
            </div>
            <div>
              <p className="text-slate-800">Leistungsdatum</p>
              <p className="font-semibold">{formatDate(job.serviceDate)}</p>
            </div>
            <div>
              <p className="text-slate-800">Zahlung</p>
              <p className="font-semibold">siehe Hinweis</p>
            </div>
          </div>
        </section>

        <ItemsTable items={job.items} compact />
        <TotalsBox items={job.items} compact />

        <section className="print-section mt-4 grid grid-cols-[1.1fr_0.9fr] gap-4">
          <div
            className="rounded-sm border border-slate-500 border-t-[3px] p-3"
            style={{ borderTopColor: company.brand.primaryColor }}
          >
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-800">
              Bankverbindung
            </p>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[10.5px] font-bold">
              <dt className="text-slate-800">IBAN</dt>
              <dd className="pdf-nowrap font-black text-slate-950">{company.iban}</dd>
              <dt className="text-slate-800">BIC</dt>
              <dd className="pdf-nowrap font-black text-slate-950">{company.bic}</dd>
              <dt className="text-slate-800">Bank</dt>
              <dd className="font-semibold">{company.bankName}</dd>
              <dt className="text-slate-800">Inhaber</dt>
              <dd className="font-semibold">{company.accountHolder}</dd>
            </dl>
          </div>
          <div className="rounded-sm border border-slate-500 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-800">
              Zahlungshinweis
            </p>
            <p className="mt-1 font-semibold">{paymentNotice}</p>
            {job.bankChangeNotice ? (
              <p className="mt-2 rounded-sm bg-red-50 p-2 font-black text-red-700">
                Hinweis: Bitte beachten Sie die geänderte Bankverbindung.
              </p>
            ) : null}
          </div>
        </section>
      </main>

      <DocumentFooter company={company} />
    </article>
  );
}
