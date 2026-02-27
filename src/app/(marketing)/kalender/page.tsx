import Link from "next/link";
import Image from "next/image";
import { CalendarDays, CheckCircle2 } from "lucide-react";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { getImageSlot } from "@/server/content/slots";
import { KalenderClient } from "./kalender-client";

export const metadata = {
  title: "Abholkalender & Preise",
};

export default async function KalenderPage() {
  const image = await getImageSlot({
    key: "img.kalender.main",
    fallbackSrc: "/media/gallery/calendar.jpeg",
    fallbackAlt: "Kalender",
  });
  return (
    <Container className="py-14">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            Abholkalender & verfügbare Termine
          </h1>
          <p className="mt-4 text-base text-slate-800 dark:text-slate-200">
            Termine werden über unser Buchungsformular als Zeitfenster gebucht — inklusive
            Kapazitätsprüfung. Die Verfügbarkeit richtet sich nach Leistungsart, Dauer und
            Priorität (Günstig / Standard / Express).
          </p>
          <div className="mt-8">
            <Link href="/booking-v2?context=MOVING">
              <Button size="lg">
                <CalendarDays className="h-5 w-5" />
                Termin auswählen
              </Button>
            </Link>
          </div>
        </div>

        <div className="premium-surface-emphasis relative aspect-[4/3] overflow-hidden rounded-3xl">
        <Image
          src={image.src}
          alt={image.alt || "Kalender"}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </div>

      <div className="mt-12">
        <KalenderClient />
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <Info
          title="Kapazitäten"
          text="Zeitfenster berücksichtigen laufende Aufträge — keine Doppelbuchungen."
        />
        <Info
          title="Dauer"
          text="Die geschätzte Dauer ergibt sich aus Ihrer Artikelauswahl und den Zugangsdaten."
        />
        <Info
          title="Priorität"
          text="Express-Priorität zeigt frühere Terminoptionen (bei freier Kapazität)."
        />
      </div>
    </Container>
  );
}

function Info(props: { title: string; text: string }) {
  return (
    <div className="premium-surface-emphasis premium-elevate rounded-3xl p-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-100 text-brand-700 shadow-sm">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-extrabold text-slate-950 dark:text-white">{props.title}</div>
          <div className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{props.text}</div>
        </div>
      </div>
    </div>
  );
}



