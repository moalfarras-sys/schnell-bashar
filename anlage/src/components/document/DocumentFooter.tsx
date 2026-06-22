import type { ReactNode } from "react";
import type { Company } from "@/types/document";

function FooterColumn({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[8.5px] font-black uppercase leading-3 tracking-[0.08em] text-slate-600">
        {title}
      </p>
      <div className="grid gap-0.5">{children}</div>
    </div>
  );
}

function LabelValue({
  label,
  value,
  strong = false,
  nowrap = false
}: {
  label: string;
  value: string;
  strong?: boolean;
  nowrap?: boolean;
}) {
  return (
    <p className={nowrap ? "pdf-nowrap" : undefined}>
      <span className="font-bold text-slate-700">{label}: </span>
      <span className={strong ? "font-black text-slate-950" : "font-semibold"}>
        {value}
      </span>
    </p>
  );
}

export function DocumentFooter({ company }: { company: Company }) {
  return (
    <footer className="print-section mt-auto pt-3 text-[9.6px] font-medium leading-[1.35] text-slate-900">
      <div
        aria-hidden="true"
        className="mb-2 h-[3px] w-full rounded-full"
        style={{ backgroundColor: company.brand.primaryColor }}
      />
      <div className="grid grid-cols-[1.08fr_0.95fr_0.98fr_1.32fr] gap-3">
        <FooterColumn title="Unternehmen">
          <p className="font-black text-slate-950">{company.displayName}</p>
          <p>{company.fullLegalLine}</p>
          <p>
            {company.street}, {company.postalCode} {company.city}
          </p>
        </FooterColumn>

        <FooterColumn title="Kontakt">
          <LabelValue label="Tel." value={company.phone} nowrap />
          <p className="pdf-nowrap font-semibold">{company.email}</p>
          <p className="pdf-nowrap font-semibold">{company.website}</p>
        </FooterColumn>

        <FooterColumn title="Steuer">
          <LabelValue label="Inhaber" value={company.ownerName || company.accountHolder} />
          <LabelValue label="Steuernr." value={company.taxNumber} nowrap />
          <LabelValue label="Finanzamt" value={company.financeOffice} />
        </FooterColumn>

        <FooterColumn title="Bankverbindung">
          <LabelValue label="IBAN" value={company.iban} strong nowrap />
          <LabelValue label="BIC" value={company.bic} strong nowrap />
          <LabelValue label="Bank" value={company.bankName} />
          <LabelValue label="Kontoinhaber" value={company.accountHolder} />
        </FooterColumn>
      </div>
    </footer>
  );
}
