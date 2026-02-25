import { prisma } from "@/server/db/prisma";

export type OperationalSettings = {
  internalOrderEmailEnabled: boolean;
  customerConfirmationEmailEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappPhoneE164: string;
  whatsappTemplate: string;
  supportPhone: string;
  supportEmail: string;
};

const SETTINGS_KEYS = {
  internalOrderEmailEnabled: "config.notifications.internal_order_email_enabled",
  customerConfirmationEmailEnabled:
    "config.notifications.customer_confirmation_email_enabled",
  whatsappEnabled: "config.notifications.whatsapp_enabled",
  whatsappPhoneE164: "config.notifications.whatsapp_phone_e164",
  whatsappTemplate: "config.notifications.whatsapp_template",
  supportPhone: "config.notifications.support_phone",
  supportEmail: "config.notifications.support_email",
} as const;

const DEFAULT_SETTINGS: OperationalSettings = {
  internalOrderEmailEnabled: true,
  customerConfirmationEmailEnabled: true,
  whatsappEnabled: true,
  whatsappPhoneE164: "491729573681",
  whatsappTemplate:
    "Hallo! Ich habe eine Anfrage über die Website gesendet ({context}). Auftrags-ID: {publicId}.",
  supportPhone: "+49 172 9573681",
  supportEmail: "kontakt@schnellsicherumzug.de",
};

function toBool(value: string | null | undefined, fallback: boolean) {
  if (value == null) return fallback;
  const v = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return fallback;
}

function normalizePhoneDigits(value: string, fallback: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits.length >= 8 ? digits : fallback;
}

export async function loadOperationalSettings(): Promise<OperationalSettings> {
  const keys = Object.values(SETTINGS_KEYS);
  const rows = await prisma.contentSlot.findMany({
    where: {
      type: "config",
      key: { in: keys },
    },
    select: { key: true, value: true },
  });
  const map = new Map(rows.map((row) => [row.key, row.value ?? ""]));

  return {
    internalOrderEmailEnabled: toBool(
      map.get(SETTINGS_KEYS.internalOrderEmailEnabled),
      DEFAULT_SETTINGS.internalOrderEmailEnabled,
    ),
    customerConfirmationEmailEnabled: toBool(
      map.get(SETTINGS_KEYS.customerConfirmationEmailEnabled),
      DEFAULT_SETTINGS.customerConfirmationEmailEnabled,
    ),
    whatsappEnabled: toBool(
      map.get(SETTINGS_KEYS.whatsappEnabled),
      DEFAULT_SETTINGS.whatsappEnabled,
    ),
    whatsappPhoneE164: normalizePhoneDigits(
      map.get(SETTINGS_KEYS.whatsappPhoneE164) ?? "",
      DEFAULT_SETTINGS.whatsappPhoneE164,
    ),
    whatsappTemplate:
      map.get(SETTINGS_KEYS.whatsappTemplate)?.trim() ||
      DEFAULT_SETTINGS.whatsappTemplate,
    supportPhone:
      map.get(SETTINGS_KEYS.supportPhone)?.trim() || DEFAULT_SETTINGS.supportPhone,
    supportEmail:
      map.get(SETTINGS_KEYS.supportEmail)?.trim() || DEFAULT_SETTINGS.supportEmail,
  };
}

export async function saveOperationalSettings(
  incoming: Partial<OperationalSettings>,
) {
  const merged: OperationalSettings = {
    ...DEFAULT_SETTINGS,
    ...incoming,
    whatsappPhoneE164: normalizePhoneDigits(
      incoming.whatsappPhoneE164 ?? DEFAULT_SETTINGS.whatsappPhoneE164,
      DEFAULT_SETTINGS.whatsappPhoneE164,
    ),
    whatsappTemplate:
      incoming.whatsappTemplate?.trim() || DEFAULT_SETTINGS.whatsappTemplate,
    supportPhone: incoming.supportPhone?.trim() || DEFAULT_SETTINGS.supportPhone,
    supportEmail: incoming.supportEmail?.trim() || DEFAULT_SETTINGS.supportEmail,
  };

  await Promise.all([
    prisma.contentSlot.upsert({
      where: { key: SETTINGS_KEYS.internalOrderEmailEnabled },
      update: {
        type: "config",
        value: merged.internalOrderEmailEnabled ? "true" : "false",
      },
      create: {
        type: "config",
        key: SETTINGS_KEYS.internalOrderEmailEnabled,
        value: merged.internalOrderEmailEnabled ? "true" : "false",
      },
    }),
    prisma.contentSlot.upsert({
      where: { key: SETTINGS_KEYS.customerConfirmationEmailEnabled },
      update: {
        type: "config",
        value: merged.customerConfirmationEmailEnabled ? "true" : "false",
      },
      create: {
        type: "config",
        key: SETTINGS_KEYS.customerConfirmationEmailEnabled,
        value: merged.customerConfirmationEmailEnabled ? "true" : "false",
      },
    }),
    prisma.contentSlot.upsert({
      where: { key: SETTINGS_KEYS.whatsappEnabled },
      update: { type: "config", value: merged.whatsappEnabled ? "true" : "false" },
      create: {
        type: "config",
        key: SETTINGS_KEYS.whatsappEnabled,
        value: merged.whatsappEnabled ? "true" : "false",
      },
    }),
    prisma.contentSlot.upsert({
      where: { key: SETTINGS_KEYS.whatsappPhoneE164 },
      update: { type: "config", value: merged.whatsappPhoneE164 },
      create: {
        type: "config",
        key: SETTINGS_KEYS.whatsappPhoneE164,
        value: merged.whatsappPhoneE164,
      },
    }),
    prisma.contentSlot.upsert({
      where: { key: SETTINGS_KEYS.whatsappTemplate },
      update: { type: "config", value: merged.whatsappTemplate },
      create: {
        type: "config",
        key: SETTINGS_KEYS.whatsappTemplate,
        value: merged.whatsappTemplate,
      },
    }),
    prisma.contentSlot.upsert({
      where: { key: SETTINGS_KEYS.supportPhone },
      update: { type: "config", value: merged.supportPhone },
      create: {
        type: "config",
        key: SETTINGS_KEYS.supportPhone,
        value: merged.supportPhone,
      },
    }),
    prisma.contentSlot.upsert({
      where: { key: SETTINGS_KEYS.supportEmail },
      update: { type: "config", value: merged.supportEmail },
      create: {
        type: "config",
        key: SETTINGS_KEYS.supportEmail,
        value: merged.supportEmail,
      },
    }),
  ]);

  return merged;
}
