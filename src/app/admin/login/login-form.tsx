"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

import { LoginState, loginAction } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: LoginState = { error: null };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="mt-6 grid gap-4" noValidate>
      <input type="hidden" name="next" value={next} />

      <div>
        <label
          htmlFor="admin-email"
          className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300"
        >
          E-Mail-Adresse
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
          <Input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="admin@schnellsicherumzug.de"
            required
            className="h-11 border-slate-300 bg-white/90 pl-10 text-slate-900 placeholder:text-slate-500 focus-visible:border-brand-500 focus-visible:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="admin-password"
          className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300"
        >
          Passwort
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
          <Input
            id="admin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Passwort eingeben"
            required
            className="h-11 border-slate-300 bg-white/90 pl-10 pr-11 text-slate-900 placeholder:text-slate-500 focus-visible:border-brand-500 focus-visible:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white dark:placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label={showPassword ? "Passwort ausblenden" : "Passwort anzeigen"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {state?.error ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-600/40 dark:bg-red-900/30 dark:text-red-200">
          {state.error}
        </div>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="mt-1 h-11 w-full bg-gradient-to-r from-cyan-500 via-brand-500 to-indigo-500 text-white shadow-[0_10px_25px_rgba(37,99,235,0.35)] hover:from-cyan-400 hover:via-brand-400 hover:to-indigo-400"
      >
        {pending ? "Anmeldung läuft ..." : "Anmelden"}
      </Button>
    </form>
  );
}
