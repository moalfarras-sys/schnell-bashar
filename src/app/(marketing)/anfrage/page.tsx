"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Container } from "@/components/container";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AnfragePage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    router.push(`/anfrage/${encodeURIComponent(trimmed)}`);
  }

  return (
    <Container className="py-14">
      <div className="mx-auto max-w-xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
          Anfrage verfolgen
        </h1>
        <p className="mt-4 text-base text-slate-700 dark:text-slate-300">
          Geben Sie Ihren Tracking-Code ein, um den aktuellen Stand Ihrer Buchung einzusehen.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 rounded-3xl border-2 border-slate-200 bg-[color:var(--surface-elevated)] p-6 shadow-md backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80"
        >
          <label htmlFor="tracking-code" className="block text-sm font-bold text-slate-800 dark:text-slate-200">
            Tracking-Code
          </label>
          <Input
            id="tracking-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="z.B. SSU-2026-A1B2"
            className="mt-2"
            required
          />
          <Button type="submit" className="mt-4 gap-2" size="lg">
            <Search className="h-5 w-5" />
            Suchen
          </Button>
        </form>

        <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
          Den Tracking-Code finden Sie in Ihrer Buchungsbestätigung per E-Mail.
        </p>
      </div>
    </Container>
  );
}
