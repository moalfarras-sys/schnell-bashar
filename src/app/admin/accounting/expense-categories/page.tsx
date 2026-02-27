"use client";

import { useEffect, useState } from "react";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Category = {
  id: string;
  nameDe: string;
  defaultVatRate: number | null;
  sortOrder: number;
  active: boolean;
};

export default function ExpenseCategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [nameDe, setNameDe] = useState("");
  const [vat, setVat] = useState("19");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/expense-categories", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Kategorien konnten nicht geladen werden.");
      setItems(json.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createItem() {
    setError(null);
    const res = await fetch("/api/admin/expense-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameDe: nameDe.trim(),
        defaultVatRate: vat.trim() ? Number(vat) : null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error || "Kategorie konnte nicht gespeichert werden.");
      return;
    }
    setNameDe("");
    setVat("19");
    await load();
  }

  return (
    <Container className="py-2">
      <h1 className="text-3xl font-bold text-slate-900">Ausgabenkategorien</h1>
      <p className="mt-2 text-slate-600">Kategorien für manuelle Betriebsausgaben verwalten.</p>

      <div className="mt-6 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Kategorie (z. B. Diesel)" value={nameDe} onChange={(e) => setNameDe(e.target.value)} />
          <Input placeholder="Standard-USt (%)" value={vat} onChange={(e) => setVat(e.target.value)} />
          <Button onClick={() => void createItem()}>Kategorie anlegen</Button>
        </div>
      </div>

      {error ? <div className="mt-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}

      <div className="mt-6 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
        {loading ? (
          <div className="text-sm text-slate-500">Lade Kategorien...</div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800">
                {item.nameDe} · USt {item.defaultVatRate ?? 0}% {item.active ? "" : "· Inaktiv"}
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}

