import { permanentRedirect } from "next/navigation";

export default function AccountingLegacyRedirectPage() {
  permanentRedirect("/admin/accounting");
}

