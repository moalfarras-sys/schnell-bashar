import { notFound } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { CheckCircle2, Download, Clock, AlertCircle, FileText } from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { AcceptButton } from "./accept-button";
import { offerDisplayNo } from "@/server/ids/document-number";

interface OfferPageProps {
  params: Promise<{ token: string }>;
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function speedLabel(speed?: string): string {
  if (speed === "ECONOMY") return "Günstig";
  if (speed === "EXPRESS") return "Express";
  return "Standard";
}

function serviceTypeLabel(type?: string): string {
  if (type === "ENTSORGUNG") return "Entsorgung";
  if (type === "KOMBI") return "Umzug + Entsorgung";
  return "Umzug";
}

export default async function OfferPage({ params }: OfferPageProps) {
  const { token } = await params;

  const offer = await prisma.offer.findUnique({
    where: { token },
    include: {
      order: {
        include: {
          lines: { include: { catalogItem: true } },
        },
      },
    },
  });

  if (!offer) {
    notFound();
  }

  const now = new Date();
  const isExpired = now > offer.expiresAt;
  const isAccepted = offer.status === "ACCEPTED";

  const wizardData = (offer.order?.wizardData as any) || {};
  const inquiry = wizardData?.inquiry || {};
  const services = offer.services as any[];
  const displayOfferNo = offerDisplayNo({
    offerNo: offer.offerNo,
    id: offer.id,
    orderNo: offer.order?.orderNo ?? null,
    orderPublicId: offer.order?.publicId ?? null,
  });

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-[color:var(--surface-elevated)] dark:from-slate-950 dark:to-slate-900">
      <Container className="py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">
              Ihr Umzugsangebot
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Angebotsnummer:{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {displayOfferNo}
              </span>
            </p>
          </div>

          {isExpired && (
            <div className="mb-6 rounded-xl border-2 border-red-200 bg-red-50 p-6 dark:border-red-500/30 dark:bg-red-950/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 shrink-0 text-red-600 dark:text-red-400" />
                <div>
                  <h3 className="font-bold text-red-900 dark:text-red-300">Angebot abgelaufen</h3>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                    Dieses Angebot ist am{" "}
                    {format(offer.expiresAt, "dd.MM.yyyy", { locale: de })} abgelaufen.
                    Bitte kontaktieren Sie uns für ein neues Angebot.
                  </p>
                  <div className="mt-4">
                    <a href="tel:+491729573681">
                      <Button variant="outline" size="sm">
                        Jetzt anrufen: +49 172 9573681
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isAccepted && (
            <div className="mb-6 rounded-xl border-2 border-green-200 bg-green-50 p-6 dark:border-green-500/30 dark:bg-green-950/30">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600 dark:text-green-400" />
                <div>
                  <h3 className="font-bold text-green-900 dark:text-green-300">Angebot angenommen</h3>
                  <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                    Sie haben dieses Angebot am{" "}
                    {offer.acceptedAt &&
                      format(offer.acceptedAt, "dd.MM.yyyy 'um' HH:mm 'Uhr'", {
                        locale: de,
                      })}{" "}
                    angenommen. Die Unterschrift erfolgt über DocuSign per E-Mail oder über den
                    bereitgestellten Signatur-Link.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isExpired && !isAccepted && (
            <div className="mb-6 rounded-xl border-2 border-blue-200 bg-blue-50 p-6 dark:border-blue-500/30 dark:bg-blue-950/30">
              <div className="flex items-start gap-3">
                <Clock className="h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="font-bold text-blue-900 dark:text-blue-300">Gültig bis</h3>
                  <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                    Dieses Angebot ist gültig bis zum{" "}
                    {format(offer.validUntil, "dd.MM.yyyy", { locale: de })}.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border-2 border-slate-200 bg-[color:var(--surface-elevated)] p-8 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/90">
            <div className="mb-6 border-b-2 border-slate-200 pb-6 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Kundeninformationen</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Name:</span>{" "}
                  <span className="text-slate-600 dark:text-slate-400">{offer.customerName}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">E-Mail:</span>{" "}
                  <span className="text-slate-600 dark:text-slate-400">{offer.customerEmail}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Telefon:</span>{" "}
                  <span className="text-slate-600 dark:text-slate-400">{offer.customerPhone}</span>
                </div>
                {offer.customerAddress && (
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Adresse:</span>{" "}
                    <span className="text-slate-600 dark:text-slate-400">{offer.customerAddress}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6 border-b-2 border-slate-200 pb-6 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Umzugsdetails</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                {offer.moveFrom && (
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Von:</span>{" "}
                    <span className="text-slate-600 dark:text-slate-400">{offer.moveFrom}</span>
                    {offer.floorFrom !== null && (
                      <span className="ml-1 text-slate-500 dark:text-slate-500">
                        ({offer.floorFrom}. Etage
                        {offer.elevatorFrom ? ", Aufzug" : ", kein Aufzug"})
                      </span>
                    )}
                  </div>
                )}
                {offer.moveTo && (
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Nach:</span>{" "}
                    <span className="text-slate-600 dark:text-slate-400">{offer.moveTo}</span>
                    {offer.floorTo !== null && (
                      <span className="ml-1 text-slate-500 dark:text-slate-500">
                        ({offer.floorTo}. Etage
                        {offer.elevatorTo ? ", Aufzug" : ", kein Aufzug"})
                      </span>
                    )}
                  </div>
                )}
                {offer.moveDate && (
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Termin:</span>{" "}
                    <span className="text-slate-600 dark:text-slate-400">
                      {format(offer.moveDate, "dd.MM.yyyy", { locale: de })}
                    </span>
                  </div>
                )}
                {inquiry.serviceType && (
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Leistungsart:</span>{" "}
                    <span className="text-slate-600 dark:text-slate-400">{serviceTypeLabel(inquiry.serviceType)}</span>
                  </div>
                )}
                {offer.order?.volumeM3 !== undefined && offer.order.volumeM3 > 0 && (
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Volumen:</span>{" "}
                    <span className="text-slate-600 dark:text-slate-400">{offer.order.volumeM3} m³</span>
                  </div>
                )}
                {offer.order?.speed && (
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Priorität:</span>{" "}
                    <span className="text-slate-600 dark:text-slate-400">{speedLabel(offer.order.speed)}</span>
                  </div>
                )}
                {inquiry.needNoParkingZone && (
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Halteverbotszone:</span>{" "}
                    <span className="text-slate-600 dark:text-slate-400">Ja, wird benötigt</span>
                  </div>
                )}
                {offer.notes && (
                  <div className="sm:col-span-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Hinweise:</span>{" "}
                    <span className="text-slate-600 dark:text-slate-400">{offer.notes}</span>
                  </div>
                )}
                {inquiry.addons && inquiry.addons.length > 0 && (
                  <div className="sm:col-span-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Zusatzleistungen:</span>{" "}
                    <span className="text-slate-600 dark:text-slate-400">{inquiry.addons.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6 border-b-2 border-slate-200 pb-6 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Leistungen</h2>
              <div className="mt-4">
                <ul className="space-y-2">
                  {services.map((service: any, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                      <span className="text-slate-700 dark:text-slate-300">
                        {service.name}
                        {service.quantity && (
                          <span className="ml-1 text-slate-500 dark:text-slate-500">
                            ({service.quantity} {service.unit || "x"})
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-6 dark:bg-slate-800/60">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Preisübersicht</h2>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">Nettobetrag:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatEuro(offer.netCents)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">MwSt. (19%):</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatEuro(offer.vatCents)}
                  </span>
                </div>
                <div className="border-t-2 border-slate-200 pt-3 dark:border-slate-700">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">Gesamtbetrag:</span>
                    <span className="text-lg font-bold text-green-700 dark:text-green-400">
                      {formatEuro(offer.grossCents)}
                    </span>
                  </div>
                </div>
                <div className="pt-1 text-xs text-slate-500 dark:text-slate-500">
                  Gültig bis {format(offer.validUntil, "dd.MM.yyyy", { locale: de })}
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={`/api/offers/${offer.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" size="lg" className="w-full gap-2">
                    <Download className="h-5 w-5" />
                    Angebot PDF herunterladen
                  </Button>
                </a>
                <a
                  href="/api/agb/pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" size="lg" className="w-full gap-2">
                    <FileText className="h-5 w-5" />
                    AGB herunterladen
                  </Button>
                </a>
              </div>

              {!isExpired && !isAccepted && (
                <AcceptButton offerId={offer.id} />
              )}
            </div>

            {!isExpired && !isAccepted && (
              <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
                <p>
                  <strong>Hinweis:</strong> Mit Klick auf &quot;Jetzt verbindlich beauftragen&quot;
                  nehmen Sie dieses Angebot verbindlich an. Danach öffnet sich direkt der
                  Signatur-Link. Zusätzlich senden wir denselben Link per E-Mail.
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
            <p>
              Bei Fragen erreichen Sie uns unter:{" "}
              <a href="tel:+491729573681" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
                +49 172 9573681
              </a>{" "}
              oder{" "}
              <a
                href="mailto:kontakt@schnellsicherumzug.de"
                className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
              >
                kontakt@schnellsicherumzug.de
              </a>
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}

