import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminToken, adminCookieName } from "@/server/auth/admin-session";
import { ManualOfferForm } from "./manual-offer-form";

export default async function NewManualOfferPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;

  if (!token) redirect("/admin/login");

  try {
    await verifyAdminToken(token);
  } catch {
    redirect("/admin/login");
  }

  return <ManualOfferForm />;
}
