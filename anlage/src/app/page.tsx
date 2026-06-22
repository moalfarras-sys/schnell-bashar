import { DocumentWorkspace } from "@/components/DocumentWorkspace";
import { requireAdminPage } from "@/lib/auth-guard";
import { getCompanies, getCustomers, getJobs } from "@/lib/storage";
import {
  filterActiveCompanies,
  filterActiveCustomers,
  filterActiveJobs
} from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function Home() {
  await requireAdminPage();

  const [companies, jobs, customers] = await Promise.all([
    getCompanies(),
    getJobs(),
    getCustomers()
  ]);
  const activeCompanies = filterActiveCompanies(companies);
  const activeJobs = filterActiveJobs(jobs);

  return (
    <DocumentWorkspace
      companies={activeCompanies}
      initialJobs={activeJobs}
      initialCustomers={filterActiveCustomers(customers)}
    />
  );
}
