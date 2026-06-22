import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase";
import type {
  Company,
  Counters,
  Customer,
  DocumentRecord,
  Job
} from "@/types/document";

type CompanyRow = {
  company_id: string;
  display_name: string;
  legal_name: string;
  owner_name: string | null;
  street: string;
  postal_code: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  vat_id: string;
  tax_number: string;
  finance_office: string;
  bank_name: string;
  account_holder: string;
  iban: string;
  bic: string;
  logo_path: string;
  brand_config: Company["brand"] & {
    fullLegalLine?: string;
    brandName?: string;
  };
};

type CustomerRow = {
  id: string;
  company_id: string;
  name: string;
  street: string;
  postal_code: string;
  city: string;
  email: string;
  phone: string;
  notes: string | null;
};

type JobRow = {
  id: string;
  company_id: string;
  customer_id: string;
  job_type: Job["jobType"];
  pickup_address: Job["moveOutAddress"];
  delivery_address: Job["moveInAddress"];
  service_date: string;
  description: string;
  items: Job["items"];
  price_net: number;
  vat_rate: number;
  price_gross: number;
  status: Job["status"];
  data: Job | null;
};

type CounterRow = {
  company_id: string;
  document_type: "offer" | "invoice" | "contract" | "job";
  year: number;
  current_number: number;
};

function companyFromRow(row: CompanyRow): Company {
  const brandName = row.brand_config.brandName ?? row.display_name;
  const fullLegalLine =
    row.brand_config.fullLegalLine ??
    `${row.legal_name}${row.owner_name ? ` – Inhaber: ${row.owner_name}` : ""}`;

  return {
    id: row.company_id,
    companyId: row.company_id,
    slug: row.company_id,
    name: row.display_name,
    displayName: row.display_name,
    brandName,
    legalName: row.legal_name,
    ownerName: row.owner_name ?? "",
    fullLegalLine,
    street: row.street,
    postalCode: row.postal_code,
    city: row.city,
    phone: row.phone,
    website: row.website,
    email: row.email,
    iban: row.iban,
    bic: row.bic,
    bankName: row.bank_name,
    accountHolder: row.account_holder,
    vatId: row.vat_id,
    taxNumber: row.tax_number,
    financeOffice: row.finance_office,
    logoPath: row.logo_path,
    brand: {
      ...row.brand_config,
      displayName: row.display_name,
      brandName,
      legalName: row.legal_name
    }
  };
}

function customerFromRow(row: CustomerRow): Customer {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    street: row.street,
    postalCode: row.postal_code,
    city: row.city,
    phone: row.phone,
    mobile: "",
    email: row.email,
    notes: row.notes ?? ""
  };
}

function hasCustomerData(customer: Customer) {
  return Boolean(
    customer.name.trim() ||
      customer.street.trim() ||
      customer.postalCode.trim() ||
      customer.city.trim() ||
      customer.email.trim() ||
      customer.phone.trim() ||
      customer.mobile.trim()
  );
}

export async function getSupabaseCompanies() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("display_name");

  if (error) {
    throw error;
  }

  return ((data ?? []) as CompanyRow[]).map(companyFromRow);
}

export async function getSupabaseCustomers() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at");

  if (error) {
    throw error;
  }

  return ((data ?? []) as CustomerRow[]).map(customerFromRow);
}

export async function getSupabaseJobs() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at");

  if (error) {
    throw error;
  }

  return ((data ?? []) as JobRow[]).map((row) => row.data).filter(Boolean) as Job[];
}

export async function saveSupabaseJob(job: Job) {
  const supabase = getSupabaseServerClient();
  const net = job.items.reduce(
    (sum, item) => sum + Math.round(item.quantity * item.unitPriceCents),
    0
  );
  const gross = net + Math.round(net * job.vatRate);

  const shouldSaveCustomer = hasCustomerData(job.customer);

  if (shouldSaveCustomer) {
    await upsertSupabaseCustomer(job.customer);
  }

  const { error } = await supabase.from("jobs").upsert({
    id: job.id,
    company_id: job.companyId,
    customer_id: shouldSaveCustomer ? job.customer.id : null,
    job_type: job.jobType,
    pickup_address: job.moveOutAddress,
    delivery_address: job.moveInAddress,
    service_date: job.serviceDate,
    description: job.description,
    items: job.items,
    price_net: net,
    vat_rate: job.vatRate,
    price_gross: gross,
    status: job.status,
    data: job
  });

  if (error) {
    throw error;
  }

  return job;
}

export async function upsertSupabaseCustomer(customer: Customer) {
  if (!hasCustomerData(customer)) {
    return;
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("customers").upsert({
    id: customer.id,
    company_id: customer.companyId,
    name: customer.name,
    street: customer.street,
    postal_code: customer.postalCode,
    city: customer.city,
    email: customer.email,
    phone: customer.phone || customer.mobile,
    notes: customer.notes
  });

  if (error) {
    throw error;
  }
}

export async function getSupabaseCounters() {
  const supabase = getSupabaseServerClient();
  const year = new Date().getFullYear();
  const { data, error } = await supabase
    .from("document_counters")
    .select("*")
    .eq("year", year);

  if (error) {
    throw error;
  }

  const counters: Counters = {};

  for (const row of (data ?? []) as CounterRow[]) {
    counters[row.company_id] ??= {
      offer: 0,
      invoice: 0,
      contract: 0,
      job: 0
    };
    if (row.document_type === "offer") {
      counters[row.company_id].offer = row.current_number;
    }
    if (row.document_type === "invoice") {
      counters[row.company_id].invoice = row.current_number;
    }
    if (row.document_type === "contract") {
      counters[row.company_id].contract = row.current_number;
    }
    if (row.document_type === "job") {
      counters[row.company_id].job = row.current_number;
    }
  }

  return counters;
}

export async function saveSupabaseCounters(counters: Counters) {
  const supabase = getSupabaseServerClient();
  const year = new Date().getFullYear();
  const rows = Object.entries(counters).flatMap(([companyId, counter]) => [
    { company_id: companyId, document_type: "offer", year, current_number: counter.offer },
    { company_id: companyId, document_type: "invoice", year, current_number: counter.invoice },
    { company_id: companyId, document_type: "contract", year, current_number: counter.contract },
    { company_id: companyId, document_type: "job", year, current_number: counter.job }
  ]);
  const { error } = await supabase
    .from("document_counters")
    .upsert(rows, { onConflict: "company_id,document_type,year" });

  if (error) {
    throw error;
  }
}

export async function saveSupabaseDocumentRecord(record: DocumentRecord) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("documents").upsert({
    id: record.id,
    company_id: record.companyId,
    customer_id: record.customerId || null,
    job_id: record.jobId,
    document_type: record.documentType,
    document_number: record.documentNumber,
    document_date: record.documentDate,
    pdf_path: record.pdfPath,
    total_net: record.totalNetCents,
    vat_amount: record.vatAmountCents,
    total_gross: record.totalGrossCents,
    status: record.status
  });

  if (error) {
    throw error;
  }
}

export async function saveSupabasePdfFile({
  buffer,
  fileName,
  folder,
  companySlug
}: {
  buffer: Buffer;
  fileName: string;
  folder: string;
  companySlug: string;
}) {
  const bucket = process.env.SUPABASE_PDF_BUCKET;

  if (!bucket) {
    return null;
  }

  const supabase = getSupabaseServerClient();
  const storagePath = `${companySlug}/${folder}/${fileName}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: true
    });

  if (error) {
    throw error;
  }

  return `supabase://${bucket}/${storagePath}`;
}
