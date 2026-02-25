import { redirect } from "next/navigation";

import { requireAdminSession } from "@/server/auth/require-admin";
import { loadCalendarConfig } from "@/server/calendar/config-store";
import { CalendarAdminClient } from "./page-client";

export default async function AdminCalendarPage() {
  const auth = await requireAdminSession();
  if (!auth.ok) redirect("/admin?denied=1");

  const config = await loadCalendarConfig();
  return <CalendarAdminClient initial={config} />;
}
