import type { Order } from "../../../prisma/generated/prisma/client";

import { calculateLineItem } from "@/lib/documents/calculations";
import type { DocumentPayload } from "@/lib/documents/types";

type WizardLike = Record<string, unknown> & {
  customer?: { name?: string; email?: string; phone?: string; note?: string };
  timing?: { requestedFrom?: string; preferredTimeWindow?: string };
  serviceType?: string;
  startAddress?: { displayName?: string };
  destinationAddress?: { displayName?: string };
  pickupAddress?: { displayName?: string };
};

export function mapOrderToOfferDraft(order: Order): DocumentPayload {
  const wizardData = (order.wizardData ?? {}) as WizardLike;

  const lineItem = calculateLineItem({
    position: 1,
    title: "Leistungsübersicht",
    description: wizardData.serviceType || "Anfrage aus Website-Formular",
    quantity: 1,
    unit: "Pauschale",
    unitPriceNetCents: order.priceMaxCents,
    vatRate: 19,
  });

  return {
    type: "ANGEBOT",
    orderId: order.id,
    customerData: {
      name: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone,
      billingAddress:
        wizardData.startAddress?.displayName ||
        wizardData.pickupAddress?.displayName ||
        wizardData.destinationAddress?.displayName ||
        null,
    },
    serviceData: {
      serviceType: order.serviceType,
      serviceDate: wizardData.timing?.requestedFrom || null,
      requestedWindow: wizardData.timing?.preferredTimeWindow || null,
      items: order.wizardData,
      estimateSource: "order",
      estimateMinCents: order.priceMinCents,
      estimateMaxCents: order.priceMaxCents,
    },
    addressData: {
      fromAddress: wizardData.startAddress?.displayName || null,
      toAddress: wizardData.destinationAddress?.displayName || null,
      pickupAddress: wizardData.pickupAddress?.displayName || null,
    },
    lineItems: [lineItem],
    visibleNotes: wizardData.customer?.note || null,
    internalNotes: "Automatisch aus Website-Anfrage erstellt.",
  };
}
