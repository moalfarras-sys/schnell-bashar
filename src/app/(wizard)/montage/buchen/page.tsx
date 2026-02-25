import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MontageBookingEntryPage() {
  permanentRedirect("/buchen?context=MONTAGE");
}
