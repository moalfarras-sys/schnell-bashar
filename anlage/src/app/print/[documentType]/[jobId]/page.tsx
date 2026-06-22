import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth-guard";
import { getCompanyById, getJob } from "@/lib/storage";
import { isActiveCompanyJob } from "@/lib/tenant";
import {
  ContractDocument,
  OfferDocument
} from "@/templates/angebot/OfferDocument";
import { InvoiceDocument } from "@/templates/rechnung/InvoiceDocument";
import type { DocumentType } from "@/types/document";

export const dynamic = "force-dynamic";

export default async function PrintPage({
  params
}: {
  params: Promise<{ documentType: DocumentType; jobId: string }>;
}) {
  await requireAdminPage();

  const { documentType, jobId } = await params;
  const job = await getJob(jobId);

  if (
    !job ||
    !isActiveCompanyJob(job) ||
    !["angebot", "vertrag", "rechnung"].includes(documentType)
  ) {
    notFound();
  }

  const company = await getCompanyById(job.companyId);

  if (!company) {
    notFound();
  }

  return (
    <main className="print-root flex min-h-screen justify-center bg-white">
      <div className="print-document">
      {documentType === "angebot" ? (
        <OfferDocument company={company} job={job} />
      ) : documentType === "vertrag" ? (
        <ContractDocument company={company} job={job} />
      ) : (
        <InvoiceDocument company={company} job={job} />
      )}
      </div>
    </main>
  );
}
