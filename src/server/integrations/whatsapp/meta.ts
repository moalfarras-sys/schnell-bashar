import { createHmac, timingSafeEqual } from "crypto";

type OutboundTemplateVariable = {
  type: "text";
  text: string;
};

export function isMetaWhatsappConfigured(settings: {
  whatsappMetaEnabled: boolean;
  whatsappMetaPhoneNumberId: string;
  whatsappMetaAccessToken: string;
}) {
  return Boolean(
    settings.whatsappMetaEnabled &&
      settings.whatsappMetaPhoneNumberId &&
      settings.whatsappMetaAccessToken,
  );
}

function graphUrl(phoneNumberId: string) {
  return `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
}

export async function sendMetaWhatsappText(args: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  text: string;
}) {
  const res = await fetch(graphUrl(args.phoneNumberId), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: args.to.replace(/[^\d]/g, ""),
      type: "text",
      text: { body: args.text },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Meta WhatsApp send failed (${res.status}): ${JSON.stringify(data)}`,
    );
  }
  return data;
}

export async function sendMetaWhatsappTemplate(args: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  templateName: string;
  lang?: string;
  variables?: OutboundTemplateVariable[];
}) {
  const components =
    args.variables && args.variables.length > 0
      ? [{ type: "body", parameters: args.variables }]
      : undefined;

  const res = await fetch(graphUrl(args.phoneNumberId), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: args.to.replace(/[^\d]/g, ""),
      type: "template",
      template: {
        name: args.templateName,
        language: { code: args.lang ?? "de" },
        ...(components ? { components } : {}),
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Meta WhatsApp template failed (${res.status}): ${JSON.stringify(data)}`,
    );
  }
  return data;
}

export function verifyMetaWebhookSignature(params: {
  appSecret?: string;
  rawBody: string;
  signatureHeader: string | null;
}) {
  if (!params.appSecret) return true;
  if (!params.signatureHeader?.startsWith("sha256=")) return false;
  const incomingHex = params.signatureHeader.replace("sha256=", "");
  const expectedHex = createHmac("sha256", params.appSecret)
    .update(params.rawBody)
    .digest("hex");
  try {
    return timingSafeEqual(
      Buffer.from(incomingHex, "hex"),
      Buffer.from(expectedHex, "hex"),
    );
  } catch {
    return false;
  }
}
