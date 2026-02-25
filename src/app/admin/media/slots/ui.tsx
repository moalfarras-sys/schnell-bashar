"use client";

import { useMemo, useState } from "react";

type Asset = {
  id: string;
  filename: string;
  path: string;
  alt: string | null;
  variants?: Array<{
    id: string;
    kind: "hero" | "gallery" | "thumbnail" | "custom";
    path: string;
  }>;
};

type SlotItem = {
  registry: {
    key: string;
    defaultPath: string;
    discoveredFrom: string;
    usageType: string;
  };
  slot: {
    key: string;
    assetId: string | null;
    value: string | null;
    alt: string | null;
    asset?: Asset | null;
  } | null;
};

export function ImageSlotsManagerClient({
  initialSlots,
  assets,
}: {
  initialSlots: SlotItem[];
  assets: Asset[];
}) {
  const [slots, setSlots] = useState(initialSlots);
  const [query, setQuery] = useState("");
  const [usageFilter, setUsageFilter] = useState<string>("all");
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const usageTypes = useMemo(
    () => ["all", ...Array.from(new Set(slots.map((item) => item.registry.usageType))).sort()],
    [slots],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return slots.filter((item) => {
      if (usageFilter !== "all" && item.registry.usageType !== usageFilter) return false;
      if (!q) return true;
      return [item.registry.key, item.registry.defaultPath, item.registry.discoveredFrom]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [query, usageFilter, slots]);

  const grouped = useMemo(() => {
    const map = new Map<string, SlotItem[]>();
    for (const item of filtered) {
      const group = item.registry.discoveredFrom || "unknown";
      const bucket = map.get(group) ?? [];
      bucket.push(item);
      map.set(group, bucket);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  async function patchSlot(key: string, payload: { assetId?: string | null; value?: string | null; alt?: string | null }) {
    const res = await fetch("/api/admin/media/slots", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, ...payload }),
    });
    if (!res.ok) throw new Error("Speichern fehlgeschlagen");

    setSlots((prev) =>
      prev.map((item) => {
        if (item.registry.key !== key) return item;
        const nextAssetId = payload.assetId === undefined ? item.slot?.assetId ?? null : payload.assetId;
        return {
          ...item,
          slot: {
            key,
            assetId: nextAssetId,
            value: payload.value === undefined ? item.slot?.value ?? null : payload.value,
            alt: payload.alt === undefined ? item.slot?.alt ?? null : payload.alt,
            asset: nextAssetId ? assets.find((entry) => entry.id === nextAssetId) ?? null : null,
          },
        };
      }),
    );
  }

  async function syncSlots() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/media/slots/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync fehlgeschlagen");
      setMessage(`Scan & Sync erfolgreich abgeschlossen.\n${String(data.output ?? "").trim()}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sync fehlgeschlagen");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
        <h1 className="text-2xl font-extrabold text-white">Image Slots Manager</h1>
        <p className="mt-1 text-sm text-slate-300">Alle entdeckten Bild-Slots gruppiert nach Quell-Datei.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-5 md:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Suche Slot Key / Pfad / Datei..."
          className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
        <button
          type="button"
          className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          onClick={syncSlots}
          disabled={syncing}
        >
          {syncing ? "Sync..." : "Scan & Sync"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {usageTypes.map((usage) => (
          <button
            key={usage}
            type="button"
            onClick={() => setUsageFilter(usage)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              usageFilter === usage
                ? "bg-sky-500 text-white"
                : "border border-slate-600 bg-slate-900 text-slate-300"
            }`}
          >
            {usage}
          </button>
        ))}
      </div>
      {message ? <p className="whitespace-pre-wrap text-sm text-slate-200">{message}</p> : null}

      <div className="grid gap-4">
        {grouped.map(([source, items]) => (
          <section key={source} className="grid gap-3">
            <div className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-2 text-xs font-bold text-slate-200">
              {source} ({items.length})
            </div>
            {items.map((item) => {
              const currentSrc = item.slot?.asset?.path ?? item.slot?.value ?? item.registry.defaultPath;
              const currentAlt = item.slot?.alt ?? item.slot?.asset?.alt ?? "";
              return (
                <article key={item.registry.key} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                  <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                    <div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentSrc}
                        alt={currentAlt || item.registry.key}
                        className="h-36 w-full rounded-lg border border-slate-700 object-cover"
                      />
                    </div>
                    <div className="grid gap-3">
                      <div className="text-xs text-slate-300">
                        <div className="font-bold text-slate-100">{item.registry.key}</div>
                        <div className="mt-1 break-all">Default: {item.registry.defaultPath}</div>
                        <div className="mt-1">Usage: {item.registry.usageType}</div>
                      </div>

                      <div className="grid gap-2 md:grid-cols-3">
                        <select
                          className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs text-slate-100"
                          value={item.slot?.assetId ? `asset:${item.slot.assetId}` : item.slot?.value ? `path:${item.slot.value}` : ""}
                          onChange={(event) => {
                            const next = event.target.value || "";
                            if (!next) {
                              patchSlot(item.registry.key, { assetId: null, value: item.registry.defaultPath });
                              return;
                            }
                            if (next.startsWith("asset:")) {
                              const assetId = next.replace("asset:", "");
                              patchSlot(item.registry.key, { assetId, value: null });
                              return;
                            }
                            if (next.startsWith("path:")) {
                              const p = next.replace("path:", "");
                              patchSlot(item.registry.key, { assetId: null, value: p });
                            }
                          }}
                        >
                          <option value="">Use default path</option>
                          {assets.map((asset) => (
                            <option key={asset.id} value={`asset:${asset.id}`}>
                              {asset.filename}
                            </option>
                          ))}
                          {assets.flatMap((asset) =>
                            (asset.variants ?? []).map((variant) => (
                              <option key={`${asset.id}-${variant.id}`} value={`path:${variant.path}`}>
                                {asset.filename} ({variant.kind})
                              </option>
                            )),
                          )}
                        </select>
                        <input
                          defaultValue={item.slot?.value ?? item.registry.defaultPath}
                          onBlur={(event) => {
                            if (item.slot?.assetId) return;
                            patchSlot(item.registry.key, {
                              value: event.target.value.trim() || item.registry.defaultPath,
                            });
                          }}
                          className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs text-slate-100"
                        />
                        <input
                          defaultValue={currentAlt}
                          onBlur={(event) =>
                            patchSlot(item.registry.key, { alt: event.target.value.trim() || null })
                          }
                          placeholder="Alt text"
                          className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
