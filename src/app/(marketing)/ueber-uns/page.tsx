import Link from "next/link";
import Image from "next/image";
import { Leaf, ShieldCheck, Users } from "lucide-react";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getImageSlots } from "@/server/content/slots";

export const metadata = {
  title: "Über uns",
  description:
    "Schnell Sicher Umzug begleitet private und gewerbliche Kunden in Berlin und deutschlandweit mit strukturierter Planung, persönlicher Betreuung und klarer Abstimmung.",
  alternates: {
    canonical: "/ueber-uns",
  },
};

export default async function UeberUnsPage() {
  const slots = await getImageSlots([
    {
      key: "img.ueber_uns.main",
      fallbackSrc: "/media/gallery/team-back.jpeg",
      fallbackAlt: "Team von Schnell Sicher Umzug bei einem Einsatz in Berlin",
    },
    {
      key: "img.ueber_uns.team",
      fallbackSrc: "/media/gallery/team-portrait-2.jpeg",
      fallbackAlt: "Mitarbeiter von Schnell Sicher Umzug im Teamfoto",
    },
  ]);
  return (
    <Container className="py-14">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">Über uns</h1>
        <p className="mt-4 text-base text-slate-800 dark:text-slate-200">
          Schnell Sicher Umzug betreut private und gewerbliche Einsätze mit klarer Planung,
          persönlicher Abstimmung und einem verlässlichen Ablauf von der Anfrage bis zum Termin.
        </p>
        <div className="mt-8">
          <Link href="/booking">
            <Button size="lg">Online-Anfrage starten</Button>
          </Link>
        </div>
      </div>

      <div className="premium-surface-emphasis mt-10 relative aspect-16/7 overflow-hidden rounded-3xl">
        <Image
          src={slots["img.ueber_uns.main"]?.src || "/media/gallery/team-back.jpeg"}
          alt={slots["img.ueber_uns.main"]?.alt || "Team von Schnell Sicher Umzug bei einem Einsatz in Berlin"}
          fill
          className="object-cover object-[50%_22%]"
          sizes="(max-width: 1024px) 100vw, 75vw"
        />
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <ValueCard
          icon={ShieldCheck}
          title="Schnell & Sicher"
          text="Sorgfältige Planung, verlässliche Kommunikation und ein sauber organisierter Einsatz."
        />
        <ValueCard
          icon={Users}
          title="Team & Erfahrung"
          text="Ein eingespieltes Team begleitet Umzug, Entsorgung und Montage mit klaren Zuständigkeiten."
        />
        <ValueCard
          icon={Leaf}
          title="Umweltbewusst"
          text="Fachgerechte Entsorgung und sinnvolle Weiterverwertung, wo es organisatorisch möglich ist."
        />
      </div>

      <div className="premium-surface-emphasis mt-12 relative aspect-16/6 overflow-hidden rounded-3xl">
        <Image
          src={slots["img.ueber_uns.team"]?.src || "/media/gallery/team-portrait-2.jpeg"}
          alt={slots["img.ueber_uns.team"]?.alt || "Mitarbeiter von Schnell Sicher Umzug im Teamfoto"}
          fill
          className="object-cover object-center"
          sizes="(max-width: 1024px) 100vw, 75vw"
        />
      </div>
    </Container>
  );
}

function ValueCard(props: { icon: any; title: string; text: string }) {
  const Icon = props.icon;
  return (
    <Card variant="emphasis">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 shadow-sm">
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-4 text-lg font-extrabold text-slate-950 dark:text-white">{props.title}</div>
      <div className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{props.text}</div>
    </Card>
  );
}
