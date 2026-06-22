export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(cents / 100);
}

export function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

export function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits
  }).format(value);
}

export function centsFromEuroInput(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);

  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function euroInputFromCents(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}
