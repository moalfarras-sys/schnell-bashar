import Image from "next/image";

import { Container } from "@/components/container";
import { Reveal } from "@/components/motion/reveal";
import { getImageSlots } from "@/server/content/slots";

export const metadata = {
  title: "Galerie | Umzug, Entsorgung & Montage Arbeiten in Berlin",
  description:
    "Einblicke in Umzüge, Entsorgungen und Montagearbeiten von Schnell Sicher Umzug in Berlin und deutschlandweit.",
  alternates: {
    canonical: "/galerie",
  },
};

export default async function GaleriePage() {
  const images = [
    { key: "img.galerie.01", src: "/media/gallery/truck-street.jpeg", alt: "Umzugstransporter von Schnell Sicher Umzug in Berlin" },
    { key: "img.galerie.02", src: "/media/gallery/team-portrait.jpeg", alt: "Teamfoto von Schnell Sicher Umzug" },
    { key: "img.galerie.03", src: "/media/gallery/move-action-02.jpeg", alt: "Umzugshelfer tragen Umzugsgut zum Fahrzeug" },
    { key: "img.galerie.04", src: "/media/gallery/van-street.jpeg", alt: "Umzugsfahrzeug bei einem Abendtermin in Berlin" },
    { key: "img.galerie.05", src: "/media/gallery/movers-boxes.jpeg", alt: "Verpackte Umzugskartons für einen Privatumzug" },
    { key: "img.galerie.06", src: "/media/gallery/disposal-dumpster.jpeg", alt: "Sperrmüll und Entsorgung mit Container und Verladung" },
  ];

  const slots = await getImageSlots(
    images.map((img) => ({ key: img.key, fallbackSrc: img.src, fallbackAlt: img.alt })),
  );

  return (
    <Container className="py-14">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight">Galerie</h1>
        <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
          Einblicke in unsere Arbeit bei Umzug, Montage und Entsorgung in Berlin und deutschlandweit.
        </p>
      </div>

      <Reveal className="mt-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <div
              key={img.key}
              className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/50 bg-white/60 shadow-md"
            >
              <Image
                src={slots[img.key]?.src || img.src}
                alt={slots[img.key]?.alt || img.alt}
                fill
                className="object-cover transition-transform duration-700 hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
          ))}
        </div>
      </Reveal>
    </Container>
  );
}
