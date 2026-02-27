import { ShieldCheck, ClipboardList, Settings2 } from "lucide-react";

import { Container } from "@/components/container";
import { LoginForm } from "@/app/admin/login/login-form";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextParam } = await searchParams;
  const next = nextParam ?? "/admin";

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <Container className="py-10 sm:py-14">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_1fr]">
          <section className="relative overflow-hidden rounded-3xl border border-slate-300/70 bg-white/75 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/75">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,rgba(14,165,233,0.18),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(59,130,246,0.14),transparent_50%)]" />

            <div className="inline-flex items-center rounded-full border border-cyan-300/70 bg-cyan-100/80 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-cyan-700 dark:border-cyan-500/40 dark:bg-cyan-900/30 dark:text-cyan-200">
              Adminbereich
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Sicherer Zugriff auf die Verwaltung
            </h1>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
              Verwalten Sie Aufträge, Preise, Medien und Systemkonfiguration zentral in einem
              verbundenen Dashboard.
            </p>

            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-slate-300/70 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Rollenbasierte Sicherheit
                </div>
                <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  Anmeldung mit Session-Schutz und Berechtigungen für alle Admin-Bereiche.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-300/70 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                  <ClipboardList className="h-4 w-4 text-brand-500" />
                  Aufträge und Angebote live
                </div>
                <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  Vollständige Steuerung über Anfragen, Angebotserstellung und Statuspflege.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-300/70 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                  <Settings2 className="h-4 w-4 text-indigo-500" />
                  Preise, Services, Inhalte
                </div>
                <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  Änderungen sind direkt im System wirksam und bleiben konsistent mit Website und
                  Buchung.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-300/70 bg-white/80 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/80 sm:p-8">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Verwaltung anmelden
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              Melden Sie sich an, um Aufträge, Angebote, Inhalte und Preise zu verwalten.
            </p>

            <LoginForm next={next} />
          </section>
        </div>
      </Container>
    </div>
  );
}
