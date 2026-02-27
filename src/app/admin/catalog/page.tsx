import { prisma } from "@/server/db/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createCatalogItemAction, updateCatalogItemAction } from "@/app/admin/catalog/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const categories = [
  { key: "furniture", label: "Möbel" },
  { key: "appliance", label: "Geräte" },
  { key: "boxes", label: "Kartons" },
  { key: "special", label: "Spezial" },
];

export default async function AdminCatalogPage() {
  let dbWarning: string | null = null;
  let items: Awaited<ReturnType<typeof prisma.catalogItem.findMany>> = [];

  try {
    items = await prisma.catalogItem.findMany({
      orderBy: [{ categoryKey: "asc" }, { sortOrder: "asc" }, { nameDe: "asc" }],
    });
  } catch (error) {
    console.error("[admin/catalog] failed to load catalog", error);
    dbWarning = "Katalogdaten konnten gerade nicht geladen werden. Bitte Datenbankverbindung prüfen.";
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
        <div className="text-xl font-extrabold text-white">Katalog</div>
        <div className="mt-2 text-sm font-semibold text-slate-200">
          Volumen (m³) und Arbeitszeit (Min./Stück) beeinflussen Schätzung, Preis und Slots.
        </div>
      </div>

      {dbWarning ? (
        <div className="rounded-xl border border-amber-300 bg-amber-100/95 px-4 py-3 text-sm font-semibold text-amber-900">
          {dbWarning}
        </div>
      ) : null}

      <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
        <div className="text-sm font-extrabold text-white">Neuer Artikel</div>
        <form action={createCatalogItemAction} className="mt-4 grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <div className="text-xs font-bold text-slate-200">Name (Deutsch)</div>
            <Input name="nameDe" placeholder="z.B. Sofa (2-Sitzer)" required className="border-2 border-slate-600 bg-slate-700 text-white placeholder:text-slate-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">Slug</div>
            <Input name="slug" placeholder="sofa-2" required className="border-2 border-slate-600 bg-slate-700 text-white placeholder:text-slate-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">Kategorie</div>
            <Select name="categoryKey" defaultValue="furniture" className="border-2 border-slate-600 bg-slate-700 text-white">
              {categories.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">m³</div>
            <Input name="defaultVolumeM3" type="number" step="0.01" defaultValue="0.5" required className="border-2 border-slate-600 bg-slate-700 text-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">Min/Stück</div>
            <Input name="laborMinutesPerUnit" type="number" step="1" defaultValue="10" required className="border-2 border-slate-600 bg-slate-700 text-white" />
          </div>

          <div className="md:col-span-6 flex flex-wrap items-center justify-between gap-3 pt-2">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Checkbox name="isHeavy" className="border-slate-600" /> Schwer
            </label>
            <Button type="submit">Erstellen</Button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-3xl border-2 border-slate-600 bg-slate-800 shadow-lg">
        <div className="overflow-auto">
          <table className="min-w-[1000px] w-full text-left text-sm">
            <thead className="border-b-2 border-slate-600 bg-slate-700 text-xs font-extrabold text-slate-100">
              <tr>
                <th className="px-4 py-3">Aktiv</th>
                <th className="px-4 py-3">Kategorie</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">m³</th>
                <th className="px-4 py-3">Min/Stück</th>
                <th className="px-4 py-3">Schwer</th>
                <th className="px-4 py-3">Sort</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-slate-600 hover:bg-slate-700/50">
                  <td className="px-4 py-3" colSpan={9}>
                    <form action={updateCatalogItemAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={it.id} />
                      <input type="hidden" name="slug" value={it.slug} />
                      <Checkbox name="active" defaultChecked={it.active} className="border-slate-500" />
                      <Select name="categoryKey" defaultValue={it.categoryKey} className="h-10 w-[140px] border-2 border-slate-600 bg-slate-700 text-white">
                        {categories.map((c) => (
                          <option key={c.key} value={c.key}>{c.label}</option>
                        ))}
                      </Select>
                      <Input name="nameDe" defaultValue={it.nameDe} className="h-10 w-[260px] border-2 border-slate-600 bg-slate-700 text-white" />
                      <Input name="slugReadOnly" defaultValue={it.slug} className="h-10 w-[160px] border-2 border-slate-600 bg-slate-700 text-slate-300" disabled />
                      <Input name="defaultVolumeM3" type="number" step="0.01" defaultValue={String(it.defaultVolumeM3)} className="h-10 w-[110px] border-2 border-slate-600 bg-slate-700 text-white" />
                      <Input name="laborMinutesPerUnit" type="number" step="1" defaultValue={String(it.laborMinutesPerUnit)} className="h-10 w-[110px] border-2 border-slate-600 bg-slate-700 text-white" />
                      <Checkbox name="isHeavy" defaultChecked={it.isHeavy} className="border-slate-500" />
                      <Input name="sortOrder" type="number" step="1" defaultValue={String(it.sortOrder)} className="h-10 w-[90px] border-2 border-slate-600 bg-slate-700 text-white" />
                      <Button type="submit" size="sm">Speichern</Button>
                    </form>
                  </td>
                </tr>
              ))}

              {items.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-semibold text-slate-300" colSpan={9}>
                    Keine Artikel vorhanden.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-amber-500 bg-amber-900/50 p-4 text-sm font-semibold text-amber-100">
        Hinweis: Änderungen wirken sofort auf neue Schätzungen und Buchungen.
      </div>
    </div>
  );
}

