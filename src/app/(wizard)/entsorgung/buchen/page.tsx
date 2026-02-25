import { BookingWizard } from "@/app/(wizard)/buchen/wizard-client";
import { Container } from "@/components/container";
import { loadBookingConfig } from "@/server/booking/load-booking-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DisposalBookingEntryPage() {
  const config = await loadBookingConfig();
  if (!config) {
    return (
      <Container className="py-12">
        <div className="rounded-3xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
          Das Entsorgungs-Buchungssystem ist aktuell nicht verfügbar.
        </div>
      </Container>
    );
  }

  return (
    <BookingWizard
      variant="entsorgung"
      initialServiceType="DISPOSAL"
      catalog={config.catalog}
      pricing={config.pricing}
    />
  );
}
