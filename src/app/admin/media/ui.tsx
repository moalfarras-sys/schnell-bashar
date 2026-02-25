"use client";

import { useMemo, useState, useCallback } from "react";

type VariantKind = "hero" | "gallery" | "thumbnail" | "custom";

type AssetVariant = {
  id: string;
  kind: VariantKind;
  path: string;
  width: number | null;
  height: number | null;
  mimeType: string;
  sizeBytes: number;
};

type Asset = {
  id: string;
  filename: string;
  path: string;
  alt: string | null;
  title: string | null;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  variants?: AssetVariant[];
};

const aspectOptions = [
  { value: "16:9", label: "16:9" },
  { value: "4:3", label: "4:3" },
  { value: "1:1", label: "1:1" },
  { value: "free", label: "Free" },
] as const;

export function MediaLibraryClient({ initialAssets }: { initialAssets: Asset[] }) {
  const [assets, setAssets] = useState(initialAssets);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const [cropId, setCropId] = useState<string | null>(null);
  const [cropAspect, setCropAspect] = useState<"16:9" | "4:3" | "1:1" | "free">("16:9");
  const [cropKind, setCropKind] = useState<VariantKind>("hero");
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropW, setCropW] = useState(1);
  const [cropH, setCropH] = useState(1);
  const [cropSaving, setCropSaving] = useState(false);
  const [previewPathByAsset, setPreviewPathByAsset] = useState<Record<string, string>>({});

  const startEditing = useCallback((asset: Asset) => {
    setEditingId(asset.id);
    setEditAlt(asset.alt ?? "");
    setEditTitle(asset.title ?? "");
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
  }, []);

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alt: editAlt, title: editTitle }),
      });
      if (!res.ok) throw new Error("Update fehlgeschlagen");
      setAssets((prev) =>
        prev.map((a) => (a.id === id ? { ...a, alt: editAlt || null, title: editTitle || null } : a)),
      );
      setEditingId(null);
    } catch {
      setError("Update fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return assets;
    const q = query.toLowerCase();
    return assets.filter((asset) =>
      [asset.filename, asset.path, asset.alt ?? "", asset.title ?? "", ...(asset.variants?.map((v) => v.path) ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [assets, query]);

  async function onUpload(formData: FormData) {
    setUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/media", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload fehlgeschlagen");
      setAssets((prev) => [data.asset as Asset, ...prev]);
      (document.getElementById("admin-media-upload-form") as HTMLFormElement | null)?.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(id: string) {
    const res = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setAssets((prev) => prev.filter((entry) => entry.id !== id));
  }

  async function saveCrop(assetId: string) {
    setCropSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/media/${assetId}/crop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: cropKind,
          aspect: cropAspect,
          x: cropX,
          y: cropY,
          width: cropW,
          height: cropH,
          quality: 84,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Zuschneiden fehlgeschlagen");
      const variant = data.variant as AssetVariant;
      setAssets((prev) =>
        prev.map((asset) => {
          if (asset.id !== assetId) return asset;
          const old = asset.variants ?? [];
          const next = variant.kind === "custom" ? [variant, ...old] : [variant, ...old.filter((v) => v.kind !== variant.kind)];
          return { ...asset, variants: next };
        }),
      );
      setPreviewPathByAsset((prev) => ({ ...prev, [assetId]: variant.path }));
      setCropId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Zuschneiden fehlgeschlagen");
    } finally {
      setCropSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
        <h1 className="text-2xl font-extrabold text-white">Media Library</h1>
        <p className="mt-1 text-sm text-slate-300">Upload, bearbeiten, zuschneiden und verwalten.</p>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
        <form
          id="admin-media-upload-form"
          className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
          action={async (fd) => onUpload(fd)}
        >
          <input
            name="file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
            className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200"
          />
          <input
            name="alt"
            placeholder="Alt-Text"
            className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="title"
            placeholder="Titel"
            className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            disabled={uploading}
            className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
        {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Suche nach Dateiname/Pfad/Alt..."
          className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((asset) => {
          const selectedPreview = previewPathByAsset[asset.id] || asset.path;
          return (
            <article key={asset.id} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPreview}
                alt={asset.alt ?? asset.title ?? asset.filename}
                className="h-40 w-full rounded-lg border border-slate-700 object-cover"
              />

              {asset.variants && asset.variants.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {asset.variants.map((variant) => (
                    <button
                      type="button"
                      key={variant.id}
                      onClick={() => setPreviewPathByAsset((prev) => ({ ...prev, [asset.id]: variant.path }))}
                      className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] font-bold text-slate-300"
                    >
                      {variant.kind}
                    </button>
                  ))}
                </div>
              )}

              {editingId === asset.id ? (
                <div className="mt-3 grid gap-2">
                  <input
                    value={editAlt}
                    onChange={(e) => setEditAlt(e.target.value)}
                    placeholder="Alt-Text"
                    className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-slate-100"
                  />
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Titel"
                    className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-slate-100"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => saveEdit(asset.id)}
                      className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                    >
                      {saving ? "..." : "Speichern"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-xs text-slate-300">
                  <div className="font-bold text-slate-100">{asset.filename}</div>
                  <div className="mt-1 break-all">{asset.path}</div>
                  {asset.alt && <div className="mt-1 text-slate-400">Alt: {asset.alt}</div>}
                  {asset.title && <div className="mt-0.5 text-slate-400">Titel: {asset.title}</div>}
                  <div className="mt-1">
                    {asset.width ?? "?"}x{asset.height ?? "?"} • {(asset.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              )}

              {cropId === asset.id && (
                <div className="mt-3 rounded-xl border border-slate-700 bg-slate-800/80 p-3 text-xs text-slate-200">
                  <div className="grid gap-2">
                    <label className="font-semibold">Preset</label>
                    <select
                      value={cropAspect}
                      onChange={(e) => setCropAspect(e.target.value as "16:9" | "4:3" | "1:1" | "free")}
                      className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1"
                    >
                      {aspectOptions.map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>

                    <label className="font-semibold">Variante</label>
                    <select
                      value={cropKind}
                      onChange={(e) => setCropKind(e.target.value as VariantKind)}
                      className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1"
                    >
                      <option value="hero">Hero</option>
                      <option value="gallery">Gallery</option>
                      <option value="thumbnail">Thumbnail</option>
                      <option value="custom">Custom</option>
                    </select>

                    <label>X: {(cropX * 100).toFixed(0)}%</label>
                    <input type="range" min={0} max={100} value={cropX * 100} onChange={(e) => setCropX(Number(e.target.value) / 100)} />
                    <label>Y: {(cropY * 100).toFixed(0)}%</label>
                    <input type="range" min={0} max={100} value={cropY * 100} onChange={(e) => setCropY(Number(e.target.value) / 100)} />
                    <label>Breite: {(cropW * 100).toFixed(0)}%</label>
                    <input type="range" min={20} max={100} value={cropW * 100} onChange={(e) => setCropW(Number(e.target.value) / 100)} />
                    <label>Höhe: {(cropH * 100).toFixed(0)}%</label>
                    <input type="range" min={20} max={100} value={cropH * 100} onChange={(e) => setCropH(Number(e.target.value) / 100)} />

                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveCrop(asset.id)}
                        disabled={cropSaving}
                        className="rounded-lg bg-emerald-500 px-3 py-1.5 font-bold text-white disabled:opacity-60"
                      >
                        {cropSaving ? "Speichere..." : "Zuschneiden speichern"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCropId(null)}
                        className="rounded-lg border border-slate-600 px-3 py-1.5"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {editingId !== asset.id && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-blue-400/50 px-3 py-1.5 text-xs font-bold text-blue-200 hover:bg-blue-500/10"
                    onClick={() => startEditing(asset)}
                  >
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-emerald-400/50 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/10"
                    onClick={() => setCropId((prev) => (prev === asset.id ? null : asset.id))}
                  >
                    Zuschneiden
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-400/50 px-3 py-1.5 text-xs font-bold text-red-200 hover:bg-red-500/10"
                    onClick={() => onDelete(asset.id)}
                  >
                    Soft Delete
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
