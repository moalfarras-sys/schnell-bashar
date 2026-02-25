import { formatInTimeZone } from "date-fns-tz";

export type PreferredTimeWindow = "MORNING" | "AFTERNOON" | "EVENING" | "FLEXIBLE";

export function preferredTimeWindowLabel(value?: string | null) {
  if (value === "MORNING") return "Vormittag";
  if (value === "AFTERNOON") return "Nachmittag";
  if (value === "EVENING") return "Abend";
  return "Flexibel";
}

export function formatRequestedWindow(
  requestedDateFrom?: Date | null,
  requestedDateTo?: Date | null,
  preferredTimeWindow?: string | null,
) {
  if (!requestedDateFrom || !requestedDateTo) return null;
  return `${formatInTimeZone(requestedDateFrom, "Europe/Berlin", "dd.MM.yyyy")} bis ${formatInTimeZone(requestedDateTo, "Europe/Berlin", "dd.MM.yyyy")} (${preferredTimeWindowLabel(preferredTimeWindow)})`;
}

export function formatScheduledWindow(slotStart?: Date | null, slotEnd?: Date | null) {
  if (!slotStart || !slotEnd) return null;
  return `${formatInTimeZone(slotStart, "Europe/Berlin", "dd.MM.yyyy HH:mm")} - ${formatInTimeZone(slotEnd, "Europe/Berlin", "HH:mm")}`;
}

