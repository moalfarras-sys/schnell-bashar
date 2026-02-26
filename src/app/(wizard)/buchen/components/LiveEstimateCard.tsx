import Link from "next/link";

import { FieldHint } from "@/app/(wizard)/buchen/components/FieldHint";
import { CircleAlert } from "lucide-react";
import { formatNumberDE } from "@/lib/format-number";

export function LiveEstimateCard(props: {
  packageLabel: string;
  offerCode?: string | null;
  promoMatched?: boolean;
  volumeM3: number;
  laborHours: number;
  priceMin: string;
  priceMax: string;
  distanceKm: number | null | undefined;
  distanceSourceLabel: string;
  driveChargeCents: number;
  driveChargeLabel: string;
  routeLoading: boolean;
  routeError: string | null;
}) {
  return (
    <aside className="booking-glass-card booking-motion-reveal hidden h-fit rounded-3xl p-6 lg:sticky lg:top-24 lg:block">
      <div className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--booking-text-muted)]">Live-Schaetzung</div>
      <div className="mt-1 text-2xl font-black text-[color:var(--booking-text-strong)]">
        {props.priceMin} - {props.priceMax}
      </div>

      <div className="mt-4 grid gap-3">
        <div className="booking-live-kpi">
          <div className="booking-live-kpi-label">Paket</div>
          <div className="booking-live-kpi-value">{props.packageLabel}</div>
          {props.offerCode ? (
            <div className="mt-1 text-xs font-semibold text-[color:var(--booking-text-muted)]">
              Code: {props.offerCode}
            </div>
          ) : null}
          {props.offerCode ? (
            <div className="mt-2">
              <FieldHint tone={props.promoMatched ? "success" : "warning"} text={props.promoMatched ? "Code aktiv" : "Code nicht aktiv"} />
            </div>
          ) : null}
        </div>

        <div className="booking-live-kpi">
          <div className="booking-live-kpi-label">Volumen</div>
          <div className="booking-live-kpi-value">{formatNumberDE(props.volumeM3)} m3</div>
        </div>

        <div className="booking-live-kpi">
          <div className="booking-live-kpi-label">Arbeitszeit</div>
          <div className="booking-live-kpi-value">{formatNumberDE(props.laborHours)} Std.</div>
        </div>

        <div className="booking-live-kpi booking-live-kpi-highlight">
          <div className="booking-live-kpi-label">Distanz</div>
          <div className="booking-live-kpi-value">
            {props.distanceKm != null ? `${formatNumberDE(props.distanceKm)} km` : "-"}
          </div>
          <div className="mt-1 text-xs font-semibold text-[color:var(--booking-text-muted)]">
            Quelle: {props.distanceSourceLabel}
          </div>
          {props.driveChargeCents > 0 ? (
            <div className="mt-1 text-xs font-semibold text-[color:var(--booking-text-muted)]">
              Fahrkosten: {props.driveChargeLabel}
            </div>
          ) : null}
          {props.routeLoading ? (
            <div className="mt-2 h-7 animate-pulse rounded-lg border border-slate-300/70 bg-slate-100/80 dark:border-slate-700 dark:bg-slate-800/80" />
          ) : null}
          {props.routeError ? (
            <div className="mt-2">
              <FieldHint tone="warning" text={props.routeError} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <FieldHint tone="info" text="Preise sind Schaetzwerte bis zur finalen Pruefung." />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-300/70 bg-[color:var(--booking-glass-bg-2)] p-4">
        <div className="flex items-start gap-2">
          <CircleAlert className="mt-0.5 h-4 w-4 text-brand-700 dark:text-brand-300" />
          <div className="text-xs font-semibold text-[color:var(--booking-text-muted)]">
            Bitte erfassen Sie nur relevante Angaben. Fuer Sonderfaelle nutzen Sie das Notizfeld.
          </div>
        </div>
      </div>

      <div className="mt-5 text-xs font-semibold text-[color:var(--booking-text-muted)]">
        Fragen?{" "}
        <Link className="font-bold text-brand-700 hover:underline dark:text-brand-300" href="/kontakt">
          Kontakt
        </Link>
      </div>
    </aside>
  );
}
