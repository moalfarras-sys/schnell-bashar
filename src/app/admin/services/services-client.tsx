"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw } from "lucide-react";

type ServiceOptionRow = {
  id: string;
  version: number;
  moduleId: string;
  code: string;
  nameDe: string;
  descriptionDe: string | null;
  pricingType: "FLAT" | "PER_UNIT" | "PER_M3" | "PER_HOUR";
  defaultPriceCents: number;
  defaultLaborMinutes: number;
  defaultVolumeM3: number;
  requiresQuantity: boolean;
  requiresPhoto: boolean;
  isHeavy: boolean;
  sortOrder: number;
  active: boolean;
};

type ServiceModuleRow = {
  id: string;
  version?: number;
  slug: "MONTAGE" | "ENTSORGUNG" | "SPECIAL";
  nameDe: string;
  descriptionDe: string | null;
  active: boolean;
  sortOrder: number;
  options: ServiceOptionRow[];
};

type PromoRuleRow = {
  id: string;
  version: number;
  code: string;
  moduleId: string | null;
  serviceTypeScope: "MOVING" | "DISPOSAL" | "BOTH" | null;
  discountType: "PERCENT" | "FLAT_CENTS";
  discountValue: number;
  minOrderCents: number;
  maxDiscountCents: number | null;
  validFrom: string | Date | null;
  validTo: string | Date | null;
  active: boolean;
};

