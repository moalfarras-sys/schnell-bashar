import { BookingWizard } from "@/app/(wizard)/buchen/wizard-client";
import { BookingFallbackForm } from "@/app/(wizard)/buchen/fallback-form";
import { Container } from "@/components/container";
import { loadBookingConfig } from "@/server/booking/load-booking-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BookingPage({
  searchParams,
}: {
  searchParams?: Promise<{ service?: string; context?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const requestedService = String(sp.service ?? "").toUpperCase();
  const requestedContext = String(sp.context ?? "").toUpperCase();
  const initialServiceType =
    requestedService === "DISPOSAL" || requestedService === "ENTSORGUNG"
      ? ("DISPOSAL" as const)
      : requestedService === "BOTH" || requestedService === "KOMBI"
        ? ("BOTH" as const)
        : ("MOVING" as const);
  const variant =
    requestedContext === "MONTAGE"
      ? ("montage" as const)
      : requestedContext === "ENTSORGUNG"
        ? ("entsorgung" as const)
        : requestedContext === "SPECIAL"
          ? ("special" as const)
        : ("default" as const);

  let config: Awaited<ReturnType<typeof loadBookingConfig>> = null;
  try {
    config = await loadBookingConfig();
  } catch {
    return (
      <BookingUnavailable reason="Das Buchungssystem ist kurzfristig nicht vollständig verfügbar (Datenbankverbindung)." />
    );
  }

  if (!config) {
    return <BookingUnavailable reason="Die Preis- und Katalogdaten sind aktuell nicht verfügbar." />;
  }

  return (
    <BookingWizard
      variant={variant}
      initialServiceType={
        variant === "entsorgung" ? "DISPOSAL" : variant === "special" ? "MOVING" : initialServiceType
      }
      catalog={config.catalog}
      pricing={config.pricing}
      modules={config.modules}
      promoRules={config.promoRules}
    />
  );
}

function BookingUnavailable(props: { reason: string }) {
  return (
    <Container className="py-14 sm:py-16">
      <div className="mx-auto max-w-4xl premium-surface rounded-3xl p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
          Buchung gerade eingeschränkt
        </h1>
        <p className="mt-3 text-sm font-semibold text-slate-700">
          {props.reason} Bitte senden Sie uns direkt eine Schnellanfrage - wir melden uns schnellstmöglich.
        </p>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
          Tipp: Alternativ erreichen Sie uns sofort unter{" "}
          <a className="font-extrabold text-brand-700 hover:underline" href="tel:+491729573681">
            +49 172 9573681
          </a>{" "}
          oder per WhatsApp.
        </div>
        <div className="mt-6">
          <BookingFallbackForm />
        </div>
      </div>
    </Container>
  );
}

