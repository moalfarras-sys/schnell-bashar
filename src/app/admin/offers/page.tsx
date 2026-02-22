import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
} from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { verifyAdminToken, adminCookieName } from "@/server/auth/admin-session";
import { Container } from "@/components/container";
import { OfferFilterBar, OfferActionButtons } from "./offer-actions";
import {
  contractDisplayNo,
  offerDisplayNo,
  orderDisplayNo,
} from "@/server/ids/document-number";

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function getStatusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
          <Clock className="h-3 w-3" />
          Ausstehend
        </span>
      );
    case "ACCEPTED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
          <CheckCircle2 className="h-3 w-3" />
          Angenommen
        </span>
      );
    case "EXPIRED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
          <XCircle className="h-3 w-3" />
          Abgelaufen
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
          <XCircle className="h-3 w-3" />
          Storniert
        </span>
      );
    default:
      return null;
  }
}

function getContractStatusBadge(status: string | null, provider: string | null) {
  if (!status) return null;

  switch (status) {
    case "PENDING_SIGNATURE":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
          <Clock className="h-3 w-3" />
          {provider === "INTERNAL"
            ? "Wartet auf Unterschrift (Intern)"
            : "Wartet auf Unterschrift (DocuSign)"}
        </span>
      );
    case "SIGNED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
          <CheckCircle2 className="h-3 w-3" />
          Unterschrieben
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
          <XCircle className="h-3 w-3" />
          Storniert
        </span>
      );
    default:
      return null;
  }
}

interface TimelineEvent {
  label: string;
  date: Date | null;
  color: "slate" | "blue" | "green";
}

