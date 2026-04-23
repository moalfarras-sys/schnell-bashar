export function formatGermanDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatGermanCurrency(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

const INVALID_DISPLAY_VALUES = new Set([
  "",
  "-",
  "—",
  "undefined",
  "null",
  "nan",
  "n/a",
  "na",
  "none",
]);

const cuidLikePattern = /^c[a-z0-9]{20,}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeRawValue(raw: unknown) {
  if (raw == null) return null;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    return String(raw);
  }
  if (typeof raw !== "string") return null;
  const trimmed = raw.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isInternalIdentifier(raw: unknown) {
  const value = normalizeRawValue(raw);
  if (!value) return false;
  return cuidLikePattern.test(value);
}

export function cleanDisplayText(
  raw: unknown,
  options?: {
    allowInternalIdentifier?: boolean;
    kind?: "email" | "phone" | "address" | "name" | "generic";
  },
) {
  const value = normalizeRawValue(raw);
  if (!value) return null;
  if (INVALID_DISPLAY_VALUES.has(value.toLowerCase())) return null;
  if (!options?.allowInternalIdentifier && isInternalIdentifier(value)) return null;

  if (options?.kind === "email") {
    return emailPattern.test(value) ? value : null;
  }

  if (options?.kind === "phone") {
    if (emailPattern.test(value)) return null;
    return /\d/.test(value) ? value : null;
  }

  return value;
}

export function normalizeContactFields(raw: {
  email?: unknown;
  phone?: unknown;
}) {
  let email = cleanDisplayText(raw.email, { kind: "email" });
  let phone = cleanDisplayText(raw.phone, { kind: "phone" });

  const phoneAsEmail = cleanDisplayText(raw.phone, { kind: "email" });
  if (!email && phoneAsEmail) {
    email = phoneAsEmail;
    phone = null;
  }

  const emailAsPhone = cleanDisplayText(raw.email, { kind: "phone" });
  if (!phone && !email && emailAsPhone) {
    phone = emailAsPhone;
  }

  return { email, phone };
}

export function joinClean(
  parts: Array<unknown>,
  separator = " - ",
  options?: { allowInternalIdentifier?: boolean },
) {
  const cleaned = parts
    .map((value) =>
      cleanDisplayText(value, {
        allowInternalIdentifier: options?.allowInternalIdentifier,
      }),
    )
    .filter((value): value is string => Boolean(value));

  if (cleaned.length === 0) return null;
  return cleaned.join(separator);
}

export function buildLineItemDescription(title: unknown, description?: unknown) {
  const cleanTitle = cleanDisplayText(title);
  const cleanDescription = cleanDisplayText(description);

  if (cleanTitle && cleanDescription) {
    return cleanTitle === cleanDescription ? cleanTitle : `${cleanTitle} - ${cleanDescription}`;
  }

  return cleanTitle || cleanDescription || null;
}

export function formatPhone(raw: string | null | undefined) {
  return cleanDisplayText(raw, { kind: "phone" }) || "";
}

export function formatAddress(raw: string | null | undefined) {
  return cleanDisplayText(raw, { kind: "address" }) || "";
}
