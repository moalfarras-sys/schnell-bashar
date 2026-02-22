import { Container } from "@/components/container";
import { PremiumImage } from "@/components/ui/premium-image";
import { Reveal } from "@/components/motion/reveal";
import { getImageSlots } from "@/server/content/slots";

export const metadata = {
  title: "Galerie",
};

export default async function GaleriePage() {
  const images = [
    { key: "img.galerie.01", src: "/media/gallery/hero_truck_v1_1771507453273.png", alt: "Umzugstransporter bei Nacht" },
    { key: "img.galerie.02", src: "/media/gallery/1.jpeg", alt: "Unser Team" },
    { key: "img.galerie.03", src: "/media/gallery/2.jpeg", alt: "Team im Einsatz" },
    { key: "img.galerie.04", src: "/media/gallery/hero_truck_v4_1771507501491.png", alt: "Umzugsfahrzeug bei Nacht" },
    { key: "img.galerie.05", src: "/media/gallery/movers-boxes.jpeg", alt: "Umzug mit Kartons" },
    { key: "img.galerie.06", src: "/media/gallery/loading-crew.jpeg", alt: "Verladung im Einsatz" },
    { key: "img.galerie.07", src: "/media/gallery/heavy-move.jpeg", alt: "Schwertransport" },
    { key: "img.galerie.08", src: "/media/gallery/disposal-dumpster.jpeg", alt: "Entsorgung / Sperrmüll" },
    { key: "img.galerie.09", src: "/media/gallery/truck-street.jpeg", alt: "Firmentransporter unterwegs" },
    { key: "img.galerie.10", src: "/media/gallery/keys-box.jpeg", alt: "Umzug Planung" },
    { key: "img.galerie.11", src: "/media/gallery/electronics.jpeg", alt: "Elektro-Entsorgung" },
    { key: "img.galerie.12", src: "/media/gallery/hero_truck_v2_1771507469281.png", alt: "Transporter mit Spotlight" },
    { key: "img.galerie.13", src: "/media/gallery/move-action-01.jpeg", alt: "Umzug in Aktion" },
    { key: "img.galerie.14", src: "/media/gallery/move-action-02.jpeg", alt: "Professioneller Transport" },
    { key: "img.galerie.15", src: "/media/gallery/move-action-03.jpeg", alt: "Möbeltransport" },
  ];

  const slots = await getImageSlots(
    images.map((img) => ({ key: img.key, fallbackSrc: img.src, fallbackAlt: img.alt })),
  );

  return (
    <Container className="py-14">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight">Galerie</h1>
        <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
          Einblicke in unsere Arbeit - Umzug, Montage und Entsorgung.
        </p>
      </div>

      <Reveal className="mt-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img, idx) => (
            <PremiumImage
              key={img.key}
              src={slots[img.key]?.src || img.src}
              alt={slots[img.key]?.alt || img.alt}
              fill
              overlay={idx % 3 === 0 ? "brand" : "subtle"}
              aspect={idx % 5 === 0 ? "portrait" : "video"}
              zoom
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              containerClassName={
                idx === 0 ? "sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:h-full" : ""
              }
            />
          ))}
        </div>
      </Reveal>
    </Container>
  );
}