function eur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function dtLocal(value?: string | Date | null) {
  if (!value) return "";
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  const hh = `${d.getHours()}`.padStart(2, "0");
  const mi = `${d.getMinutes()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function ServicesAdminClient(props: {
  initialModules: ServiceModuleRow[];
  initialPromoRules: PromoRuleRow[];
}) {
  const [modules, setModules] = useState<ServiceModuleRow[]>(props.initialModules);
  const [promoRules, setPromoRules] = useState<PromoRuleRow[]>(props.initialPromoRules);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newModuleSlug, setNewModuleSlug] = useState<"MONTAGE" | "ENTSORGUNG" | "SPECIAL">("MONTAGE");
  const [newModuleName, setNewModuleName] = useState("Montage");
  const [newModuleDescription, setNewModuleDescription] = useState("");
  const [newModuleSort, setNewModuleSort] = useState(10);

  const moduleById = useMemo(() => new Map(modules.map((m) => [m.id, m])), [modules]);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const [modulesRes, promoRes] = await Promise.all([
        fetch("/api/admin/service-modules", { cache: "no-store" }),
        fetch("/api/admin/promo-rules", { cache: "no-store" }),
      ]);
      if (!modulesRes.ok || !promoRes.ok) throw new Error("Daten konnten nicht geladen werden.");
      const modulesJson = (await modulesRes.json()) as { items: ServiceModuleRow[] };
      const promoJson = (await promoRes.json()) as { items: PromoRuleRow[] };
      setModules(modulesJson.items ?? []);
      setPromoRules(promoJson.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  async function createOrUpdateModule(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/service-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: newModuleSlug,
          nameDe: newModuleName,
          descriptionDe: newModuleDescription || null,
          sortOrder: Number(newModuleSort || 0),
        }),
      });
      if (!res.ok) throw new Error("Modul konnte nicht gespeichert werden.");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      setLoading(false);
    }
  }

  async function patchModule(id: string, data: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/service-modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      });
      if (!res.ok) throw new Error("Modul konnte nicht aktualisiert werden.");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      setLoading(false);
    }
  }

  async function createOption(moduleId: string, payload: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/service-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, ...payload }),
      });
      if (!res.ok) throw new Error("Service konnte nicht erstellt werden.");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      setLoading(false);
    }
  }

  async function patchOption(id: string, expectedVersion: number, payload: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/service-options", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, expectedVersion, ...payload }),
      });
      if (!res.ok) throw new Error("Service konnte nicht aktualisiert werden.");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      setLoading(false);
    }
  }

  async function createPromo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/promo-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: String(form.get("code") ?? ""),
          moduleId: String(form.get("moduleId") ?? "") || null,
          serviceTypeScope: String(form.get("serviceTypeScope") ?? "") || null,
          discountType: String(form.get("discountType") ?? "PERCENT"),
          discountValue: Number(form.get("discountValue") ?? 0),
          minOrderCents: Number(form.get("minOrderCents") ?? 0),
          maxDiscountCents: Number(form.get("maxDiscountCents") ?? 0) || null,
          validFrom: String(form.get("validFrom") ?? "") || null,
          validTo: String(form.get("validTo") ?? "") || null,
          active: true,
        }),
      });
      if (!res.ok) throw new Error("Promo-Regel konnte nicht erstellt werden.");
      e.currentTarget.reset();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setLoading(false);
    }
  }

  async function patchPromo(id: string, expectedVersion: number, payload: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/promo-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, expectedVersion, ...payload }),
      });
      if (!res.ok) throw new Error("Promo-Regel konnte nicht aktualisiert werden.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">Services & Promo-Regeln</h1>
            <p className="mt-1 text-sm text-slate-300">
              Montage/Entsorgung Services verwalten, Preise definieren und Angebotscodes steuern.
            </p>
          </div>
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Aktualisieren
          </button>
        </div>
        {error ? (
          <div className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300">
            {error}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-300">Service-Module</h2>
        <form onSubmit={createOrUpdateModule} className="grid gap-3 md:grid-cols-4">
          <select
            value={newModuleSlug}
            onChange={(e) => setNewModuleSlug(e.target.value as "MONTAGE" | "ENTSORGUNG" | "SPECIAL")}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
          >
            <option value="MONTAGE">MONTAGE</option>
            <option value="ENTSORGUNG">ENTSORGUNG</option>
            <option value="SPECIAL">SPECIAL</option>
          </select>
          <input
            value={newModuleName}
            onChange={(e) => setNewModuleName(e.target.value)}
            placeholder="Name (DE)"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
          />
          <input
            value={newModuleDescription}
            onChange={(e) => setNewModuleDescription(e.target.value)}
            placeholder="Beschreibung"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={newModuleSort}
              onChange={(e) => setNewModuleSort(Number(e.target.value))}
              className="w-28 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" /> Speichern
            </button>
          </div>
        </form>
      </section>

      {modules.map((module) => (
        <section key={module.id} className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-base font-bold text-white">
                {module.nameDe} <span className="text-xs text-slate-400">({module.slug})</span>
              </div>
              <div className="text-sm text-slate-300">{module.descriptionDe ?? "—"}</div>
            </div>
            <button
              type="button"
              onClick={() => patchModule(module.id, { active: !module.active })}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                module.active ? "bg-emerald-700/30 text-emerald-300" : "bg-slate-700 text-slate-300"
              }`}
            >
              {module.active ? "Aktiv" : "Inaktiv"}
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {module.options.map((option) => (
              <ServiceOptionEditor
                key={option.id}
                option={option}
                onSave={(id, payload) => patchOption(id, option.version, payload)}
              />
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/70 p-4">
            <CreateServiceOptionForm moduleId={module.id} onCreate={createOption} />
          </div>
        </section>
      ))}

      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-300">Promo-Regeln</h2>
        <form onSubmit={createPromo} className="grid gap-3 md:grid-cols-4">
          <input name="code" placeholder="Code (z.B. MONTAGE10)" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white" />
          <select name="moduleId" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white">
            <option value="">Alle Module</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>{m.slug}</option>
            ))}
          </select>
          <select name="serviceTypeScope" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white">
            <option value="">Alle ServiceTypes</option>
            <option value="MOVING">MOVING</option>
            <option value="DISPOSAL">DISPOSAL</option>
            <option value="BOTH">BOTH</option>
          </select>
          <select name="discountType" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white">
            <option value="PERCENT">PERCENT</option>
            <option value="FLAT_CENTS">FLAT_CENTS</option>
          </select>
          <input name="discountValue" type="number" min={1} placeholder="Discount Value" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white" />
          <input name="minOrderCents" type="number" min={0} placeholder="Min Order (Cent)" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white" />
          <input name="maxDiscountCents" type="number" min={0} placeholder="Max Discount (Cent)" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white" />
          <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500">
            Regel anlegen
          </button>
        </form>

        <div className="mt-4 grid gap-3">
          {promoRules.map((rule) => (
            <div key={rule.id} className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-bold text-white">{rule.code}</div>
                <button
                  type="button"
                  onClick={() => patchPromo(rule.id, rule.version, { active: !rule.active })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    rule.active ? "bg-emerald-700/30 text-emerald-300" : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {rule.active ? "Aktiv" : "Inaktiv"}
                </button>
              </div>
              <div className="mt-2 text-xs text-slate-300">
                Modul: {rule.moduleId ? moduleById.get(rule.moduleId)?.slug ?? "—" : "Alle"} · Scope:{" "}
                {rule.serviceTypeScope ?? "Alle"} · Typ: {rule.discountType} · Wert: {rule.discountValue}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Mindestwert: {eur(rule.minOrderCents)} · Max Rabatt:{" "}
                {rule.maxDiscountCents != null ? eur(rule.maxDiscountCents) : "—"} · Von:{" "}
                {rule.validFrom ? new Date(rule.validFrom).toLocaleString("de-DE") : "—"} · Bis:{" "}
                {rule.validTo ? new Date(rule.validTo).toLocaleString("de-DE") : "—"}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <input
                  type="datetime-local"
                  defaultValue={dtLocal(rule.validFrom)}
                  onBlur={(e) => patchPromo(rule.id, rule.version, { validFrom: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white"
                />
                <input
                  type="datetime-local"
                  defaultValue={dtLocal(rule.validTo)}
                  onBlur={(e) => patchPromo(rule.id, rule.version, { validTo: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white"
                />
                <input
                  type="number"
                  min={0}
                  defaultValue={rule.minOrderCents}
                  onBlur={(e) => patchPromo(rule.id, rule.version, { minOrderCents: Number(e.target.value || 0) })}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white"
                />
                <input
                  type="number"
                  min={1}
                  defaultValue={rule.discountValue}
                  onBlur={(e) => patchPromo(rule.id, rule.version, { discountValue: Number(e.target.value || 1) })}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CreateServiceOptionForm(props: {
  moduleId: string;
  onCreate: (moduleId: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <form
      className="grid gap-2 md:grid-cols-6"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        await props.onCreate(props.moduleId, {
          code: String(form.get("code") ?? "").toUpperCase(),
          nameDe: String(form.get("nameDe") ?? ""),
          descriptionDe: String(form.get("descriptionDe") ?? "") || null,
          pricingType: String(form.get("pricingType") ?? "PER_UNIT"),
          defaultPriceCents: Number(form.get("defaultPriceCents") ?? 0),
          defaultLaborMinutes: Number(form.get("defaultLaborMinutes") ?? 0),
          defaultVolumeM3: Number(form.get("defaultVolumeM3") ?? 0),
          requiresQuantity: String(form.get("requiresQuantity") ?? "") === "on",
          requiresPhoto: String(form.get("requiresPhoto") ?? "") === "on",
          isHeavy: String(form.get("isHeavy") ?? "") === "on",
          sortOrder: Number(form.get("sortOrder") ?? 0),
        });
        e.currentTarget.reset();
      }}
    >
      <input name="code" placeholder="CODE" className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white" />
      <input name="nameDe" placeholder="Service Name" className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white" />
      <select name="pricingType" className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white">
        <option value="FLAT">FLAT</option>
        <option value="PER_UNIT">PER_UNIT</option>
        <option value="PER_M3">PER_M3</option>
        <option value="PER_HOUR">PER_HOUR</option>
      </select>
      <input name="defaultPriceCents" type="number" min={0} placeholder="Preis Cent" className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white" />
      <input name="defaultLaborMinutes" type="number" min={0} placeholder="Minuten" className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white" />
      <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500">+ Service</button>
      <input name="descriptionDe" placeholder="Beschreibung" className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white" />
      <input name="defaultVolumeM3" type="number" min={0} step="0.1" placeholder="Volumen m3" className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white" />
      <input name="sortOrder" type="number" min={0} placeholder="Sort" className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white" />
      <label className="flex items-center gap-2 text-xs text-slate-300"><input name="requiresQuantity" type="checkbox" defaultChecked />Menge</label>
      <label className="flex items-center gap-2 text-xs text-slate-300"><input name="requiresPhoto" type="checkbox" />Foto</label>
      <label className="flex items-center gap-2 text-xs text-slate-300"><input name="isHeavy" type="checkbox" />Schwer</label>
    </form>
  );
}

function ServiceOptionEditor(props: {
  option: ServiceOptionRow;
  onSave: (id: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [name, setName] = useState(props.option.nameDe);
  const [price, setPrice] = useState(props.option.defaultPriceCents);
  const [minutes, setMinutes] = useState(props.option.defaultLaborMinutes);
  const [sortOrder, setSortOrder] = useState(props.option.sortOrder);
  const [active, setActive] = useState(props.option.active);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
      <div className="text-xs font-bold text-slate-400">{props.option.code}</div>
      <div className="mt-2 grid gap-2 md:grid-cols-6">
        <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white md:col-span-2" />
        <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white" />
        <input type="number" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white" />
        <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white" />
        <button
          type="button"
          onClick={() => props.onSave(props.option.id, { nameDe: name, defaultPriceCents: price, defaultLaborMinutes: minutes, sortOrder, active })}
          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500"
        >
          Speichern
        </button>
      </div>
      <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-300">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => {
            const next = e.target.checked;
            setActive(next);
            props.onSave(props.option.id, { active: next });
          }}
        />
        Aktiv
      </label>
    </div>
  );
}

