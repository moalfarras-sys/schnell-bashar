import { BookingV2Client } from "@/app/booking-v2/booking-v2-client";

export const metadata = {
  title: "Buchung | Schnell Sicher Umzug",
  description: "Modernes Buchungssystem mit Echtzeit-Kalkulation, klaren Schritten und transparenter Preisübersicht.",
};

export default async function BookingV2Page({
  searchParams,
}: {
  searchParams?: Promise<{ context?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  return <BookingV2Client initialContext={String(sp.context ?? "")} />;
}