function OfferTimeline({ events }: { events: TimelineEvent[] }) {
  const hasEvents = events.some((e) => e.date);
  if (!hasEvents) return null;

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex items-start gap-1">
        {events.map((event, i) => {
          const isActive = !!event.date;
          const dotColor = !isActive
            ? "bg-slate-200"
            : event.color === "green"
              ? "bg-green-500"
              : event.color === "blue"
                ? "bg-blue-500"
                : "bg-slate-400";

          return (
            <div key={i} className="flex flex-1 flex-col items-center text-center">
              <div className={`h-3 w-3 rounded-full ${dotColor}`} />
              {i < events.length - 1 && (
                <div
                  className={`my-1 h-0.5 w-full ${isActive ? "bg-slate-300" : "bg-slate-100"}`}
                />
              )}
              <span
                className={`mt-1 text-[10px] leading-tight ${isActive ? "font-medium text-slate-700" : "text-slate-400"}`}
              >
                {event.label}
              </span>
              {event.date && (
                <span className="text-[10px] text-slate-500">
                  {format(event.date, "dd.MM.yy HH:mm", { locale: de })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function AdminOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; sort?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;

  if (!token) {
    redirect("/admin/login");
  }

  try {
    await verifyAdminToken(token);
  } catch {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const statusFilter = params.status;
  const searchQuery = params.search;
  const sort = params.sort === "oldest" ? "oldest" : "newest";

  const where: Record<string, unknown> = {};

  if (statusFilter && statusFilter !== "all") {
    where.status = statusFilter.toUpperCase();
  }

  if (searchQuery) {
    where.OR = [
      { customerName: { contains: searchQuery, mode: "insensitive" } },
      { customerEmail: { contains: searchQuery, mode: "insensitive" } },
      { customerPhone: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  const offers = await prisma.offer.findMany({
    where,
    include: {
      order: true,
      contract: true,
    },
    orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" },
  });

  const stats = {
    total: offers.length,
    pending: offers.filter((o) => o.status === "PENDING").length,
    accepted: offers.filter((o) => o.status === "ACCEPTED").length,
    expired: offers.filter((o) => o.status === "EXPIRED").length,
    signed: offers.filter((o) => o.contract?.status === "SIGNED").length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Container className="py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Angebote & Verträge</h1>
          <p className="mt-2 text-slate-600">Verwalten Sie alle Angebote und Verträge</p>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-600">Gesamt</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</div>
          </div>
          <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-4 shadow-sm">
            <div className="text-sm font-semibold text-yellow-800">Ausstehend</div>
            <div className="mt-1 text-2xl font-bold text-yellow-900">{stats.pending}</div>
          </div>
          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 shadow-sm">
            <div className="text-sm font-semibold text-green-800">Angenommen</div>
            <div className="mt-1 text-2xl font-bold text-green-900">{stats.accepted}</div>
          </div>
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 shadow-sm">
            <div className="text-sm font-semibold text-blue-800">Unterschrieben</div>
            <div className="mt-1 text-2xl font-bold text-blue-900">{stats.signed}</div>
          </div>
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 shadow-sm">
            <div className="text-sm font-semibold text-red-800">Abgelaufen</div>
            <div className="mt-1 text-2xl font-bold text-red-900">{stats.expired}</div>
          </div>
        </div>

        <OfferFilterBar />
        <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
          Sortierung: <span className="font-semibold">{sort === "oldest" ? "Älteste zuerst" : "Neueste zuerst"}</span>
        </div>

        <div className="space-y-4">
          {offers.length === 0 ? (
            <div className="rounded-xl border-2 border-slate-200 bg-white p-12 text-center shadow-sm">
              <FileText className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Keine Angebote gefunden</h3>
              <p className="mt-2 text-sm text-slate-600">
                Es wurden keine Angebote mit den aktuellen Filtern gefunden.
              </p>
            </div>
          ) : (
            offers.map((offer) => {
              const displayOrderNo = offer.order ? orderDisplayNo(offer.order) : null;
              const displayOfferNo = offerDisplayNo({
                offerNo: offer.offerNo,
                id: offer.id,
                orderNo: offer.order?.orderNo ?? null,
                orderPublicId: offer.order?.publicId ?? null,
              });
              const displayContractNo = offer.contract
                ? contractDisplayNo({
                    contractNo: offer.contract.contractNo,
                    id: offer.contract.id,
                    orderNo: offer.order?.orderNo ?? null,
                    orderPublicId: offer.order?.publicId ?? null,
                  })
                : null;

              const timelineEvents: TimelineEvent[] = [
                {
                  label: "Angebot erstellt",
                  date: offer.createdAt,
                  color: "slate",
                },
                {
                  label: "Angenommen",
                  date: offer.acceptedAt,
                  color: "blue",
                },
                {
                  label: "Vertrag gesendet",
                  date:
                    offer.contract?.sentForSigningAt &&
                    (offer.contract?.signingUrl ||
                      offer.contract?.signatureProvider === "DOCUSIGN")
                      ? offer.contract.sentForSigningAt
                      : null,
                  color: "blue",
                },
                {
                  label: "Unterschrieben",
                  date: offer.contract?.signedAt ?? null,
                  color: "green",
                },
              ];

              return (
                <div
                  key={offer.id}
                  className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        {getStatusBadge(offer.status)}
                        {offer.contract &&
                          getContractStatusBadge(
                            offer.contract.status,
                            offer.contract.signatureProvider,
                          )}
                      </div>

                      <h3 className="text-lg font-bold text-slate-900">{offer.customerName}</h3>
                      <div className="mt-2 space-y-1 text-sm text-slate-600">
                        <div>
                          <span className="font-semibold">E-Mail:</span> {offer.customerEmail}
                        </div>
                        <div>
                          <span className="font-semibold">Telefon:</span> {offer.customerPhone}
                        </div>
                        <div>
                          <span className="font-semibold">Angebots-Nr.:</span> {displayOfferNo}
                        </div>
                        {displayOrderNo && (
                          <div>
                            <span className="font-semibold">Auftrags-Nr.:</span>{" "}
                            {displayOrderNo}
                          </div>
                        )}
                        {offer.contract && (
                          <div>
                            <span className="font-semibold">Vertrags-Nr.:</span>{" "}
                            {displayContractNo}
                          </div>
                        )}
                        <div>
                          <span className="font-semibold">Interne ID:</span> {offer.id}
                        </div>
                        {offer.moveFrom && offer.moveTo && (
                          <div>
                            <span className="font-semibold">Route:</span> {offer.moveFrom} →{" "}
                            {offer.moveTo}
                          </div>
                        )}
                        {offer.moveDate && (
                          <div>
                            <span className="font-semibold">Termin:</span>{" "}
                            {format(offer.moveDate, "dd.MM.yyyy", { locale: de })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 lg:items-end">
                      <div className="text-right">
                        <div className="text-sm text-slate-600">Gesamtbetrag</div>
                        <div className="text-2xl font-bold text-brand-600">
                          {formatEuro(offer.grossCents)}
                        </div>
                      </div>

                      <OfferActionButtons
                        offerId={offer.id}
                        offerNo={displayOfferNo}
                        offerToken={offer.token}
                        contractId={offer.contract?.id ?? null}
                        contractNo={displayContractNo}
                        contractPdfUrl={offer.contract?.contractPdfUrl ?? null}
                        signedPdfUrl={offer.contract?.signedPdfUrl ?? null}
                        auditTrailUrl={offer.contract?.auditTrailUrl ?? null}
                        contractStatus={offer.contract?.status ?? null}
                        signingUrl={offer.contract?.signingUrl ?? null}
                        signatureProvider={offer.contract?.signatureProvider ?? null}
                        orderNo={displayOrderNo}
                      />
                    </div>
                  </div>

                  <OfferTimeline events={timelineEvents} />
                </div>
              );
            })
          )}
        </div>
      </Container>
    </div>
  );
}
