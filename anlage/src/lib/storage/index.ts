import "server-only";

import { calculateTotals } from "@/lib/calculations";
import { paymentNotice } from "@/lib/payment-notice";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  ensureLocalOutputFolders,
  getLocalCompanies,
  getLocalCompanyPrefix,
  getLocalCounters,
  getLocalCustomers,
  getLocalJobs,
  getLocalOutputPath,
  saveLocalCounters,
  saveLocalDocumentRecord,
  saveLocalJob
} from "@/lib/storage/localStorageAdapter";
import {
  getSupabaseCompanies,
  getSupabaseCounters,
  getSupabaseCustomers,
  getSupabaseJobs,
  saveSupabasePdfFile,
  saveSupabaseCounters,
  saveSupabaseDocumentRecord,
  saveSupabaseJob
} from "@/lib/storage/supabaseStorageAdapter";
import type { Company, Counters, DocumentRecord, DocumentType, Job } from "@/types/document";

type CompanyOverride = Omit<Partial<Company>, "brand"> & {
  brand?: Partial<Company["brand"]>;
};

const companyOverrides: Record<string, CompanyOverride> = {
  "punktlich-umzuege": {
    ownerName: "Baschar Al Hasan",
    fullLegalLine: "Pünktlich Umzüge - Inhaber: Baschar Al Hasan",
    iban: "DE75 1005 0000 0191 5325 76",
    bic: "BELADEBEXXX",
    bankName: "Berliner Sparkasse",
    accountHolder: "Baschar Al Hasan",
    vatId: "DE454603297",
    taxNumber: "DE454603297",
    financeOffice: "Pankow/Weißensee",
    logoPath: "/logo-punktlich-official.png",
    brand: {
      logoPath: "/logo-punktlich-official.png",
      footerText:
        "Pünktlich Umzüge · Achillesstraße 52 · 13125 Berlin · Berliner Sparkasse · IBAN: DE75 1005 0000 0191 5325 76",
      fullLegalLine: "Pünktlich Umzüge - Inhaber: Baschar Al Hasan"
    }
  },
  "schnell-sicher-umzug": {
    phone: "+49 172 9573681",
    vatId: "DE454603297",
    taxNumber: "DE454603297",
    financeOffice: "Pankow/Weißensee",
    iban: "DE75 1005 0000 0191 5325 76",
    bic: "BELADEBEXXX",
    bankName: "Berliner Sparkasse",
    accountHolder: "Baschar Al Hasan",
    fullLegalLine: "Bashar Transport - Inhaber: Baschar Al Hasan",
    brand: {
      footerText:
        "Schnell Sicher Umzug · Bashar Transport - Inhaber: Baschar Al Hasan · Anzengruber Straße 9 · 12043 Berlin · Berliner Sparkasse · IBAN: DE75 1005 0000 0191 5325 76",
      fullLegalLine: "Bashar Transport - Inhaber: Baschar Al Hasan"
    }
  }
};

function applyCompanyOverrides(company: Company): Company {
  const override = companyOverrides[company.companyId];

  if (!override) {
    return company;
  }

  const { brand, ...companyFields } = override;

  return {
    ...company,
    ...companyFields,
    brand: {
      ...company.brand,
      ...brand
    }
  };
}

export function isUsingSupabase() {
  return isSupabaseConfigured();
}

export function getOutputPath(...segments: string[]) {
  return getLocalOutputPath(...segments);
}

export async function ensureOutputFolders() {
  await ensureLocalOutputFolders();
}

export async function getCompanies() {
  try {
    if (isUsingSupabase()) {
      const companies = await getSupabaseCompanies();
      return companies.map(applyCompanyOverrides);
    }
  } catch (error) {
    console.error("[storage] Supabase getCompanies failed, falling back to local JSON:", error);
  }
  const companies = await getLocalCompanies();
  return companies.map(applyCompanyOverrides);
}

export async function getCompanyById(companyId: string) {
  const companies = await getCompanies();
  return companies.find((company) => company.companyId === companyId) ?? null;
}

export async function getCustomers() {
  try {
    if (isUsingSupabase()) {
      return await getSupabaseCustomers();
    }
  } catch (error) {
    console.error("[storage] Supabase getCustomers failed, falling back to local JSON:", error);
  }
  return getLocalCustomers();
}

export async function getJobs() {
  try {
    if (isUsingSupabase()) {
      return await getSupabaseJobs();
    }
  } catch (error) {
    console.error("[storage] Supabase getJobs failed, falling back to local JSON:", error);
  }
  return getLocalJobs();
}

export async function getJob(jobId: string) {
  const jobs = await getJobs();
  return jobs.find((job) => job.id === jobId) ?? null;
}

export async function saveJob(job: Job) {
  try {
    if (isUsingSupabase()) {
      return await saveSupabaseJob(job);
    }
  } catch (error) {
    console.error("[storage] Supabase saveJob failed, falling back to local JSON:", error);
  }
  return saveLocalJob(job);
}

export async function getCounters() {
  try {
    if (isUsingSupabase()) {
      return await getSupabaseCounters();
    }
  } catch (error) {
    console.error("[storage] Supabase getCounters failed, falling back to local JSON:", error);
  }
  return getLocalCounters();
}

