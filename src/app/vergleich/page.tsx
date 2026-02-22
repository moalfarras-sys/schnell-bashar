import Link from "next/link";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

const rows = [
  { label: "Vorlaufzeit", economy: "länger", standard: "mittel", express: "kurz" },
  { label: "Preisniveau", economy: "niedrig", standard: "ausgewogen", express: "hoch" },
  { label: "Verfügbarkeit", economy: "hoch", standard: "hoch", express: "begrenzt" },
  { label: "Ideal für", economy: "planbare Umzüge", standard: "die meisten Fälle", express: "dringende Aufträge" },
];

export const metadata = { title: "Vergleich" };

export default function VergleichPage() {
  return (
    <Container className="py-14">
      <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">Paketvergleich</h1>
      <p className="mt-3 text-sm text-slate-800 dark:text-slate-200">
        Günstig, Standard oder Express? Vergleichen Sie Leistungen und wählen Sie passend zu Ihrem Zeitplan.
      </p>

      <div className="glass-card-solid mt-8 overflow-x-auto rounded-3xl border-2 border-slate-300 p-4 shadow-md dark:border-slate-700 dark:bg-slate-900/80">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-800 dark:text-slate-200">
              <th className="px-3 py-2 font-bold">Merkmal</th>
              <th className="px-3 py-2 font-bold">Günstig</th>
              <th className="px-3 py-2 font-bold">Standard</th>
              <th className="px-3 py-2 font-bold">Express</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t-2 border-slate-200 dark:border-slate-700">
                <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">{row.label}</td>
                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.economy}</td>
                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.standard}</td>
                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.express}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <Link href="/preise">
          <Button size="lg">Jetzt passende Option wählen</Button>
        </Link>
      </div>
    </Container>
  );
}
