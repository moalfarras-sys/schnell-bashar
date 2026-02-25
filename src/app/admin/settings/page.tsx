import { redirect } from "next/navigation";

import { requireAdminSession } from "@/server/auth/require-admin";
import { loadOperationalSettings } from "@/server/settings/operational-settings";
import { SettingsClient } from "./settings-client";

export default async function AdminSettingsPage() {
  const auth = await requireAdminSession();
  if (!auth.ok) redirect("/admin?denied=1");

  const settings = await loadOperationalSettings();
  return <SettingsClient initialSettings={settings} />;
}
