import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Calculator,
  CalendarDays,
  CheckCircle2,
  CircleCheckBig,
  ClipboardList,
  Phone,
  Recycle,
  Search,
  ShieldCheck,
  Star,
  Truck,
  Wrench,
} from "lucide-react";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { PremiumImage } from "@/components/ui/premium-image";
import { QuickEstimateWidget } from "@/components/quick-estimate-widget";
import { Reveal } from "@/components/motion/reveal";
import { MovingFAQSection } from "@/components/sections/moving-faq";
import { getImageSlots, getTextSlots } from "@/server/content/slots";

const services = [
  {
    title: "Umzug",
    desc: "Stressfrei umziehen mit erfahrenen Profis — sicher verpackt und pünktlich geliefert.",
    icon: Truck,
    href: "/umzug",
    slotKey: "img.home.services.umzug",
    fallbackImage: "/media/gallery/movers-boxes.jpeg",
  },
  {
    title: "Entsorgung",
    desc: "Sperrmüll fachgerecht abholen und umweltbewusst entsorgen lassen.",
    icon: Recycle,
    href: "/entsorgung",
    slotKey: "img.home.services.entsorgung",
    fallbackImage: "/media/gallery/disposal-dumpster.jpeg",
  },
  {
    title: "Montage",
    desc: "Möbel ab- und aufbauen, sauber, schnell und mit Präzision.",
    icon: Wrench,
    href: "/montage",
    slotKey: "img.home.services.montage",
    fallbackImage: "/media/gallery/workshop.jpeg",
  },
];

const tools = [
  { icon: Calculator, label: "Preisrechner", href: "/preise", desc: "Schnelle Orientierung" },
  { icon: ClipboardList, label: "Angebot berechnen", href: "/preise", desc: "Preis + Termin" },
  { icon: Search, label: "Anfrage verfolgen", href: "/anfrage", desc: "Status prüfen" },
  { icon: CalendarDays, label: "Termine", href: "/buchung/termin", desc: "Zeitfenster wählen" },
];

const defaultTestimonials = [
  {
    nameKey: "text.home.testimonial.1.name",
    textKey: "text.home.testimonial.1.text",
    defaultName: "Familie K.",
    defaultText: "Sehr freundlich, pünktlich und gut organisiert. Der Umzug lief stressfrei und sauber.",
    location: "Berlin",
    service: "Umzug",
  },
  {
    nameKey: "text.home.testimonial.2.name",
    textKey: "text.home.testimonial.2.text",
    defaultName: "Büroservice M.",
    defaultText: "Klare Kommunikation und faire Preise. Besonders stark bei kurzfristiger Planung.",
    location: "München",
    service: "Büroumzug",
  },
  {
    nameKey: "text.home.testimonial.3.name",
    textKey: "text.home.testimonial.3.text",
    defaultName: "Haushalt M.",
    defaultText: "Sperrmüll wurde schnell abgeholt, alles transparent erklärt und professionell umgesetzt.",
    location: "Hamburg",
    service: "Entsorgung",
  },
];

const galleryImages = [
  { slotKey: "img.home.gallery.01", fallbackSrc: "/media/gallery/hero_truck_v1_1771507453273.png", alt: "Umzugstransporter bei Nacht" },
  { slotKey: "img.home.gallery.02", fallbackSrc: "/media/gallery/1.jpeg", alt: "Unser Team" },
  { slotKey: "img.home.gallery.03", fallbackSrc: "/media/gallery/move-action-01.jpeg", alt: "Umzug in Aktion" },
  { slotKey: "img.home.gallery.04", fallbackSrc: "/media/gallery/loading-crew.jpeg", alt: "Verladung im Einsatz" },
  { slotKey: "img.home.gallery.05", fallbackSrc: "/media/gallery/keys-box.jpeg", alt: "Schlüssel und Umzugskarton" },
  { slotKey: "img.home.gallery.06", fallbackSrc: "/media/gallery/truck-street.jpeg", alt: "Firmentransporter unterwegs" },
];

