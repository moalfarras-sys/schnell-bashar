import { getLineTotalCents } from "@/lib/calculations";
import { formatCurrency, formatNumber } from "@/lib/number-format";
import type { LineItem } from "@/types/document";

export function ItemsTable({
  items,
  compact = false
}: {
  items: LineItem[];
  compact?: boolean;
}) {
  return (
    <table
      className={`print-table ${compact ? "mt-3 text-[10.5px]" : "mt-5 text-[12px]"} font-medium text-slate-950`}
    >
      <thead>
        <tr className="border border-slate-800 bg-slate-900 text-left text-[10px] font-black uppercase tracking-wide text-white">
          <th className={`${compact ? "py-1.5" : "py-2"} border-r border-slate-600 pl-2 pr-2`}>Beschreibung</th>
          <th className="border-r border-slate-600 px-2 text-right">Einheit</th>
          <th className="border-r border-slate-600 px-2 text-right">Menge</th>
          <th className="border-r border-slate-600 px-2 text-right">Einzelpreis</th>
          <th className={`${compact ? "py-1.5" : "py-2"} pl-2 pr-2 text-right`}>Gesamt</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-x border-b border-slate-500 align-top">
            <td className={`${compact ? "py-1.5" : "py-2"} border-r border-slate-300 pl-2 pr-2`}>{item.description}</td>
            <td className={`${compact ? "py-1.5" : "py-2"} border-r border-slate-300 px-2 text-right`}>{item.unit}</td>
            <td className={`${compact ? "py-1.5" : "py-2"} border-r border-slate-300 px-2 text-right`}>
              {formatNumber(item.quantity)}
            </td>
            <td className={`${compact ? "py-1.5" : "py-2"} border-r border-slate-300 px-2 text-right`}>
              {formatCurrency(item.unitPriceCents)}
            </td>
            <td className={`${compact ? "py-1.5" : "py-2"} pl-2 pr-2 text-right font-black`}>
              {formatCurrency(getLineTotalCents(item))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
