"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { appPath } from "@/lib/routes";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Prüfe Login...");
    const response = await fetch(appPath("/api/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      setMessage("Login fehlgeschlagen.");
      return;
    }

    const nextUrl = new URLSearchParams(window.location.search).get("next");
    window.location.href = nextUrl || appPath("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <form
        onSubmit={login}
        className="w-full max-w-md rounded-md border border-slate-300 bg-white p-8 shadow-sm"
      >
        <p className="text-xs font-black uppercase tracking-wide text-[#f26b21]">
          Admin Login
        </p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">
          Dokumenten-System
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-700">
          Bitte Admin-Passwort eingeben. Lokal bleibt der Login deaktiviert,
          solange keine ENV Variable `ADMIN_PASSWORD` gesetzt ist.
        </p>
        <label className="mt-6 grid gap-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-700">
            Passwort
          </span>
          <input
            className="h-11 rounded-md border border-slate-400 px-3 font-semibold outline-none focus:border-[#f26b21] focus:ring-2 focus:ring-[#f26b21]/25"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <Button type="submit" variant="primary" className="mt-5 w-full">
          Einloggen
        </Button>
        {message ? (
          <p className="mt-4 text-sm font-semibold text-slate-700">{message}</p>
        ) : null}
      </form>
    </main>
  );
}