export default async function HomePage() {
  const txt = await getTextSlots([
    { key: "text.home.hero.headline", fallback: "Stressfrei umziehen mit erfahrenen Profis." },
    { key: "text.home.hero.subtitle", fallback: "Umzug, Entsorgung und Montage — strukturiert, zuverlässig und deutschlandweit. Ihr Premium-Umzugsservice mit modernem Buchungssystem." },
    { key: "text.home.cta.headline", fallback: "Bereit für Ihr Angebot?" },
    { key: "text.home.cta.subtitle", fallback: "Ein Anruf genügt — oder nutzen Sie unser Online-Buchungsformular für Umzug und Entsorgung." },
    { key: "text.home.testimonial.1.name", fallback: "Familie K." },
    { key: "text.home.testimonial.1.text", fallback: "Sehr freundlich, pünktlich und gut organisiert. Der Umzug lief stressfrei und sauber." },
    { key: "text.home.testimonial.2.name", fallback: "Büroservice M." },
    { key: "text.home.testimonial.2.text", fallback: "Klare Kommunikation und faire Preise. Besonders stark bei kurzfristiger Planung." },
    { key: "text.home.testimonial.3.name", fallback: "Haushalt M." },
    { key: "text.home.testimonial.3.text", fallback: "Sperrmüll wurde schnell abgeholt, alles transparent erklärt und professionell umgesetzt." },
  ]);

  const testimonials = defaultTestimonials.map((t) => ({
    name: txt[t.nameKey],
    text: txt[t.textKey],
    location: t.location,
    service: t.service,
  }));

  const slotMap = await getImageSlots([
    { key: "img.home.hero.bg", fallbackSrc: "/media/gallery/hero_truck_v1_1771507453273.png" },
    { key: "img.home.services.umzug", fallbackSrc: "/media/gallery/movers-boxes.jpeg" },
    { key: "img.home.services.entsorgung", fallbackSrc: "/media/gallery/disposal-dumpster.jpeg" },
    { key: "img.home.services.montage", fallbackSrc: "/media/gallery/workshop.jpeg" },
    { key: "img.home.gallery.01", fallbackSrc: "/media/gallery/hero_truck_v1_1771507453273.png" },
    { key: "img.home.gallery.02", fallbackSrc: "/media/gallery/1.jpeg" },
    { key: "img.home.gallery.03", fallbackSrc: "/media/gallery/move-action-01.jpeg" },
    { key: "img.home.gallery.04", fallbackSrc: "/media/gallery/loading-crew.jpeg" },
    { key: "img.home.gallery.05", fallbackSrc: "/media/gallery/keys-box.jpeg" },
    { key: "img.home.gallery.06", fallbackSrc: "/media/gallery/truck-street.jpeg" },
    { key: "img.home.why_us.main", fallbackSrc: "/media/gallery/1.jpeg" },
    { key: "img.home.why_us.sub_1", fallbackSrc: "/media/gallery/move-action-02.jpeg" },
    { key: "img.home.why_us.sub_2", fallbackSrc: "/media/gallery/loading-crew.jpeg" },
    { key: "img.home.cta.bg", fallbackSrc: "/media/gallery/2.jpeg" },
  ]);
  return (
    <>
      {/* ── Cinematic Hero ── */}
      <section className="relative overflow-hidden section-divider-glow">
        {/* Hero Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src={slotMap["img.home.hero.bg"]?.src || "/media/gallery/hero_truck_v1_1771507453273.png"}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-linear-to-b from-[rgba(244,248,255,0.88)] via-[rgba(240,246,254,0.76)] to-[rgba(244,248,255,0.90)] dark:from-slate-950/90 dark:via-slate-950/70 dark:to-slate-950/95" />
          <div className="absolute inset-0 bg-linear-to-r from-[rgba(120,185,255,0.10)] via-transparent to-[rgba(150,170,255,0.06)] dark:from-brand-500/15 dark:via-transparent dark:to-brand-400/8" />
        </div>

        <div className="absolute -top-32 -left-32 z-1 h-96 w-96 rounded-full bg-[rgba(120,185,255,0.12)] blur-3xl dark:bg-brand-500/25" />
        <div className="absolute -bottom-32 -right-32 z-1 h-80 w-80 rounded-full bg-[rgba(150,170,255,0.08)] blur-3xl dark:bg-brand-400/20" />

        <Container className="relative z-10 py-24 sm:py-28 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <div className="fade-in-up">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.55)] bg-[rgba(255,255,255,0.55)] px-4 py-1.5 text-xs font-bold text-brand-700 shadow-[0_0_0_0.5px_rgba(10,16,32,0.04),0_2px_8px_rgba(10,16,32,0.04),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md dark:border-brand-500/30 dark:bg-brand-950/50 dark:text-brand-300 dark:shadow-none dark:backdrop-blur-none">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Deutschlandweit verfügbar — 24/7
              </div>

              <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
                {txt["text.home.hero.headline"].includes(" ")
                  ? <>
                      {txt["text.home.hero.headline"].split(" ").slice(0, -2).join(" ")}{" "}
                      <span className="block bg-linear-to-r from-[#2870d6] via-[#3a90f0] to-[#5cb0ff] bg-clip-text text-transparent dark:from-brand-400 dark:via-brand-300 dark:to-blue-300">
                        {txt["text.home.hero.headline"].split(" ").slice(-2).join(" ")}
                      </span>
                    </>
                  : <span className="block bg-linear-to-r from-[#2870d6] via-[#3a90f0] to-[#5cb0ff] bg-clip-text text-transparent dark:from-brand-400 dark:via-brand-300 dark:to-blue-300">
                      {txt["text.home.hero.headline"]}
                    </span>
                }
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-700 sm:text-lg dark:text-slate-300">
                {txt["text.home.hero.subtitle"]}
              </p>

              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link href="/preise">
                  <Button size="xl" className="gap-2">
                    Kostenloses Angebot erhalten
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="tel:+491729573681">
                  <Button size="xl" variant="outline" className="gap-2">
                    <Phone className="h-4 w-4" />
                    +49 172 9573681
                  </Button>
                </a>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-slate-700 dark:text-slate-300">
                {["24/7 Erreichbar", "Deutschlandweit", "Faire Preise"].map((label) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Sofort-Preis-Schätzung ── */}
      <QuickEstimateWidget />

      {/* ── Services with Images ── */}
      <section className="relative overflow-hidden section-divider-glow">
        <div className="absolute inset-0 bg-linear-to-b from-[rgba(255,255,255,0.25)] to-[rgba(240,248,255,0.40)] dark:from-slate-900/50 dark:to-slate-950" />
        <Container className="relative py-20 sm:py-24">
          <Reveal>
            <div className="text-center">
              <span className="inline-block rounded-full bg-brand-100/80 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                Leistungen
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Unsere Leistungen
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                Zuverlässige Umzüge, fachgerechte Entsorgung und professionelle Montage —
                alles aus einer Hand.
              </p>
            </div>
          </Reveal>

          <Reveal className="mt-14">
            <div className="grid gap-8 lg:grid-cols-3">
              {services.map((s) => (
                <Link
                  key={s.title}
                  href={s.href}
                  className="group relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.60)] bg-[rgba(255,255,255,0.65)] shadow-[0_0_0_0.5px_rgba(10,16,32,0.04),0_6px_20px_rgba(10,16,32,0.05),inset_0_1px_0_rgba(255,255,255,0.70)] backdrop-blur-md transition-all duration-300 hover:bg-[rgba(255,255,255,0.80)] hover:shadow-[0_0_0_0.5px_rgba(10,16,32,0.05),0_12px_32px_rgba(10,16,32,0.07),inset_0_1px_0_rgba(255,255,255,0.85)] hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-brand-500/40 dark:hover:shadow-[0_16px_48px_rgba(59,130,246,0.1)] dark:backdrop-blur-none dark:shadow-sm"
                >
                  {/* Service Image */}
                  <div className="relative aspect-16/10 overflow-hidden">
                    <Image
                      src={slotMap[s.slotKey]?.src || s.fallbackImage}
                      alt={s.title}
                      fill
                      className="object-cover transition-transform duration-700 ease-premium group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-slate-950/50 via-slate-950/10 to-transparent" />
                    <div className="absolute bottom-4 left-4 z-10 flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.80)] text-brand-600 shadow-[0_4px_14px_rgba(10,16,32,0.08),inset_0_1px_0_rgba(255,255,255,0.80)] backdrop-blur-lg dark:bg-slate-900/90 dark:text-brand-400 dark:shadow-lg dark:backdrop-blur-none">
                      <s.icon className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-lg font-extrabold">{s.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{s.desc}</p>
                    <div className="mt-5 flex items-center gap-1.5 text-sm font-bold text-brand-600 transition-all duration-300 group-hover:gap-3 dark:text-brand-400">
                      Mehr erfahren
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── Gallery Showcase ── */}
      <section className="relative overflow-hidden section-divider-glow">
        <div className="absolute inset-0 bg-linear-to-b from-[rgba(240,248,255,0.35)] to-[rgba(255,255,255,0.20)] dark:from-slate-950 dark:to-slate-900/50" />
        <Container className="relative py-20 sm:py-24">
          <Reveal>
            <div className="text-center">
              <span className="inline-block rounded-full bg-brand-100/80 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                Einblicke
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Aus unserem Arbeitsalltag
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                Professionelle Umzüge, sichere Transporte und zufriedene Kunden.
              </p>
            </div>
          </Reveal>

          <Reveal className="mt-14">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {galleryImages.map((img, i) => (
                <PremiumImage
                  key={img.slotKey}
                  src={slotMap[img.slotKey]?.src || img.fallbackSrc}
                  alt={img.alt}
                  fill
                  overlay={i === 0 ? "brand" : "subtle"}
                  aspect="video"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  containerClassName={
                    i === 0
                      ? "sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:h-full"
                      : ""
                  }
                />
              ))}
            </div>
          </Reveal>

          <Reveal className="mt-8 text-center">
            <Link href="/galerie">
              <Button variant="outline" size="lg" className="gap-2">
                Alle Bilder ansehen
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Reveal>
        </Container>
      </section>

      {/* ── Quick Tools ── */}
      <section className="relative overflow-hidden section-divider-glow">
        <div className="absolute inset-0 bg-linear-to-b from-[rgba(255,255,255,0.20)] to-[rgba(240,248,255,0.35)] dark:from-slate-900/50 dark:to-slate-950" />
        <Container className="relative py-20 sm:py-24">
          <Reveal>
            <div className="text-center">
              <span className="inline-block rounded-full bg-brand-100/80 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                Online-Tools
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Schnelle Online-Tools
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                Direkt loslegen: Preis berechnen, Angebot anfordern oder Anfrage verfolgen.
              </p>
            </div>
          </Reveal>
          <Reveal className="mt-12">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tools.map((tool) => (
                <Link
                  key={`${tool.href}-${tool.label}`}
                  href={tool.href}
                  className="group flex items-center gap-4 rounded-2xl border border-[rgba(255,255,255,0.60)] bg-[rgba(255,255,255,0.60)] p-5 shadow-[0_0_0_0.5px_rgba(10,16,32,0.04),0_4px_14px_rgba(10,16,32,0.04),inset_0_1px_0_rgba(255,255,255,0.70)] backdrop-blur-md transition-all duration-220 hover:bg-[rgba(255,255,255,0.80)] hover:shadow-[0_0_0_0.5px_rgba(10,16,32,0.05),0_8px_24px_rgba(10,16,32,0.06),inset_0_1px_0_rgba(255,255,255,0.80)] hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-brand-500/40 dark:hover:shadow-[0_8px_24px_rgba(59,130,246,0.08)] dark:backdrop-blur-none dark:shadow-sm"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(47,140,255,0.08)] text-brand-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.50)] transition-all duration-220 group-hover:bg-linear-to-br group-hover:from-[#3888f0] group-hover:to-[#5ca5f7] group-hover:text-white group-hover:shadow-[0_4px_14px_rgba(47,140,255,0.25),inset_0_1px_0_rgba(255,255,255,0.25)] dark:from-brand-950/60 dark:to-brand-900/40 dark:text-brand-400 dark:group-hover:from-brand-500 dark:group-hover:to-brand-600 dark:shadow-none">
                    <tool.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{tool.label}</div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{tool.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── Why Us ── */}
      <section className="relative overflow-hidden section-divider-glow">
        <div className="absolute inset-0 bg-linear-to-b from-[rgba(240,248,255,0.35)] to-[rgba(255,255,255,0.20)] dark:from-slate-950 dark:to-slate-900/50" />
        <Container className="relative py-20 sm:py-24">
          <Reveal>
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="inline-block rounded-full bg-brand-100/80 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                  Warum wir?
                </span>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Warum Schnell Sicher Umzug?
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  Wir kümmern uns persönlich um Ihren Umzug — zuverlässig, pünktlich und mit
                  viel Erfahrung. Transparente Preise und professionelle Abwicklung.
                </p>

                <div className="mt-8 grid gap-4">
                  {[
                    { icon: ShieldCheck, title: "Schnell & Sicher", text: "Klare Abläufe, pünktliche Teams, sorgfältiger Umgang." },
                    { icon: Recycle, title: "Umweltbewusst", text: "Fachgerechte Entsorgung mit Recycling-Fokus." },
                    { icon: CircleCheckBig, title: "Modern buchen", text: "Online anfragen, Termin wählen, Anfrage direkt senden." },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-4 rounded-xl border border-[rgba(255,255,255,0.60)] bg-[rgba(255,255,255,0.60)] p-4 shadow-[0_0_0_0.5px_rgba(10,16,32,0.04),0_2px_8px_rgba(10,16,32,0.03),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md transition-all duration-220 hover:bg-[rgba(255,255,255,0.78)] hover:shadow-[0_0_0_0.5px_rgba(10,16,32,0.05),0_4px_14px_rgba(10,16,32,0.05),inset_0_1px_0_rgba(255,255,255,0.80)] dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-brand-500/30 dark:backdrop-blur-none dark:shadow-sm">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#3888f0] to-[#5ca5f7] text-white shadow-[0_4px_14px_rgba(47,140,255,0.25),inset_0_1px_0_rgba(255,255,255,0.25)] dark:from-brand-500 dark:to-brand-400 dark:shadow-[0_4px_16px_rgba(59,130,246,0.25)]">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white">{item.title}</div>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{item.text}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <Link href="/preise">
                    <Button size="lg" className="gap-2">
                      Angebot anfordern
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="grid gap-4">
                <PremiumImage
                  src={slotMap["img.home.why_us.main"]?.src || "/media/gallery/1.jpeg"}
                  alt="Unser Team bei der Arbeit"
                  width={600}
                  height={400}
                  overlay="brand"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="grid grid-cols-2 gap-4">
                  <PremiumImage
                    src={slotMap["img.home.why_us.sub_1"]?.src || "/media/gallery/move-action-02.jpeg"}
                    alt="Umzugstransporter"
                    width={300}
                    height={200}
                    overlay="subtle"
                    sizes="(max-width: 1024px) 50vw, 25vw"
                  />
                  <PremiumImage
                    src={slotMap["img.home.why_us.sub_2"]?.src || "/media/gallery/loading-crew.jpeg"}
                    alt="Professionelles Verladen"
                    width={300}
                    height={200}
                    overlay="subtle"
                    sizes="(max-width: 1024px) 50vw, 25vw"
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── Testimonials ── */}
      <section className="relative overflow-hidden section-divider-glow">
        <div className="absolute inset-0 bg-linear-to-b from-[rgba(255,255,255,0.20)] to-[rgba(240,248,255,0.35)] dark:from-slate-900/50 dark:to-slate-950" />
        <Container className="relative py-20 sm:py-24">
          <Reveal>
            <div className="text-center">
              <span className="inline-block rounded-full bg-amber-100/80 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                Kundenstimmen
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Das sagen unsere Kunden
              </h2>
              <div className="mt-4 flex items-center justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-2 text-sm font-bold text-slate-900 dark:text-white">5.0 / 5.0</span>
              </div>
            </div>
          </Reveal>

          <Reveal className="mt-14">
            <div className="grid gap-6 sm:grid-cols-3">
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  className="group rounded-2xl border border-[rgba(255,255,255,0.60)] bg-[rgba(255,255,255,0.60)] p-6 shadow-[0_0_0_0.5px_rgba(10,16,32,0.04),0_4px_14px_rgba(10,16,32,0.04),inset_0_1px_0_rgba(255,255,255,0.70)] backdrop-blur-md transition-all duration-220 hover:bg-[rgba(255,255,255,0.78)] hover:shadow-[0_0_0_0.5px_rgba(10,16,32,0.05),0_8px_24px_rgba(10,16,32,0.06),inset_0_1px_0_rgba(255,255,255,0.80)] hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-brand-500/30 dark:backdrop-blur-none dark:shadow-sm"
                >
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    &quot;{t.text}&quot;
                  </p>
                  <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(47,140,255,0.08)] text-sm font-bold text-brand-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.50)] dark:from-brand-950/60 dark:to-brand-900/40 dark:text-brand-400 dark:shadow-none">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{t.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{t.service} — {t.location}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      <MovingFAQSection />

      {/* ── Final CTA ── */}
      <section className="relative overflow-hidden">
        {/* CTA Background Image */}
        <div className="absolute inset-0">
          <Image
            src={slotMap["img.home.cta.bg"]?.src || "/media/gallery/2.jpeg"}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-linear-to-r from-brand-700/95 to-brand-900/90 dark:from-brand-900/95 dark:to-slate-950/95" />
        </div>

        {/* CTA glow orbs */}
        <div className="absolute top-1/2 left-1/2 z-1 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-400/15 blur-3xl" />
        <div className="absolute top-0 right-0 z-1 h-64 w-64 rounded-full bg-blue-300/10 blur-3xl" />

        <Container className="relative z-10 py-20 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {txt["text.home.cta.headline"]}
            </h2>
            <p className="mt-4 text-base text-brand-100/90">
              {txt["text.home.cta.subtitle"]}
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/preise">
                <Button size="lg" variant="primary" className="gap-2">
                  Angebot berechnen
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="tel:+491729573681">
                <Button size="lg" variant="outline-light" className="gap-2">
                  <Phone className="h-4 w-4" />
                  Anrufen
                </Button>
              </a>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

