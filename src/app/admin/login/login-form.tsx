"use client";

import { useActionState } from "react";

import { LoginState, loginAction } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: LoginState = { error: null };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-6 grid gap-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <div className="text-xs font-bold text-slate-300">E-Mail</div>
        <Input
          name="email"
          type="email"
          autoComplete="username"
          placeholder="admin@..."
          required
          className="border-slate-700 bg-slate-800/60 text-white placeholder:text-slate-500"
        />
      </div>
      <div>
        <div className="text-xs font-bold text-slate-300">Passwort</div>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="........"
          required
          className="border-slate-700 bg-slate-800/60 text-white placeholder:text-slate-500"
        />
      </div>

      {state?.error ? (
        <div className="rounded-2xl border border-red-600/40 bg-red-900/30 p-3 text-sm font-semibold text-red-200">
          {state.error}
        </div>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Bitte warten..." : "Anmelden"}
      </Button>

      <div className="text-xs font-semibold text-slate-400">
        Tipp: Setzen Sie `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` in der `.env` auf dem VPS.
      </div>
    </form>
  );
}
