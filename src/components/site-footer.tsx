import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { Container } from "@/components/container";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-[color:var(--line-soft)] bg-[color:var(--surface-soft)] pb-24 text-slate-900 md:pb-0 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <div className="absolute left-1/4 top-0 z-0 h-64 w-64 rounded-full bg-brand-500/4 blur-3xl dark:bg-brand-500/8" />
      <div className="absolute bottom-0 right-1/4 z-0 h-48 w-48 rounded-full bg-blue-500/3 blur-3xl dark:bg-blue-500/6" />

      <Container className="relative z-10 grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link
            href="/"
            className="text-lg font-extrabold tracking-tight text-slate-900 transition-opacity hover:opacity-90 dark:text-white"
          >
            Schnell Sicher{" "}
            <span className="bg-linear-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent dark:from-brand-400 dark:to-brand-300">
              Umzug
            </span>
          </Link>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Umzug, Entsorgung und Möbelmontage in Berlin und deutschlandweit. Telefonisch 24/7
            erreichbar, Termine nach Vereinbarung.
          </p>
          <div className="mt-5 flex gap-3">
            <a
              href="https://wa.me/491729573681"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 transition-all duration-300 hover:border-emerald-300 hover:bg-emerald-100 hover:shadow-md dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:border-emerald-700/50 dark:hover:bg-emerald-950/50"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
            <a
              href="tel:+491729573681"
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-xs font-bold text-brand-700 transition-all duration-300 hover:border-brand-300 hover:bg-brand-100 hover:shadow-md dark:border-brand-800/40 dark:bg-brand-950/30 dark:text-brand-300 dark:hover:border-brand-700/50 dark:hover:bg-brand-950/50"
            >
              <Phone className="h-4 w-4" />
              Direkt anrufen
            </a>
          </div>
        </div>

        <div className="text-sm">
          <div className="font-bold text-slate-900 dark:text-white">Leistungen</div>
          <div className="mt-3 grid gap-2.5 text-slate-600 dark:text-slate-400">
            <Link className="transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400" href="/umzug">
              Umzug Berlin
            </Link>
            <Link className="transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400" href="/entsorgung">
              Sperrmüll Entsorgung Berlin
            </Link>
            <Link className="transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400" href="/montage">
              Möbelmontage Berlin
            </Link>
            <Link className="transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400" href="/preise">
              Preise ansehen
            </Link>
          </div>
        </div>

        <div className="text-sm">
          <div className="font-bold text-slate-900 dark:text-white">Service</div>
          <div className="mt-3 grid gap-2.5 text-slate-600 dark:text-slate-400">
            <Link className="transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400" href="/booking">
              Termin online buchen
            </Link>
            <Link className="transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400" href="/anfrage">
              Anfrage verfolgen
            </Link>
            <Link className="transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400" href="/faq">
              FAQ
            </Link>
            <Link className="transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400" href="/galerie">
              Galerie
            </Link>
          </div>

          <div className="mt-6 font-bold text-slate-900 dark:text-white">Rechtliches</div>
          <div className="mt-3 grid gap-2.5 text-slate-600 dark:text-slate-400">
            <Link className="transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400" href="/impressum">
              Impressum
            </Link>
            <Link className="transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400" href="/datenschutz">
              Datenschutz
            </Link>
            <Link className="transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400" href="/agb">
              AGB
            </Link>
          </div>
        </div>

        <div className="text-sm">
          <div className="font-bold text-slate-900 dark:text-white">Kontakt</div>
          <div className="mt-3 grid gap-3.5 text-slate-700 dark:text-slate-300">
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
              <div>
                Anzengruber Straße 9
                <br />
                12043 Berlin
                <br />
                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                  24/7 erreichbar
                </span>
              </div>
            </div>
            <a className="flex items-center gap-2.5 font-semibold transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400" href="tel:+491729573681">
              <Phone className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              +49 172 9573681
            </a>
            <a className="flex items-center gap-2.5 font-semibold transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400" href="mailto:kontakt@schnellsicherumzug.de">
              <Mail className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              kontakt@schnellsicherumzug.de
            </a>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Berlin & deutschlandweit
            </p>
          </div>
        </div>
      </Container>

      <div className="border-t border-[color:var(--line-soft)] py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-500">
        © {new Date().getFullYear()} Schnell Sicher Umzug. Alle Rechte vorbehalten.
      </div>
    </footer>
  );
}
