import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { verifyAdminToken, adminCookieName } from "@/server/auth/admin-session";
import { offerDisplayNo, orderDisplayNo } from "@/server/ids/document-number";
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

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { order: true },
  });

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
