import type { ReactNode } from "react";
import { Clock3, ShieldCheck, Sparkles } from "lucide-react";

import { Container } from "@/components/container";
import { cn } from "@/components/ui/cn";

export function BookingShell(props: {
  variant: "default" | "montage" | "entsorgung" | "special";
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <Container className="relative py-10 lg:py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] booking-bg-orbit" />
      <div className="booking-hero booking-motion-reveal mb-6 rounded-3xl px-6 py-6 sm:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="booking-hero-kicker">Smart Booking</div>
          <div className="booking-hero-kicker">Live Preislogik</div>
          <div className="booking-hero-kicker">3 klare Schritte</div>
        </div>
        <div className="mt-3 text-3xl font-black leading-tight text-[color:var(--booking-text-strong)] sm:text-5xl">
          Ihre Buchung. Klar, schnell, professionell.
        </div>
        <div className="mt-2 max-w-3xl text-sm font-semibold text-[color:var(--booking-text-muted)] sm:text-base">
          Wählen Sie Transport, Montage oder Entsorgung. Das System führt Sie strukturiert bis zur finalen Anfrage.
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="booking-value-chip">
            <Clock3 className="h-4 w-4" />
            <span>Antwort in kurzer Zeit</span>
          </div>
          <div className="booking-value-chip">
            <ShieldCheck className="h-4 w-4" />
            <span>Transparente Leistungen</span>
          </div>
          <div className="booking-value-chip">
            <Sparkles className="h-4 w-4" />
            <span>Smart geführter Ablauf</span>
          </div>
        </div>
      </div>

      {props.variant !== "default" ? (
        <div className="booking-glass-card mb-6 rounded-3xl px-5 py-4 text-sm text-[color:var(--booking-text-strong)]">
          {props.variant === "montage" ? (
            <>
              <div className="text-base font-extrabold">Montage-Buchung</div>
              <div className="mt-1 font-semibold">
                Dieser Ablauf ist fuer Moebelmontage optimiert. Die Leistung &quot;Moebel Demontage/Montage&quot; ist bereits enthalten.
              </div>
            </>
          ) : (
            <>
              <div className="text-base font-extrabold">Entsorgungs-Buchung</div>
              <div className="mt-1 font-semibold">
                Dieser Ablauf ist auf Sperrmuell und Entsorgung ausgelegt, inklusive Kategorien, Verbots-Check und Foto-Upload.
              </div>
            </>
          )}
        </div>
      ) : null}

      <div className={cn("grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]")}>
        <div className="space-y-4">{props.left}</div>
        {props.right}
      </div>
    </Container>
  );
}
