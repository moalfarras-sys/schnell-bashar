import type { Company, Job, Customer } from "@/types/document";

export const activeCompanyId = "schnell-sicher-umzug";
export const allowedCompanyIds = ["schnell-sicher-umzug", "punktlich-umzuege"];

export function filterActiveCompanies(companies: Company[]) {
  return companies.filter((company) => allowedCompanyIds.includes(company.companyId));
}

export function filterActiveJobs(jobs: Job[]) {
  return jobs.filter((job) => allowedCompanyIds.includes(job.companyId));
}

export function filterActiveCustomers(customers: Customer[]) {
  return customers.filter((customer) => allowedCompanyIds.includes(customer.companyId));
}

export function isActiveCompanyJob(job: Job) {
  return allowedCompanyIds.includes(job.companyId);
}

export function isAllowedCompanyId(companyId: string) {
  return allowedCompanyIds.includes(companyId);
}

