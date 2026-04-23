export function formatGermanDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatGermanCurrency(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function formatPhone(raw: string | null | undefined) {
  if (!raw) return "";
  return raw.trim();
}

export function formatAddress(raw: string | null | undefined) {
  if (!raw) return "";
  return raw.trim();
}
