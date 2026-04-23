import { DEFAULT_VAT_RATE } from "@/lib/documents/constants";
import type { DocumentLineItemInput } from "@/lib/documents/types";

export function roundCents(value: number) {
  return Math.round(value);
}

export function calculateVat(netCents: number, vatRate = DEFAULT_VAT_RATE) {
  return roundCents(netCents * (vatRate / 100));
}

export function calculateLineItem(input: {
  position: number;
  title: string;
  description?: string | null;
  quantity: number;
  unit?: string | null;
  unitPriceNetCents: number;
  vatRate?: number | null;
}): DocumentLineItemInput {
  const quantity = Number.isFinite(input.quantity) && input.quantity > 0 ? input.quantity : 1;
  const vatRate = input.vatRate ?? DEFAULT_VAT_RATE;
  const totalNetCents = roundCents(input.unitPriceNetCents * quantity);
  const totalGrossCents = totalNetCents + calculateVat(totalNetCents, vatRate);

  return {
    position: input.position,
    title: input.title,
    description: input.description ?? null,
    quantity,
    unit: input.unit?.trim() || "Pauschale",
    unitPriceNetCents: input.unitPriceNetCents,
    vatRate,
    totalNetCents,
    totalGrossCents,
  };
}

export function calculateTotals(lineItems: DocumentLineItemInput[]) {
  const subtotalCents = lineItems.reduce((sum, item) => sum + item.totalNetCents, 0);
  const grossCents = lineItems.reduce((sum, item) => sum + item.totalGrossCents, 0);
  const taxCents = grossCents - subtotalCents;

  return {
    subtotalCents,
    taxCents,
    grossCents,
  };
}
