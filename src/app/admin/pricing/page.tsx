import { prisma } from "@/server/db/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePricingAction } from "@/app/admin/pricing/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function eur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

export default async function AdminPricingPage() {
  let dbWarning: string | null = null;
  let pricing: Awaited<ReturnType<typeof prisma.pricingConfig.findFirst>> = null;

  try {
    pricing = await prisma.pricingConfig.findFirst({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    console.error("[admin/pricing] failed to load pricing", error);
    dbWarning = "Preisdaten konnten gerade nicht geladen werden. Bitte Datenbankverbindung prüfen.";
  }

  if (!pricing) {
    return (
      <div className="grid gap-4">
        {dbWarning ? (
          <div className="rounded-xl border border-amber-300 bg-amber-100/95 px-4 py-3 text-sm font-semibold text-amber-900">
            {dbWarning}
          </div>
        ) : null}
        <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
          <div className="text-xl font-extrabold text-white">Keine Preis-Konfiguration</div>
          <div className="mt-2 text-sm font-semibold text-slate-200">
            Bitte führen Sie Seed aus oder legen Sie eine Konfiguration an.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {dbWarning ? (
        <div className="rounded-xl border border-amber-300 bg-amber-100/95 px-4 py-3 text-sm font-semibold text-amber-900">
          {dbWarning}
        </div>
      ) : null}

      <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
        <div className="text-xl font-extrabold text-white">Preise</div>
        <div className="mt-2 text-sm font-semibold text-slate-200">
          Werte sind in Cent gespeichert (für Genauigkeit). Unten jeweils ein Euro-Hinweis.
        </div>
      </div>

      <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
        <form action={updatePricingAction} className="grid gap-6">
          <input type="hidden" name="id" value={pricing.id} />

          <Section title="Basis">
            <Grid>
              <Field name="movingBaseFeeCents" label="Umzug Basis (Cent)" defaultValue={pricing.movingBaseFeeCents} hint={eur(pricing.movingBaseFeeCents)} />
              <Field name="disposalBaseFeeCents" label="Entsorgung Basis (Cent)" defaultValue={pricing.disposalBaseFeeCents} hint={eur(pricing.disposalBaseFeeCents)} />
              <Field name="hourlyRateCents" label="Stundensatz (Cent)" defaultValue={pricing.hourlyRateCents} hint={eur(pricing.hourlyRateCents) + " / Std."} />
            </Grid>
          </Section>

          <Section title="Module Montage/Entsorgung">
            <Grid>
              <Field name="montageBaseFeeCents" label="Montage Basis (Cent)" defaultValue={pricing.montageBaseFeeCents} hint={eur(pricing.montageBaseFeeCents)} />
              <Field name="entsorgungBaseFeeCents" label="Entsorgung Modul Basis (Cent)" defaultValue={pricing.entsorgungBaseFeeCents} hint={eur(pricing.entsorgungBaseFeeCents)} />
              <Field name="montageMinimumOrderCents" label="Mindestauftrag Montage (Cent)" defaultValue={pricing.montageMinimumOrderCents} hint={eur(pricing.montageMinimumOrderCents)} />
              <Field name="entsorgungMinimumOrderCents" label="Mindestauftrag Entsorgung (Cent)" defaultValue={pricing.entsorgungMinimumOrderCents} hint={eur(pricing.entsorgungMinimumOrderCents)} />
            </Grid>
          </Section>

          <Section title="Variable Anteile">
            <Grid>
              <Field name="perM3MovingCents" label="Umzug pro m³ (Cent)" defaultValue={pricing.perM3MovingCents} hint={eur(pricing.perM3MovingCents) + " / m³"} />
              <Field name="perM3DisposalCents" label="Entsorgung pro m³ (Cent)" defaultValue={pricing.perM3DisposalCents} hint={eur(pricing.perM3DisposalCents) + " / m³"} />
              <Field name="perKmCents" label="Pro km (Cent)" defaultValue={pricing.perKmCents} hint={eur(pricing.perKmCents) + " / km"} />
              <Field name="heavyItemSurchargeCents" label="Zuschlag Schwer (Cent)" defaultValue={pricing.heavyItemSurchargeCents} hint={eur(pricing.heavyItemSurchargeCents) + " / Stück"} />
            </Grid>
          </Section>

          <Section title="Zugang / Zuschläge">
            <Grid>
              <Field name="stairsSurchargePerFloorCents" label="Treppen pro Etage (Cent)" defaultValue={pricing.stairsSurchargePerFloorCents} hint={eur(pricing.stairsSurchargePerFloorCents) + " / Etage"} />
              <Field name="carryDistanceSurchargePer25mCents" label="Trageweg pro 25m (Cent)" defaultValue={pricing.carryDistanceSurchargePer25mCents} hint={eur(pricing.carryDistanceSurchargePer25mCents) + " / 25m"} />
              <Field name="parkingSurchargeMediumCents" label="Parken Mittel (Cent)" defaultValue={pricing.parkingSurchargeMediumCents} hint={eur(pricing.parkingSurchargeMediumCents)} />
              <Field name="parkingSurchargeHardCents" label="Parken Schwer (Cent)" defaultValue={pricing.parkingSurchargeHardCents} hint={eur(pricing.parkingSurchargeHardCents)} />
              <Field name="elevatorDiscountSmallCents" label="Aufzug klein Rabatt (Cent)" defaultValue={pricing.elevatorDiscountSmallCents} hint={eur(pricing.elevatorDiscountSmallCents)} />
              <Field name="elevatorDiscountLargeCents" label="Aufzug groß Rabatt (Cent)" defaultValue={pricing.elevatorDiscountLargeCents} hint={eur(pricing.elevatorDiscountLargeCents)} />
            </Grid>
          </Section>

          <Section title="Priorität & Vorlaufzeit">
            <Grid>
              <Field name="economyMultiplier" label="Economy Multiplikator" defaultValue={pricing.economyMultiplier} step="0.01" />
              <Field name="standardMultiplier" label="Standard Multiplikator" defaultValue={pricing.standardMultiplier} step="0.01" />
              <Field name="expressMultiplier" label="Express Multiplikator" defaultValue={pricing.expressMultiplier} step="0.01" />
              <Field name="economyLeadDays" label="Economy Vorlauf (Tage)" defaultValue={pricing.economyLeadDays} step="1" />
              <Field name="standardLeadDays" label="Standard Vorlauf (Tage)" defaultValue={pricing.standardLeadDays} step="1" />
              <Field name="expressLeadDays" label="Express Vorlauf (Tage)" defaultValue={pricing.expressLeadDays} step="1" />
            </Grid>
            <Grid>
              <Field name="montageStandardMultiplier" label="Montage Standard Multiplikator" defaultValue={pricing.montageStandardMultiplier} step="0.01" />
              <Field name="montagePlusMultiplier" label="Montage Plus Multiplikator" defaultValue={pricing.montagePlusMultiplier} step="0.01" />
              <Field name="montagePremiumMultiplier" label="Montage Premium Multiplikator" defaultValue={pricing.montagePremiumMultiplier} step="0.01" />
              <Field name="entsorgungStandardMultiplier" label="Entsorgung Standard Multiplikator" defaultValue={pricing.entsorgungStandardMultiplier} step="0.01" />
              <Field name="entsorgungPlusMultiplier" label="Entsorgung Plus Multiplikator" defaultValue={pricing.entsorgungPlusMultiplier} step="0.01" />
              <Field name="entsorgungPremiumMultiplier" label="Entsorgung Premium Multiplikator" defaultValue={pricing.entsorgungPremiumMultiplier} step="0.01" />
            </Grid>
          </Section>

          <Section title="Preisrahmen">
            <Grid>
              <Field name="uncertaintyPercent" label="Unschärfe (%)" defaultValue={pricing.uncertaintyPercent} step="1" />
            </Grid>
          </Section>

          <div className="flex justify-end">
            <Button type="submit">Speichern</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-extrabold text-white">{props.title}</div>
      <div className="mt-4">{props.children}</div>
    </div>
  );
}

function Grid(props: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-3">{props.children}</div>;
}

function Field(props: {
  name: string;
  label: string;
  defaultValue: number;
  hint?: string;
  step?: string;
}) {
  return (
    <div>
      <div className="text-xs font-bold text-slate-200">{props.label}</div>
      <Input
        name={props.name}
        type="number"
        step={props.step ?? "1"}
        defaultValue={String(props.defaultValue)}
        className="border-2 border-slate-600 bg-slate-700 text-white"
      />
      {props.hint ? <div className="mt-1 text-xs font-semibold text-slate-300">{props.hint}</div> : null}
    </div>
  );
}
