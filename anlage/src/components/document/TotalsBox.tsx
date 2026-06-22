import { calculateTotals } from "@/lib/calculations";
import { formatCurrency } from "@/lib/number-format";
import type { LineItem } from "@/types/document";

export function TotalsBox({
  items,
  compact = false
}: {
  items: LineItem[];
  compact?: boolean;
}) {
  const totals = calculateTotals(items);

  return (
    <section
      className={`print-section ml-auto ${compact ? "mt-3 w-64 text-[11.5px]" : "mt-4 w-72 text-[12.5px]"} rounded-sm border-2 border-slate-900 font-bold text-slate-950`}
    >
      <div className="flex justify-between border-b border-slate-500 px-3 py-1.5">
        <span>Netto</span>
        <strong>{formatCurrency(totals.netCents)}</strong>
      </div>
      <div className="flex justify-between border-b border-slate-500 px-3 py-1.5">
        <span>19% MwSt</span>
        <strong>{formatCurrency(totals.vatCents)}</strong>
      </div>
      <div className="flex justify-between bg-[#f26b21] px-3 py-2 text-[15px] text-white">
        <span>Brutto</span>
        <strong>{formatCurrency(totals.grossCents)}</strong>
      </div>
    </section>
  );
}
