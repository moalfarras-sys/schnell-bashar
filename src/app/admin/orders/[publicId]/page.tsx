import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";

import { prisma } from "@/server/db/prisma";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { HardDeleteButton } from "@/components/admin/hard-delete-button";
import { CreateOfferButton } from "@/components/admin/create-offer-button";
import {
  closeOrderAction,
  restoreOrderAction,
  softDeleteOrderAction,
  updateOrderStatusAction,
} from "@/app/admin/orders/[publicId]/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function eur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

type WizardLike = {
  startAddress?: { displayName?: string };
  destinationAddress?: { displayName?: string };
  pickupAddress?: { displayName?: string };
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const order = await prisma.order.findUnique({
    where: { publicId },
    include: {
      lines: { include: { catalogItem: true } },
      uploads: true,
      offer: { include: { contract: true } },
    },
  });

  if (!order) {
    return (
      <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
        <div className="text-xl font-extrabold text-white">Nicht gefunden</div>
        <div className="mt-2 text-sm text-slate-200">Dieser Auftrag wurde nicht gefunden.</div>
        <div className="mt-6">
          <Link href="/admin/orders">
            <Button variant="outline-light">Zurück</Button>
          </Link>
        </div>
      </div>
    );
  }

  const wizard = order.wizardData as WizardLike;
  const waText = encodeURIComponent(
    `Hallo! Wir haben Ihre Anfrage (${order.publicId}) erhalten. Kurze Rückfrage: ...`,
  );
  const waUrl = `https://wa.me/${String(order.customerPhone).replace(/[^\d]/g, "")}?text=${waText}`;

  const moveLines = order.lines.filter((l) => !l.isDisposal);
  const disposalLines = order.lines.filter((l) => l.isDisposal);

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-bold text-slate-200">Auftrags-ID</div>
            <div className="mt-1 text-2xl font-extrabold text-white">{order.orderNo || order.publicId}</div>
            <div className="mt-2 text-sm font-semibold text-slate-200">
              Erstellt: {formatInTimeZone(order.createdAt, "Europe/Berlin", "dd.MM.yyyy HH:mm")}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <a href={waUrl} target="_blank" rel="noreferrer">
              <Button>WhatsApp</Button>
            </a>
            <a href={`/api/orders/${order.publicId}/pdf`} target="_blank" rel="noreferrer">
              <Button variant="outline-light">PDF-Angebot</Button>
            </a>
            <a href={`mailto:${order.customerEmail}?subject=Angebot ${order.publicId}`}>
              <Button variant="outline-light">E-Mail an Kunden</Button>
            </a>
            <Link href="/admin/orders">
              <Button variant="outline-light">Zur Liste</Button>
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <InfoCard title="Leistung" value={`${order.serviceType} · ${order.speed}`} />
          <InfoCard
            title="Termin"
            value={`${formatInTimeZone(order.slotStart, "Europe/Berlin", "dd.MM HH:mm")} – ${formatInTimeZone(order.slotEnd, "Europe/Berlin", "HH:mm")}`}
          />
          <InfoCard title="Status" value={order.status} />
        </div>
      </div>

      <CreateOfferButton
        orderId={order.id}
        existingOffer={
          order.offer
            ? {
                id: order.offer.id,
                offerNo: order.offer.offerNo,
                status: order.offer.status,
                contract: order.offer.contract
                  ? { id: order.offer.contract.id, status: order.offer.contract.status }
                  : null,
              }
            : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
          <div className="text-sm font-extrabold text-white">Kunde</div>
          <div className="mt-4 grid gap-2 text-sm text-slate-200">
            <div>
              <span className="font-extrabold">Name:</span> {order.customerName}
            </div>
            <div>
              <span className="font-extrabold">Telefon:</span> {order.customerPhone}
            </div>
            <div>
              <span className="font-extrabold">E-Mail:</span> {order.customerEmail}
            </div>
            <div>
              <span className="font-extrabold">Kontakt:</span> {order.contactPreference}
            </div>
            {order.note ? (
              <div>
                <span className="font-extrabold">Notiz:</span> {order.note}
              </div>
            ) : null}
          </div>

          <div className="mt-6 text-sm font-extrabold text-white">Status ändern</div>
          <form action={updateOrderStatusAction} className="mt-3 flex items-center gap-2">
            <input type="hidden" name="publicId" value={order.publicId} />
            <Select
              name="status"
              defaultValue={order.status}
              className="max-w-[220px] border-2 border-slate-600 bg-slate-700 text-white"
            >
              <option value="NEW">NEW</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="DONE">DONE</option>
              <option value="CANCELLED">CANCELLED</option>
            </Select>
            <Button type="submit">Speichern</Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={closeOrderAction}>
              <input type="hidden" name="publicId" value={order.publicId} />
              <input type="hidden" name="closeAs" value="DONE" />
              <Button type="submit" size="sm" variant="outline-light">
                Auftrag schließen (DONE)
              </Button>
            </form>
            <form action={closeOrderAction}>
              <input type="hidden" name="publicId" value={order.publicId} />
              <input type="hidden" name="closeAs" value="CANCELLED" />
              <Button type="submit" size="sm" variant="outline-light">
                Auftrag stornieren
              </Button>
            </form>
            {order.deletedAt ? (
              <form action={restoreOrderAction}>
                <input type="hidden" name="publicId" value={order.publicId} />
                <Button type="submit" size="sm" variant="outline-light">
                  Wiederherstellen
                </Button>
              </form>
            ) : (
              <form action={softDeleteOrderAction}>
                <input type="hidden" name="publicId" value={order.publicId} />
                <Button type="submit" size="sm" variant="outline-light">
                  Löschen (Soft)
                </Button>
              </form>
            )}
            <HardDeleteButton
              endpoint={`/api/admin/orders/${encodeURIComponent(order.publicId)}/hard-delete`}
              entityLabel={`Auftrag ${order.orderNo || order.publicId}`}
              compact
            />
          </div>
        </div>

        <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
          <div className="text-sm font-extrabold text-white">Schätzung</div>
          <div className="mt-4 grid gap-2 text-sm text-slate-200">
            <div>
              <span className="font-extrabold">Volumen:</span> {order.volumeM3} m³
            </div>
            <div>
              <span className="font-extrabold">Arbeitszeit:</span> {order.laborHours} Std.
            </div>
            {order.distanceKm != null ? (
              <div>
                <span className="font-extrabold">Distanz:</span> {order.distanceKm} km
              </div>
            ) : null}
            <div>
              <span className="font-extrabold">Preisrahmen:</span> {eur(order.priceMinCents)} – {eur(order.priceMaxCents)}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
        <div className="text-sm font-extrabold text-white">Adressen</div>
        <div className="mt-4 grid gap-2 text-sm text-slate-200">
          {wizard?.startAddress?.displayName ? (
            <div>
              <span className="font-extrabold">Start:</span> {wizard.startAddress.displayName}
            </div>
          ) : null}
          {wizard?.destinationAddress?.displayName ? (
            <div>
              <span className="font-extrabold">Ziel:</span> {wizard.destinationAddress.displayName}
            </div>
          ) : null}
          {wizard?.pickupAddress?.displayName ? (
            <div>
              <span className="font-extrabold">Abholung:</span> {wizard.pickupAddress.displayName}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
        <div className="text-sm font-extrabold text-white">Gegenstände</div>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <LineGroup title="Umzug" lines={moveLines} />
          <LineGroup title="Entsorgung" lines={disposalLines} />
        </div>
      </div>

      {order.uploads.length ? (
        <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
          <div className="text-sm font-extrabold text-white">Hochgeladene Dateien</div>
          <ul className="mt-3 grid gap-2 text-sm text-slate-200">
            {order.uploads.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold">{u.fileName}</span>
                {u.filePath.startsWith("/") ? (
                  <a
                    className="font-extrabold text-brand-300 hover:underline"
                    href={u.filePath}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Öffnen
                  </a>
                ) : (
                  <span className="text-xs text-slate-300">{u.filePath}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function InfoCard(props: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border-2 border-slate-600 bg-slate-700/50 p-5">
      <div className="text-xs font-bold text-slate-200">{props.title}</div>
      <div className="mt-1 text-sm font-extrabold text-white">{props.value}</div>
    </div>
  );
}

type OrderLineLike = {
  id: string;
  qty: number;
  catalogItem?: { nameDe?: string | null } | null;
};

function LineGroup(props: { title: string; lines: OrderLineLike[] }) {
  return (
    <div>
      <div className="text-xs font-bold text-slate-200">{props.title}</div>
      {props.lines.length === 0 ? (
        <div className="mt-2 rounded-2xl bg-slate-700/50 p-4 text-sm text-slate-300">—</div>
      ) : (
        <ul className="mt-2 grid gap-1 text-sm text-slate-200">
          {props.lines.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3">
              <span className="truncate">{l.catalogItem?.nameDe ?? "-"}</span>
              <span className="font-extrabold">× {l.qty}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

