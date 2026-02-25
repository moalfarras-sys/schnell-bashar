import { NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";
import { loadOperationalSettings } from "@/server/settings/operational-settings";
import {
  sendMetaWhatsappText,
  verifyMetaWebhookSignature,
} from "@/server/integrations/whatsapp/meta";

function normalizePhone(v: string) {
  return (v || "").replace(/[^\d]/g, "");
}

function autoReplyForText(input: string) {
  const text = input.toLowerCase();
  if (text.includes("umzug") || text.trim() === "1") {
    return "Perfekt. Hier starten Sie Ihre Umzugsanfrage: https://schnellsicherumzug.de/buchen?context=MOVING";
  }
  if (text.includes("entsorgung") || text.includes("sperrm") || text.trim() === "2") {
    return "Gerne. Für Entsorgung/Sperrmüll nutzen Sie bitte: https://schnellsicherumzug.de/buchen?context=ENTSORGUNG";
  }
  if (text.includes("montage") || text.trim() === "3") {
    return "Sehr gut. Für Montageanfragen öffnen Sie: https://schnellsicherumzug.de/buchen?context=MONTAGE";
  }
  if (text.includes("status") || text.includes("tracking")) {
    return "Ihren Status finden Sie hier: https://schnellsicherumzug.de/anfrage";
  }
  return "Willkommen bei Schnell Sicher Umzug. Antworten Sie mit 1=Umzug, 2=Entsorgung, 3=Montage oder schreiben Sie direkt Ihre Anfrage.";
}

export async function GET(req: Request) {
  const settings = await loadOperationalSettings();
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    challenge &&
    settings.whatsappMetaVerifyToken &&
    token === settings.whatsappMetaVerifyToken
  ) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json(
    { ok: true, message: "Meta WhatsApp Webhook bereit. Verify-Token prüfen." },
    { status: 200 },
  );
}

export async function POST(req: Request) {
  const settings = await loadOperationalSettings();
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-hub-signature-256");
  const signatureOk = verifyMetaWebhookSignature({
    appSecret: process.env.WHATSAPP_META_APP_SECRET,
    rawBody,
    signatureHeader,
  });
  if (!signatureOk) {
    return NextResponse.json({ error: "Ungültige Signatur." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody || "{}") as any;
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value ?? {};
      const messages = Array.isArray(value?.messages) ? value.messages : [];
      for (const msg of messages) {
        const from = normalizePhone(String(msg?.from || ""));
        const textBody = String(msg?.text?.body || "").trim();
        if (!from) continue;

        const nextState = textBody ? "engaged" : "received";
        await prisma.whatsAppConversation.upsert({
          where: { id: from },
          update: {
            phoneNumber: from,
            state: nextState,
            data: {
              lastMessage: textBody,
              messageId: msg?.id ?? null,
              receivedAt: new Date().toISOString(),
            },
          },
          create: {
            id: from,
            phoneNumber: from,
            state: nextState,
            data: {
              lastMessage: textBody,
              messageId: msg?.id ?? null,
              receivedAt: new Date().toISOString(),
            },
          },
        }).catch(async () => {
          await prisma.whatsAppConversation.create({
            data: {
              phoneNumber: from,
              state: nextState,
              data: {
                lastMessage: textBody,
                messageId: msg?.id ?? null,
                receivedAt: new Date().toISOString(),
              },
            },
          });
        });

        if (
          settings.whatsappMetaEnabled &&
          settings.whatsappMetaPhoneNumberId &&
          settings.whatsappMetaAccessToken &&
          textBody
        ) {
          const reply = autoReplyForText(textBody);
          await sendMetaWhatsappText({
            phoneNumberId: settings.whatsappMetaPhoneNumberId,
            accessToken: settings.whatsappMetaAccessToken,
            to: from,
            text: reply,
          }).catch((error) => {
            console.error("[whatsapp/meta] failed to send auto reply", error);
          });
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
