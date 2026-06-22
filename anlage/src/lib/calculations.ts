import type { LineItem, Totals } from "@/types/document";

const VAT_RATE = 0.19;

export function getLineTotalCents(item: LineItem) {
  return Math.round(item.quantity * item.unitPriceCents);
}

export function calculateTotals(items: LineItem[]): Totals {
  const netCents = items.reduce((sum, item) => sum + getLineTotalCents(item), 0);
  const vatCents = Math.round(netCents * VAT_RATE);

  return {
    netCents,
    vatCents,
    grossCents: netCents + vatCents
  };
}
