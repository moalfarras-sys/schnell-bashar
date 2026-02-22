"use client";

import { useMemo, useState, useCallback } from "react";

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
};

export function MediaLibraryClient({ initialAssets }: { initialAssets: Asset[] }) {
  const [assets, setAssets] = useState(initialAssets);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [saving, setSaving] = useState(false);

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
      [asset.filename, asset.path, asset.alt ?? "", asset.title ?? ""].join(" ").toLowerCase().includes(q),
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

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
        <h1 className="text-2xl font-extrabold text-white">Media Library</h1>
        <p className="mt-1 text-sm text-slate-300">Upload, suche und lösche Website-Bilder.</p>
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
        {filtered.map((asset) => (
          <article key={asset.id} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.path}
              alt={asset.alt ?? asset.title ?? asset.filename}
              className="h-40 w-full rounded-lg border border-slate-700 object-cover"
            />

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
                  {asset.width ?? "?"}×{asset.height ?? "?"} • {(asset.size / 1024).toFixed(1)} KB
                </div>
              </div>
            )}

            {editingId !== asset.id && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-blue-400/50 px-3 py-1.5 text-xs font-bold text-blue-200 hover:bg-blue-500/10"
                  onClick={() => startEditing(asset)}
                >
                  Bearbeiten
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
        ))}
      </div>
    </div>
  );
}

