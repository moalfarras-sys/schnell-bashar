import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  Company,
  Counters,
  Customer,
  DocumentRecord,
  Job
} from "@/types/document";

const dataDir = path.join(process.cwd(), "src", "data");
const outputDir = process.env.VERCEL
  ? path.join("/tmp", "output")
  : path.join(process.cwd(), "output");

async function readJson<T>(fileName: string): Promise<T> {
  const filePath = path.join(dataDir, fileName);
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content) as T;
}

async function writeJson<T>(fileName: string, data: T) {
  const filePath = path.join(dataDir, fileName);
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

export function getLocalOutputPath(...segments: string[]) {
  return path.join(outputDir, ...segments);
}

export async function ensureLocalOutputFolders() {
  const companies = await getLocalCompanies();
  await Promise.all(
    companies.flatMap((company) => [
      fs.mkdir(getLocalOutputPath(company.slug, "angebote"), { recursive: true }),
      fs.mkdir(getLocalOutputPath(company.slug, "vertraege"), { recursive: true }),
      fs.mkdir(getLocalOutputPath(company.slug, "rechnungen"), { recursive: true })
    ])
  );
}

export function getLocalCompanyPrefix(companyId: string) {
  if (companyId === "punktlich-umzuege") {
    return "PU";
  }
  if (companyId === "schnell-sicher-umzug") {
    return "SSU";
  }
  return companyId
    .split("-")
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 3);
}

export async function getLocalCompanies() {
  return readJson<Company[]>("companies.json");
}

export async function getLocalCustomers() {
  return readJson<Customer[]>("customers.json");
}

export async function getLocalJobs() {
  return readJson<Job[]>("jobs.json");
}

export async function getLocalCounters() {
  return readJson<Counters>("counters.json");
}

export async function saveLocalCounters(counters: Counters) {
  await writeJson("counters.json", counters);
}

export async function saveLocalJob(job: Job) {
  const jobs = await getLocalJobs();
  const index = jobs.findIndex((storedJob) => storedJob.id === job.id);

  if (index === -1) {
    jobs.push(job);
  } else {
    jobs[index] = job;
  }

  await writeJson("jobs.json", jobs);
  await upsertLocalCustomer(job.customer);
  return job;
}

export async function upsertLocalCustomer(customer: Customer) {
  const customers = await getLocalCustomers();
  const index = customers.findIndex((storedCustomer) => storedCustomer.id === customer.id);

  if (index === -1) {
    customers.push(customer);
  } else {
    customers[index] = customer;
  }

  await writeJson("customers.json", customers);
}

export async function saveLocalDocumentRecord(record: DocumentRecord) {
  let records: DocumentRecord[] = [];

  try {
    records = await readJson<DocumentRecord[]>("documents.json");
  } catch {
    records = [];
  }

  const index = records.findIndex((document) => document.id === record.id);

  if (index === -1) {
    records.push(record);
  } else {
    records[index] = record;
  }

  await writeJson("documents.json", records);
}
