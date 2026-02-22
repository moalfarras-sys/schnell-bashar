"use client";

import { useCallback, useEffect, useState } from "react";

interface Job {
  id: string;
  title: string;
  department: string | null;
  location: string;
  type: string;
  description: string;
  requirements: string | null;
  isActive: boolean;
  createdAt: string;
}

const EMPTY: Omit<Job, "id" | "createdAt"> = {
  title: "",
  department: "",
  location: "Berlin",
  type: "Vollzeit",
  description: "",
  requirements: "",
  isActive: true,
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function startEdit(job: Job) {
    setEditingId(job.id);
    setForm({
      title: job.title,
      department: job.department ?? "",
      location: job.location,
      type: job.type,
      description: job.description,
      requirements: job.requirements ?? "",
      isActive: job.isActive,
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setError("Titel und Beschreibung sind Pflichtfelder.");
      return;
    }
    setSaving(true);
    setError(null);

    const url = editingId ? `/api/admin/jobs/${editingId}` : "/api/admin/jobs";
    const method = editingId ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Fehler beim Speichern");
        return;
      }
      cancelEdit();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(job: Job) {
    await fetch(`/api/admin/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !job.isActive }),
    });
    await load();
  }

  async function deleteJob(id: string) {
    if (!confirm("Stellenangebot wirklich löschen?")) return;
    await fetch(`/api/admin/jobs/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Stellenangebote</h1>
        <span className="text-sm text-slate-400">{jobs.length} Einträge</span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/70 p-6"
      >
        <h2 className="text-lg font-semibold text-white">
          {editingId ? "Stellenangebot bearbeiten" : "Neues Stellenangebot"}
        </h2>

        {error && (
          <p className="rounded-lg bg-red-900/40 px-4 py-2 text-sm text-red-300">{error}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Titel *</label>
            <input
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500"
              placeholder="z. B. Umzugshelfer (m/w/d)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Abteilung</label>
            <input
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500"
              placeholder="z. B. Logistik"
              value={form.department ?? ""}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Standort</label>
            <input
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Beschäftigungsart</label>
            <select
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="Vollzeit">Vollzeit</option>
              <option value="Teilzeit">Teilzeit</option>
              <option value="Minijob">Minijob</option>
              <option value="Praktikum">Praktikum</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Beschreibung *</label>
          <textarea
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500"
            rows={4}
            placeholder="Stellenbeschreibung ..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Anforderungen</label>
          <textarea
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500"
            rows={3}
            placeholder="Anforderungen ..."
            value={form.requirements ?? ""}
            onChange={(e) => setForm({ ...form, requirements: e.target.value })}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="rounded border-slate-600 bg-slate-800"
          />
          Aktiv (auf der Website sichtbar)
        </label>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Speichert …" : editingId ? "Aktualisieren" : "Erstellen"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-slate-600 px-5 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Abbrechen
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-slate-400">Laden …</p>
      ) : jobs.length === 0 ? (
        <p className="text-sm text-slate-400">Noch keine Stellenangebote erstellt.</p>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <article
              key={job.id}
              className="rounded-xl border border-slate-700 bg-slate-900/70 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-white">{job.title}</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {job.location} · {job.type}
                    {job.department ? ` · ${job.department}` : ""}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-300">{job.description}</p>
                  {job.requirements && (
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                      Anforderungen: {job.requirements}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    job.isActive
                      ? "bg-emerald-900/40 text-emerald-300"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {job.isActive ? "Aktiv" : "Inaktiv"}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => startEdit(job)}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Bearbeiten
                </button>
                <button
                  onClick={() => toggleActive(job)}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  {job.isActive ? "Deaktivieren" : "Aktivieren"}
                </button>
                <button
                  onClick={() => deleteJob(job.id)}
                  className="rounded-lg border border-red-800 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/30"
                >
                  Löschen
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
