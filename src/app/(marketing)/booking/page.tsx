import type { Metadata } from "next";

import { BookingV2Client } from "@/app/booking-v2/booking-v2-client";

export const metadata: Metadata = {
  title: "Jetzt buchen | Schnell Sicher Umzug",
  description:
    "Modernes Buchungssystem mit Live-Kalkulation, klaren Schritten und direkter Anfrageübermittlung.",
  alternates: {
    canonical: "/booking",
  },
};

export default async function BookingPage({
  searchParams,
}: {
  searchParams?: Promise<{ context?: string; quoteId?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  return (
    <BookingV2Client
      initialContext={String(sp.context ?? "")}
      initialQuoteId={String(sp.quoteId ?? "")}
    />
  );
}
