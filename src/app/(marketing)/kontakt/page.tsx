import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { ContactForm } from "@/app/(marketing)/kontakt/contact-form";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { getImageSlot } from "@/server/content/slots";

export const metadata = {
  title: "Kontakt",
};

export default async function KontaktPage() {
  const banner = await getImageSlot({
    key: "img.kontakt.banner",
    fallbackSrc: "/media/gallery/keys-box.jpeg",
    fallbackAlt: "Kontakt und Planung",
  });

  return (
    <Container className="py-14">
      <div className="max-w-3xl">
        <div className="inline-flex rounded-full border border-cyan-300/70 bg-cyan-50/80 px-3 py-1 text-xs font-bold text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-950/30 dark:text-cyan-200">
          Kontakt und Beratung
        </div>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
          Kontakt aufnehmen
        </h1>
        <p className="mt-4 text-base font-medium leading-7 text-slate-700 dark:text-slate-200">
          Teilen Sie uns Ihre Anfrage mit, und wir melden uns schnellstmöglich.
          Sie erhalten eine klare Rückmeldung zu Preis, Ablauf und Terminoptionen.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="premium-surface-emphasis rounded-3xl p-6 sm:p-8">
          <div className="text-lg font-extrabold text-slate-950 dark:text-white">Anfrage senden</div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-300">
            Für eine direkte Online-Buchung nutzen Sie bitte unser Buchungsformular.
            Für allgemeine Fragen, Rückrufe oder Sonderfälle verwenden Sie dieses Kontaktformular.
          </p>
          <div className="mt-5">
            <ContactForm />
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link href="/preise">
              <Button size="lg">Zum Buchungsformular</Button>
            </Link>
            <a href="https://wa.me/491729573681" target="_blank" rel="noreferrer">
              <Button size="lg" variant="outline">
                WhatsApp
              </Button>
            </a>
          </div>
        </div>

        <div className="grid gap-6">
          <Info
            icon={Phone}
            title="Telefon"
            lines={[
              { label: "+49 172 9573681", href: "tel:+491729573681" },
              { label: "+49 176 24863305", href: "tel:+4917624863305" },
            ]}
          />
          <Info
            icon={Mail}
            title="E-Mail"
            lines={[{ label: "kontakt@schnellsicherumzug.de", href: "mailto:kontakt@schnellsicherumzug.de" }]}
          />
          <Info
            icon={MapPin}
            title="Standort"
            lines={[
              { label: "Anzengruber Straße 9, 12043 Berlin" },
              { label: "Erreichbarkeit: Mo – So, rund um die Uhr" },
            ]}
          />
        </div>
      </div>

      <div className="premium-surface-emphasis relative mt-12 aspect-[16/6] overflow-hidden rounded-3xl">
        <Image
          src={banner.src}
          alt={banner.alt || "Kontakt und Planung"}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 75vw"
        />
      </div>
    </Container>
  );
}

function Info(props: {
  icon: any;
  title: string;
  lines: { label: string; href?: string }[];
}) {
  const Icon = props.icon;
  return (
    <div className="premium-surface-emphasis premium-elevate rounded-3xl p-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 shadow-sm dark:bg-brand-900/40 dark:text-brand-200">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-extrabold text-slate-950 dark:text-white">{props.title}</div>
          <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            {props.lines.map((line) =>
              line.href ? (
                <a key={line.label} href={line.href} className="hover:underline">
                  {line.label}
                </a>
              ) : (
                <div key={line.label}>{line.label}</div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
