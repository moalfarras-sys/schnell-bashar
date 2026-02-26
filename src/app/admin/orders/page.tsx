import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";

import { prisma } from "@/server/db/prisma";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { HardDeleteButton } from "@/components/admin/hard-delete-button";
import {
  restoreOrderAction,
  softDeleteOrderAction,
} from "@/app/admin/orders/[publicId]/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function eur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; deleted?: string; sort?: string; context?: string }>;
}) {
  const { status: statusParam, deleted, sort: sortParam, context: contextParam } = await searchParams;
  const status = (statusParam ?? "").toUpperCase();
  const context = (contextParam ?? "").toUpperCase();
  const sort = sortParam === "oldest" ? "oldest" : "newest";
  const showDeleted = deleted === "1";
  const where: Record<string, unknown> = {
    deletedAt: showDeleted ? { not: null } : null,
  };
  if (status) where.status = status;
  if (
    context === "MONTAGE" ||
    context === "ENTSORGUNG" ||
    context === "STANDARD" ||
    context === "SPECIAL"
  ) {
    where.wizardData = {
      path: ["bookingContext"],
      equals: context,
    };
  }

  let dbWarning: string | null = null;
  let orders: Array<any> = [];
  try {
    orders = await prisma.order.findMany({
      where,
        orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" },
        take: 200,
        select: {
        publicId: true,
        orderNo: true,
        createdAt: true,
        serviceType: true,
        speed: true,
        status: true,
          customerName: true,
          priceMinCents: true,
          priceMaxCents: true,
          slotStart: true,
          slotEnd: true,
          requestedDateFrom: true,
          requestedDateTo: true,
          preferredTimeWindow: true,
          wizardData: true,
          _count: {
            select: { serviceItems: true },
          },
        },
      });
  } catch (error) {
    console.error("[admin/orders] failed to load orders", error);
    dbWarning = "Aufträge konnten gerade nicht geladen werden. Bitte Datenbankverbindung prüfen.";
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xl font-extrabold text-white">Aufträge</div>
            <div className="mt-2 text-sm font-semibold text-slate-200">
              Letzte 200 Einträge. Klicken Sie auf eine Auftrags-ID für Details.
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link href="/admin/orders/export">
              <Button variant="outline-light" size="sm">
                CSV Export
              </Button>
            </Link>
            <form action="/admin/orders" method="get" className="flex items-center gap-2">
              <Select
                name="status"
                defaultValue={status || ""}
                className="h-10 border-2 border-slate-600 bg-slate-700 text-white"
              >
                <option value="">Alle</option>
                <option value="NEW">NEW</option>
                <option value="REQUESTED">REQUESTED</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="DONE">DONE</option>
                <option value="CANCELLED">CANCELLED</option>
              </Select>
              <Select
                name="context"
                defaultValue={context || ""}
                className="h-10 border-2 border-slate-600 bg-slate-700 text-white"
              >
                <option value="">Alle Bereiche</option>
                <option value="STANDARD">Standard</option>
                <option value="MONTAGE">Montage</option>
                <option value="ENTSORGUNG">Entsorgung</option>
                <option value="SPECIAL">Spezialservice</option>
              </Select>
              <Select
                name="sort"
                defaultValue={sort}
                className="h-10 border-2 border-slate-600 bg-slate-700 text-white"
              >
                <option value="newest">Neueste zuerst</option>
                <option value="oldest">Älteste zuerst</option>
              </Select>
              {showDeleted ? <input type="hidden" name="deleted" value="1" /> : null}
              <Button size="sm" type="submit">
                Filtern
              </Button>
            </form>
            <Link href={`/admin/orders${showDeleted ? "" : "?deleted=1"}`}>
              <Button size="sm" variant="outline-light">
                {showDeleted ? "Aktive anzeigen" : "Gelöschte anzeigen"}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-600 bg-slate-700/40 px-4 py-2 text-sm text-slate-200">
        Sortierung: <span className="font-extrabold">{sort === "oldest" ? "Älteste zuerst" : "Neueste zuerst"}</span>
      </div>

      {dbWarning ? (
        <div className="rounded-xl border border-amber-300 bg-amber-100/95 px-4 py-3 text-sm font-semibold text-amber-900">
          {dbWarning}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border-2 border-slate-600 bg-slate-800 shadow-lg">
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b-2 border-slate-600 bg-slate-700 text-xs font-extrabold text-slate-100">
              <tr>
                <th className="px-4 py-3">Auftrags-ID</th>
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3">Termin</th>
                <th className="px-4 py-3">Leistung</th>
                <th className="px-4 py-3">Kunde</th>
                <th className="px-4 py-3">Preisrahmen</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.publicId} className="border-t border-slate-600 hover:bg-slate-700/50">
                  <td className="px-4 py-3">
                    <Link
                      className="font-extrabold text-brand-300 hover:underline"
                      href={`/admin/orders/${o.publicId}`}
                    >
                      {o.orderNo ?? o.publicId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-200">
                    {formatInTimeZone(o.createdAt, "Europe/Berlin", "dd.MM.yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-3 text-slate-200">
                    {o.slotStart && o.slotEnd
                      ? `${formatInTimeZone(o.slotStart, "Europe/Berlin", "dd.MM HH:mm")}–${formatInTimeZone(o.slotEnd, "Europe/Berlin", "HH:mm")}`
                      : o.requestedDateFrom && o.requestedDateTo
                        ? `${formatInTimeZone(o.requestedDateFrom, "Europe/Berlin", "dd.MM")}–${formatInTimeZone(o.requestedDateTo, "Europe/Berlin", "dd.MM")} (angefragt)`
                        : "offen"}
                  </td>
                  <td className="px-4 py-3 text-slate-200">
                    {o.serviceType} · {o.speed}
                    {typeof o.wizardData === "object" &&
                    o.wizardData &&
                    "bookingContext" in o.wizardData &&
                    (o.wizardData.bookingContext === "MONTAGE" ||
                      o.wizardData.bookingContext === "ENTSORGUNG") ? (
                      <span className="ml-2 rounded-full border border-brand-300 bg-brand-500/20 px-2 py-0.5 text-[10px] font-extrabold text-brand-100">
                        {o.wizardData.bookingContext}
                      </span>
                    ) : null}
                    {typeof o.wizardData === "object" &&
                    o.wizardData &&
                    "packageTier" in o.wizardData &&
                    typeof o.wizardData.packageTier === "string" ? (
                      <span className="ml-2 rounded-full border border-cyan-300 bg-cyan-500/20 px-2 py-0.5 text-[10px] font-extrabold text-cyan-100">
                        Paket: {o.wizardData.packageTier}
                      </span>
                    ) : null}
                    {typeof o.wizardData === "object" &&
                    o.wizardData &&
                    "offerContext" in o.wizardData &&
                    o.wizardData.offerContext &&
                    typeof o.wizardData.offerContext === "object" &&
                    "appliedDiscountPercent" in o.wizardData.offerContext &&
                    typeof o.wizardData.offerContext.appliedDiscountPercent === "number" ? (
                      <span className="ml-2 rounded-full border border-emerald-300 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-100">
                        Rabatt: {o.wizardData.offerContext.appliedDiscountPercent}%
                      </span>
                    ) : null}
                    {o._count?.serviceItems ? (
                      <span className="ml-2 rounded-full border border-violet-300 bg-violet-500/20 px-2 py-0.5 text-[10px] font-extrabold text-violet-100">
                        Services: {o._count.serviceItems}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-200">{o.customerName}</td>
                  <td className="px-4 py-3 font-semibold text-white">
                    {eur(o.priceMinCents)} – {eur(o.priceMaxCents)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border-2 border-brand-400 bg-brand-600/30 px-2 py-1 text-xs font-extrabold text-brand-200">
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {showDeleted ? (
                        <form action={restoreOrderAction}>
                          <input type="hidden" name="publicId" value={o.publicId} />
                          <Button size="sm" variant="outline-light" type="submit">
                            Wiederherstellen
                          </Button>
                        </form>
                      ) : (
                        <form action={softDeleteOrderAction}>
                          <input type="hidden" name="publicId" value={o.publicId} />
                          <Button size="sm" variant="outline-light" type="submit">
                            Löschen
                          </Button>
                        </form>
                      )}

                      <HardDeleteButton
                        endpoint={`/api/admin/orders/${encodeURIComponent(o.publicId)}/hard-delete`}
                        entityLabel={`Auftrag ${o.orderNo ?? o.publicId}`}
                        compact
                      />
                    </div>
                  </td>
                </tr>
              ))}

              {orders.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-10 text-center text-sm font-semibold text-slate-300"
                    colSpan={8}
                  >
                    Keine Aufträge gefunden.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

