import Link from "next/link";
import Image from "next/image";
import { Leaf, ShieldCheck, Users } from "lucide-react";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getImageSlots } from "@/server/content/slots";

export const metadata = {
  title: "Über uns",
};

export default async function UeberUnsPage() {
  const slots = await getImageSlots([
    { key: "img.ueber_uns.main", fallbackSrc: "/media/gallery/1.jpeg" },
    { key: "img.ueber_uns.team", fallbackSrc: "/media/gallery/2.jpeg" },
  ]);
  return (
    <Container className="py-14">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">Über uns</h1>
        <p className="mt-4 text-base text-slate-800 dark:text-slate-200">
          Ihr zuverlässiger Umzugspartner: Bei Schnell Sicher Umzug kümmern wir uns persönlich um Ihren
          Umzug — schnell, sicher und mit viel Erfahrung.
        </p>
        <div className="mt-8">
          <Link href="/preise">
            <Button size="lg">Angebot berechnen</Button>
          </Link>
        </div>
      </div>

      <div className="premium-surface-emphasis mt-10 relative aspect-16/7 overflow-hidden rounded-3xl">
        <Image
          src={slots["img.ueber_uns.main"]?.src || "/media/gallery/1.jpeg"}
          alt="Schnell Sicher Umzug Team"
          fill
          className="object-cover object-[50%_22%]"
          sizes="(max-width: 1024px) 100vw, 75vw"
        />
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <ValueCard
          icon={ShieldCheck}
          title="Schnell & Sicher"
          text="Super schnelle und absolut sichere Umzüge mit persönlicher Betreuung."
        />
        <ValueCard
          icon={Users}
          title="Team & Erfahrung"
          text="Erfahrene Profis begleiten jeden Auftrag von der Planung bis zur Umsetzung."
        />
        <ValueCard
          icon={Leaf}
          title="Umweltbewusst"
          text="Fachgerechte Entsorgung und möglichst viel Recycling für eine saubere Umgebung."
        />
      </div>

      <div className="premium-surface-emphasis mt-12 relative aspect-16/6 overflow-hidden rounded-3xl">
        <Image
          src={slots["img.ueber_uns.team"]?.src || "/media/gallery/2.jpeg"}
          alt="Unser Team"
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

