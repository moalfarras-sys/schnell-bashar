import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LegacyBookingTerminPage() {
  permanentRedirect("/booking-v2?context=MOVING");
}