export async function saveCounters(counters: Counters) {
  try {
    if (isUsingSupabase()) {
      return await saveSupabaseCounters(counters);
    }
  } catch (error) {
    console.error("[storage] Supabase saveCounters failed, falling back to local JSON:", error);
  }
  return saveLocalCounters(counters);
}

export async function saveDocumentRecord(record: DocumentRecord) {
  try {
    if (isUsingSupabase()) {
      return await saveSupabaseDocumentRecord(record);
    }
  } catch (error) {
    console.error("[storage] Supabase saveDocumentRecord failed, falling back to local JSON:", error);
  }
  return saveLocalDocumentRecord(record);
}

export async function savePdfFile({
  buffer,
  companySlug,
  fileName,
  folder
}: {
  buffer: Buffer;
  companySlug: string;
  fileName: string;
  folder: string;
}) {
  try {
    if (isUsingSupabase()) {
      return await saveSupabasePdfFile({
        buffer,
        companySlug,
        fileName,
        folder
      });
    }
  } catch (error) {
    console.error("[storage] Supabase savePdfFile failed:", error);
  }
  return null;
}

export async function getJobTemplate(companyId: string) {
  const jobs = await getJobs();
  const remoteTemplate =
    jobs.find((job) => job.companyId === companyId) ?? jobs[0];

  if (remoteTemplate) {
    return remoteTemplate;
  }

  const localJobs = await getLocalJobs();
  return localJobs.find((job) => job.companyId === companyId) ?? localJobs[0];
}

function documentNumber(companyId: string, type: DocumentType, year: number, value: number) {
  const prefix = getLocalCompanyPrefix(companyId);
  const serial = String(value).padStart(3, "0");

  if (type === "angebot") {
    return `ANG-${prefix}-${year}-${serial}`;
  }
  if (type === "vertrag") {
    return `VER-${prefix}-${year}-${serial}`;
  }
  return `RE-${prefix}-${year}-${serial}`;
}

function isoDateAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function createJobFromTemplate(template: Job, companyId: string) {
  const counters = await getCounters();
  const companyCounters = counters[companyId] ?? {
    offer: 0,
    invoice: 0,
    contract: 0,
    job: 0
  };
  const nextJob = companyCounters.job + 1;
  const year = new Date().getFullYear();
  const suffix = String(nextJob).padStart(3, "0");

  const job: Job = {
    id: `${companyId}-job-${suffix}`,
    companyId,
    status: "entwurf",
    jobType: template.jobType ?? "umzug",
    offerNumber: documentNumber(companyId, "angebot", year, companyCounters.offer + 1),
    invoiceNumber: documentNumber(companyId, "rechnung", year, companyCounters.invoice + 1),
    contractNumber: documentNumber(companyId, "vertrag", year, companyCounters.contract + 1),
    customer: {
      id: `${companyId}-customer-${suffix}`,
      companyId,
      name: "",
      street: "",
      postalCode: "",
      city: "",
      phone: "",
      mobile: "",
      email: "",
      notes: ""
    },
    moveOutAddress: {
      street: "",
      postalCode: "",
      city: "",
      floor: "",
      carryDistance: "",
      hasElevator: false
    },
    moveInAddress: {
      street: "",
      postalCode: "",
      city: "",
      floor: "",
      carryDistance: "",
      hasElevator: false
    },
    moveDate: isoDateAfter(0),
    moveTime: "08:00",
    distanceKm: 0,
    volumeCbm: 0,
    parkingPermit: false,
    paymentMethod: template.paymentMethod || "Überweisung",
    validUntil: isoDateAfter(14),
    invoiceDate: isoDateAfter(0),
    serviceDate: isoDateAfter(0),
    paymentDueDate: isoDateAfter(0),
    description: "",
    vatRate: template.vatRate ?? 0.19,
    items: [
      {
        id: `${companyId}-item-${suffix}-1`,
        description: "",
        unit: "Pauschal",
        quantity: 1,
        unitPriceCents: 0
      }
    ],
    notes: "",
    paymentAgreement: paymentNotice,
    bankChangeNotice: false
  };

  await saveJob(job);
  await saveCounters({
    ...counters,
    [companyId]: {
      job: nextJob,
      offer: companyCounters.offer + 1,
      invoice: companyCounters.invoice + 1,
      contract: companyCounters.contract + 1
    }
  });

  return job;
}

export function createDocumentRecord({
  company,
  documentType,
  filePath,
  job
}: {
  company: Company;
  documentType: DocumentType;
  filePath: string;
  job: Job;
}): DocumentRecord {
  const totals = calculateTotals(job.items);
  const documentNumberValue =
    documentType === "angebot"
      ? job.offerNumber
      : documentType === "vertrag"
        ? job.contractNumber
        : job.invoiceNumber;
  const now = new Date().toISOString();

  return {
    id: `${job.id}-${documentType}`,
    companyId: company.companyId,
    customerId: job.customer.name.trim() ? job.customer.id : "",
    jobId: job.id,
    documentType,
    documentNumber: documentNumberValue,
    documentDate: now.slice(0, 10),
    pdfPath: filePath,
    totalNetCents: totals.netCents,
    vatAmountCents: totals.vatCents,
    totalGrossCents: totals.grossCents,
    status: "erstellt",
    createdAt: now,
    updatedAt: now
  };
}
