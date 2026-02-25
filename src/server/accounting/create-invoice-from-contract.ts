import { addDays } from "date-fns";
import { prisma } from "@/server/db/prisma";
import { nextDocumentNumber } from "@/server/ids/document-number";

export async function createInvoiceFromContract(contractId: string) {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        offer: {
          include: { order: true },
        },
      },
    });

    if (!contract?.offer) {
      console.warn(`[auto-invoice] Contract ${contractId} not found or has no offer`);
      return null;
    }

    const existing = await prisma.invoice.findFirst({
      where: { contractId },
    });
    if (existing) {
      console.info(`[auto-invoice] Invoice already exists for contract ${contractId}`);
      return existing;
    }

    const docNo = await nextDocumentNumber("OFFER");
    const invoiceNo = docNo.replace("ANG-", "RE-");

    const offer = contract.offer;
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        contractId: contract.id,
        offerId: offer.id,
        orderId: offer.orderId || null,
        customerName: offer.customerName,
        customerEmail: offer.customerEmail,
        customerPhone: offer.customerPhone,
        address: offer.customerAddress,
        description: offer.notes || undefined,
        lineItems: offer.services as any,
        netCents: offer.netCents,
        vatCents: offer.vatCents,
        grossCents: offer.grossCents,
        issuedAt: new Date(),
        dueAt: addDays(new Date(), 14),
        isManual: false,
      },
    });

    console.info(`[auto-invoice] Created invoice ${invoiceNo} for contract ${contractId}`);
    return invoice;
  } catch (error) {
    console.error("[auto-invoice] Failed to create invoice:", error);
    return null;
  }
}
