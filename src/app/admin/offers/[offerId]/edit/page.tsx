import { cookies } from "next/headers";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { verifyAdminToken, adminCookieName } from "@/server/auth/admin-session";
import { offerDisplayNo, orderDisplayNo } from "@/server/ids/document-number";
import { Container } from "@/components/container";
import { OfferEditForm } from "./offer-edit-form";

export default async function OfferEditPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;

  if (!token) redirect("/admin/login");

  try {
    await verifyAdminToken(token);
  } catch {
    redirect("/admin/login");
  }

  const { offerId } = await params;

  let dbWarning: string | null = null;
  let offer: any = null;
  try {
    offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { order: true },
    });
  } catch (error) {
    dbWarning =
      error instanceof Error
        ? `Datenbankfehler: ${error.message}`
        : "Datenbankfehler: Angebot konnte nicht geladen werden.";
  }

  if (dbWarning) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Container className="py-8">
          <Link
            href="/admin/offers"
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Übersicht
          </Link>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {dbWarning}
          </div>
        </Container>
      </div>
    );
  }

  if (!offer) notFound();

  const displayOfferNo = offerDisplayNo({
    offerNo: offer.offerNo,
    id: offer.id,
    orderNo: offer.order?.orderNo ?? null,
    orderPublicId: offer.order?.publicId ?? null,
  });

  const displayOrderNo = offer.order
    ? orderDisplayNo(offer.order)
    : null;

  return (
    <OfferEditForm
      offer={{
        id: offer.id,
        offerNo: displayOfferNo,
        orderNo: displayOrderNo,
        customerName: offer.customerName,
        customerEmail: offer.customerEmail,
        customerPhone: offer.customerPhone,
        customerAddress: offer.customerAddress,
        netCents: offer.netCents,
        vatCents: offer.vatCents,
        grossCents: offer.grossCents,
        discountPercent: offer.discountPercent,
        discountCents: offer.discountCents,
        discountNote: offer.discountNote,
        customNote: offer.customNote,
        notes: offer.notes,
        validUntil: offer.validUntil.toISOString(),
      }}
    />
  );
}
