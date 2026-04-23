import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminManualContractPage() {
  redirect("/admin/dokumente/neu");
}
