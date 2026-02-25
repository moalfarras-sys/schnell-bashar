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
    fallbackAlt: "Kontakt & Planung",
  });

  return (
    <Container className="py-14">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
          Kontakt aufnehmen
        </h1>
        <p className="mt-4 text-base text-slate-800 dark:text-slate-200">
          Teilen Sie uns Ihre Anfrage mit, und wir melden uns schnellstmöglich. Wir helfen Ihnen
          schnell und sicher weiter.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="premium-surface-emphasis rounded-3xl p-6 sm:p-8">
          <div className="text-lg font-extrabold text-slate-950 dark:text-white">Anfrage schicken</div>
          <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Für eine direkte Online-Buchung nutzen Sie unser Buchungsformular. Für allgemeine
            Fragen und Rückrufe können Sie dieses Kontaktformular verwenden.
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
          alt={banner.alt || "Kontakt & Planung"}
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
        <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 shadow-sm">
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

