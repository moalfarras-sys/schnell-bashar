import type { Metadata } from "next";

import { BookingV2Client } from "@/app/booking-v2/booking-v2-client";

export const metadata: Metadata = {
  title: "Umzug online buchen",
  description:
    "Buchen Sie Umzug, Entsorgung oder Montage online. Schnell Sicher Umzug ist 24/7 erreichbar und erstellt ein passendes Angebot für Berlin und deutschlandweit.",
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
