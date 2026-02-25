import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminPermission } from "@/server/auth/require-admin";
import { loadOperationalSettings } from "@/server/settings/operational-settings";
import { sendMetaWhatsappTemplate } from "@/server/integrations/whatsapp/meta";

const bodySchema = z.object({
  to: z.string().trim().min(8).max(24),
  templateName: z.string().trim().min(2).max(80).optional(),
  lang: z.string().trim().min(2).max(8).optional(),
  variables: z.array(z.string().trim().min(1).max(120)).max(6).optional(),
});

export async function POST(req: Request) {
  const auth = await requireAdminPermission("content.update");
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe.", details: parsed.error.flatten() }, { status: 400 });
  }

  const settings = await loadOperationalSettings();
  if (
    !settings.whatsappMetaEnabled ||
    !settings.whatsappMetaPhoneNumberId ||
    !settings.whatsappMetaAccessToken
  ) {
    return NextResponse.json(
      { error: "Meta WhatsApp ist nicht vollständig konfiguriert." },
      { status: 400 },
    );
  }

  const templateName =
    parsed.data.templateName || settings.whatsappMetaDefaultTemplate;
  const variables = (parsed.data.variables || []).map((v) => ({ type: "text" as const, text: v }));

  const result = await sendMetaWhatsappTemplate({
    phoneNumberId: settings.whatsappMetaPhoneNumberId,
    accessToken: settings.whatsappMetaAccessToken,
    to: parsed.data.to,
    templateName,
    lang: parsed.data.lang || "de",
    variables,
  });

  return NextResponse.json({ ok: true, result });
}
