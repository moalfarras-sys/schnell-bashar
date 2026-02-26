import type { ReactNode } from "react";

import { Container } from "@/components/container";
import { cn } from "@/components/ui/cn";

export function BookingShell(props: {
  variant: "default" | "montage" | "entsorgung" | "special";
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <Container className="relative py-10 lg:py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] booking-bg-orbit" />
      <div className="booking-hero booking-motion-reveal mb-6 rounded-3xl px-6 py-6 sm:px-8">
        <div className="booking-hero-kicker">Angebot in Echtzeit</div>
        <div className="mt-2 text-3xl font-black leading-tight text-[color:var(--booking-text-strong)] sm:text-4xl">
          Jetzt buchen mit klaren Schritten.
        </div>
        <div className="mt-2 max-w-2xl text-sm font-semibold text-[color:var(--booking-text-muted)] sm:text-base">
          Service waehlen, Adressen eintragen, Details bestaetigen. Die Live-Schaetzung aktualisiert sich sofort.
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

      <div className={cn("grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]")}>
        <div className="space-y-4">{props.left}</div>
        {props.right}
      </div>
    </Container>
  );
}
