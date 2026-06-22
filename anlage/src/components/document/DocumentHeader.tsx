import Image from "next/image";
import { publicAssetPath } from "@/lib/routes";
import type { Company, Job } from "@/types/document";

export function DocumentHeader({
  company,
  job,
  title,
  number,
  compact = false
}: {
  company: Company;
  job: Job;
  title: string;
  number: string;
  compact?: boolean;
}) {
  const isBannerLogo = company.companyId === "schnell-sicher-umzug";

  return (
    <header
      style={{ borderColor: company.brand.primaryColor }}
      className={`print-section border-b-[3px] ${
        compact ? "pb-3" : "pb-4"
      }`}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="grid max-w-[430px] gap-2">
          <Image
            src={publicAssetPath(company.logoPath)}
            alt={`${company.displayName} Logo`}
            width={360}
            height={128}
            unoptimized
            priority
            style={{ width: "auto" }}
            className={`object-contain object-left ${
              isBannerLogo ? "h-[86px] w-[320px]" : "h-[82px] w-[360px]"
            }`}
          />
          <div className="leading-tight">
            <p className="text-[21px] font-black tracking-tight text-slate-950">
              {company.displayName}
            </p>
            <p className="text-[11px] font-bold text-slate-700">
              {company.fullLegalLine}
            </p>
            <p className="text-[12px] font-semibold text-slate-800">
              {company.street}, {company.postalCode} {company.city}
            </p>
            <p className="text-[12px] font-semibold text-slate-800">
              Tel. {company.phone} · {company.email}
            </p>
          </div>
        </div>
        <div className="min-w-[180px] rounded-sm border-2 border-slate-900 px-3 py-2 text-right text-[12px] font-semibold text-slate-950">
          <p className="text-[19px] font-black uppercase leading-6">{title}</p>
          <p className="mt-1">{number}</p>
          <p>{company.website}</p>
        </div>
      </div>
      <div className={`${compact ? "mt-4" : "mt-6"} grid grid-cols-[1fr_auto] gap-6`}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-700">
            Empfänger
          </p>
          <div className="mt-1 text-[13px] font-medium leading-5 text-slate-950">
            <p className="font-semibold">{job.customer.name}</p>
            <p>{job.customer.street}</p>
            <p>
              {job.customer.postalCode} {job.customer.city}
            </p>
          </div>
        </div>
        <div className="min-w-56 rounded-sm border border-slate-400 p-2 text-[12px] font-medium leading-5 text-slate-900">
          <p>
            <span className="text-slate-500">Telefon:</span>{" "}
            {job.customer.phone || "-"}
          </p>
          <p>
            <span className="text-slate-500">Mobil:</span>{" "}
            {job.customer.mobile || "-"}
          </p>
          <p>
            <span className="text-slate-500">E-Mail:</span>{" "}
            {job.customer.email || "-"}
          </p>
        </div>
      </div>
    </header>
  );
}
