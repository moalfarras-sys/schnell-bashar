import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  MapPin,
  Phone,
  Recycle,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { cities } from "@/data/cities";
import { LocalBusinessSchema } from "@/components/schema/local-business";
import { ServiceSchema } from "@/components/schema/service-schema";
import { getImageSlots } from "@/server/content/slots";

type Params = { city: string };

export function generateStaticParams() {
  return cities.map((city) => ({ city: city.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = cities.find((c) => c.slug === citySlug);
  if (!city) return {};
  return {
    title: `Umzug ${city.name} — Schnell Sicher Umzug | Professionelle Umzüge`,
    description: `Professionelle Umzüge in ${city.name}, ${city.state}. Erfahrenes Team, schnelle Abwicklung, transparente Preise. ✓ 24/7 Erreichbar ✓ Deutschlandweit ✓ Fair kalkuliert.`,
    openGraph: {
      title: `Umzug in ${city.name} — Schnell Sicher Umzug`,
      description: `Schnell Sicher Umzug in ${city.name}. Stressfrei umziehen mit professionellem Team.`,
      images: [{ url: city.image }],
    },
  };
}

const features = [
  {
    icon: ShieldCheck,
    title: "Versichert & zuverlässig",
    desc: "Erfahrene Teams mit klaren Abläufen und transparenter Kommunikation.",
  },
  {
    icon: CalendarDays,
    title: "Flexible Terminplanung",
    desc: "Kurzfristige und planbare Termine für Privat und Gewerbe.",
  },
  {
    icon: Recycle,
    title: "Umweltbewusst",
    desc: "Fachgerechte Entsorgung mit Fokus auf Trennung und Recycling.",
  },
];

const benefits = [
  "Persönliche Betreuung vor Ort",
  "Transparente Preiskalkulation",
  "Montage & Demontage inklusive",
  "Versicherungsschutz für Ihren Umzug",
  "24/7 telefonisch erreichbar",
  "Online-Buchung & Tracking",
];

export default async function CityPage({ params }: { params: Promise<Params> }) {
  const { city: citySlug } = await params;
  const city = cities.find((c) => c.slug === citySlug);
  if (!city) notFound();
  const slots = await getImageSlots([
    { key: `img.city.${city.slug}.hero`, fallbackSrc: city.image, fallbackAlt: `Umzug in ${city.name}` },
    { key: "img.city.shared.service_umzug", fallbackSrc: "/media/gallery/hero_truck_v1_1771507453273.png" },
    { key: "img.city.shared.service_entsorgung", fallbackSrc: "/media/gallery/disposal-dumpster.jpeg" },
    { key: "img.city.shared.cta_logo", fallbackSrc: "/media/brand/hero-logo.jpeg" },
  ]);

  return (
    <>
      <LocalBusinessSchema />
      <ServiceSchema
        name={`Umzug in ${city.name}`}
        description={`Professioneller Umzugsservice in ${city.name}, ${city.state}. Stressfrei umziehen mit erfahrenem Team.`}
        areaServed={city.name}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200/60 bg-linear-to-br from-[color:var(--surface-elevated)] via-brand-50/20 to-slate-50">
        <div className="absolute right-0 top-0 -z-10 h-96 w-96 rounded-full bg-brand-200/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 -z-10 h-72 w-72 rounded-full bg-blue-200/8 blur-3xl" />
        <Container className="py-14 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-[color:var(--surface-elevated)] px-4 py-1.5 text-xs font-bold text-slate-700 shadow-sm">
                  <MapPin className="h-4 w-4 text-brand-600" />
                  {city.state} · {city.population} Einwohner
                </div>
                <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
                  Umzug in{" "}
                  <span className="bg-linear-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
                    {city.name}
                  </span>
                </h1>
                <p className="mt-5 max-w-prose text-base leading-relaxed text-slate-700">
                  Wir planen Umzug, Entsorgung und Montage in {city.name} strukturiert und
                  terminsicher. Professionelle Teams, flexible Zeitfenster und transparente
                  Kalkulation für Ihre Region.
                </p>

                <div className="mt-4 flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="ml-1 text-sm font-bold text-slate-800">5.0</span>
                  <span className="text-sm text-slate-500">Bewertung</span>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/preise">
                    <Button size="lg" className="shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]">
                      Kostenloses Angebot erhalten
                    </Button>
                  </Link>
                  <a href="tel:+491729573681">
                    <Button variant="outline" size="lg" className="transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                      <Phone className="h-4 w-4" />
                      Anrufen
                    </Button>
                  </a>
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="glass-card relative aspect-16/10 overflow-hidden rounded-3xl shadow-xl">
                <Image
                  src={slots[`img.city.${city.slug}.hero`]?.src || city.image}
                  alt={`Umzug in ${city.name}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
                <div className="absolute inset-0 bg-linear-to-t from-slate-950/30 to-transparent" />
                <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl bg-[color:var(--surface-elevated)] px-3 py-2 text-sm font-bold text-slate-900 shadow-md backdrop-blur-sm">
                  <MapPin className="h-4 w-4 text-brand-600" />
                  {city.name}, {city.state}
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Features */}
      <section className="border-t border-slate-200/60 bg-[color:var(--surface-elevated)]">
        <Container className="py-14">
          <Reveal>
            <h2 className="text-center text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              Warum Schnell Sicher Umzug in {city.name}?
            </h2>
          </Reveal>
          <Reveal className="mt-10">
            <div className="grid gap-6 md:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="glass-card glass-card-hover rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-brand-100 to-brand-50 text-brand-700 shadow-sm">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <div className="mt-4 text-lg font-extrabold text-slate-950">{f.title}</div>
                  <p className="mt-2 text-sm text-slate-700">{f.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Benefits */}
      <section className="border-t border-slate-200/60 bg-slate-50">
        <Container className="py-14">
          <Reveal>
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
                  Ihre Vorteile in {city.name}
                </h2>
                <p className="mt-3 text-sm text-slate-700">
                  Egal ob Privatumzug, Büroumzug oder Entsorgung — wir bieten Ihnen eine
                  strukturierte Lösung mit klaren Abläufen.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {benefits.map((b) => (
                    <div
                      key={b}
                      className="flex items-center gap-2 text-sm font-semibold text-slate-800"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" />
                      {b}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="glass-card overflow-hidden rounded-3xl">
                  <div className="relative aspect-video">
                    <Image
                      src={slots["img.city.shared.service_umzug"]?.src || "/media/gallery/hero_truck_v1_1771507453273.png"}
                      alt={`Umzug Service in ${city.name}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-slate-950/50 to-transparent" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--surface-elevated)] text-brand-700 shadow-sm">
                        <Truck className="h-4 w-4" />
                      </div>
                      <div className="text-sm font-extrabold text-white drop-shadow-md">Umzug — Privat & Gewerbe</div>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-sm text-slate-700">
                      Kompletter Umzugsservice mit Verpackung, Transport und Montage.
                    </p>
                  </div>
                </div>
                <div className="glass-card overflow-hidden rounded-3xl">
                  <div className="relative aspect-video">
                    <Image
                      src={slots["img.city.shared.service_entsorgung"]?.src || "/media/gallery/disposal-dumpster.jpeg"}
                      alt={`Entsorgung in ${city.name}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-slate-950/50 to-transparent" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--surface-elevated)] text-brand-700 shadow-sm">
                        <Recycle className="h-4 w-4" />
                      </div>
                      <div className="text-sm font-extrabold text-white drop-shadow-md">Entsorgung — Sperrmüll & mehr</div>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-sm text-slate-700">
                      Fachgerechte Abholung und umweltbewusste Entsorgung.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-800 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-0 right-0 z-0 h-64 w-64 rounded-full bg-brand-500/5 blur-3xl" />
        <Container className="relative z-10 py-14">
          <Reveal>
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  Bereit für Ihren Umzug in {city.name}?
                </h2>
                <p className="mt-4 max-w-prose text-sm text-slate-300">
                  Starten Sie jetzt Ihre Anfrage — kostenlos und unverbindlich. Wir melden uns
                  innerhalb weniger Stunden bei Ihnen.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/preise">
                    <Button size="lg" className="shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                      Angebot berechnen
                    </Button>
                  </Link>
                  <a href="tel:+491729573681">
                    <Button size="lg" variant="outline-light" className="transition-all duration-300 hover:scale-[1.02]">
                      <Phone className="h-4 w-4" />
                      +49 172 9573681
                    </Button>
                  </a>
                </div>
              </div>

              <div className="relative aspect-16/10 overflow-hidden rounded-3xl border border-slate-700/50 shadow-2xl">
                <Image
                  src={slots["img.city.shared.cta_logo"]?.src || "/media/brand/hero-logo.jpeg"}
                  alt="Schnell Sicher Umzug"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-linear-to-t from-slate-950/40 to-transparent" />
                <div className="absolute bottom-3 left-3 rounded-xl bg-[color:var(--surface-elevated)] px-3 py-1.5 text-xs font-extrabold text-slate-900 shadow-md backdrop-blur-sm">
                  Schnell Sicher Umzug
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
