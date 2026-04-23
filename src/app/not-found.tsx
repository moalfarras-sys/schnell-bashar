import Link from "next/link";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="bg-slate-50 py-24">
      <Container className="max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">404</p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950">
          Seite nicht gefunden
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Die angeforderte Seite ist nicht verfügbar. Nutzen Sie die wichtigsten Bereiche der
          Website oder senden Sie direkt eine neue Anfrage.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/umzug">
            <Button variant="outline">Umzug</Button>
          </Link>
          <Link href="/entsorgung">
            <Button variant="outline">Entsorgung</Button>
          </Link>
          <Link href="/montage">
            <Button variant="outline">Montage</Button>
          </Link>
          <Link href="/booking">
            <Button>Termin online buchen</Button>
          </Link>
        </div>
      </Container>
    </div>
  );
}
