import { permanentRedirect } from "next/navigation";

export default function AccountingInvoicesLegacyRedirectPage() {
  permanentRedirect("/admin/accounting/invoices");
}

