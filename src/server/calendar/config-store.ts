import { randomUUID } from "crypto";

import { prisma } from "@/server/db/prisma";

export type CalendarServiceType = "MOVING" | "MONTAGE" | "ENTSORGUNG";

export type CalendarZone = {
  id: string;
  name: string;
  postalCodes: string[];
  active: boolean;
};

export type CalendarRule = {
  id: string;
  zoneId: string;
  serviceType: CalendarServiceType;
  weekday: number;
  from: string;
  to: string;
  active: boolean;
};

export type CalendarException = {
  id: string;
  zoneId?: string;
  serviceType?: CalendarServiceType;
  date: string;
  closed: boolean;
  note?: string;
};

const KEYS = {
  zones: "config.calendar.zones",
  rules: "config.calendar.rules",
  exceptions: "config.calendar.exceptions",
} as const;

const DEFAULT_ZONES: CalendarZone[] = [
  {
    id: "berlin-core",
    name: "Berlin Kerngebiet",
    postalCodes: ["10115", "10243", "10961", "12043", "13347"],
    active: true,
  },
];

const DEFAULT_RULES: CalendarRule[] = [
  { id: "r1", zoneId: "berlin-core", serviceType: "MOVING", weekday: 1, from: "08:00", to: "18:00", active: true },
  { id: "r2", zoneId: "berlin-core", serviceType: "MOVING", weekday: 2, from: "08:00", to: "18:00", active: true },
  { id: "r3", zoneId: "berlin-core", serviceType: "MOVING", weekday: 3, from: "08:00", to: "18:00", active: true },
  { id: "r4", zoneId: "berlin-core", serviceType: "MONTAGE", weekday: 4, from: "08:00", to: "17:00", active: true },
  { id: "r5", zoneId: "berlin-core", serviceType: "MONTAGE", weekday: 5, from: "08:00", to: "17:00", active: true },
  { id: "r6", zoneId: "berlin-core", serviceType: "ENTSORGUNG", weekday: 1, from: "09:00", to: "15:00", active: true },
  { id: "r7", zoneId: "berlin-core", serviceType: "ENTSORGUNG", weekday: 3, from: "09:00", to: "15:00", active: true },
  { id: "r8", zoneId: "berlin-core", serviceType: "ENTSORGUNG", weekday: 5, from: "09:00", to: "15:00", active: true },
];

function normalizePostalCodes(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((v) => String(v ?? "").replace(/[^\d]/g, "").trim())
    .filter((v) => v.length === 5);
}

function parseZones(raw: string | null | undefined): CalendarZone[] {
  if (!raw) return DEFAULT_ZONES;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_ZONES;
    const zones = parsed
      .map((z) => {
        const obj = z as Record<string, unknown>;
        return {
          id: String(obj.id ?? randomUUID()),
          name: String(obj.name ?? "").trim(),
          postalCodes: normalizePostalCodes(obj.postalCodes),
          active: obj.active !== false,
        } satisfies CalendarZone;
      })
      .filter((z) => z.name.length > 0);
    return zones.length > 0 ? zones : DEFAULT_ZONES;
  } catch {
    return DEFAULT_ZONES;
  }
}

function parseRules(raw: string | null | undefined): CalendarRule[] {
  if (!raw) return DEFAULT_RULES;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_RULES;
    const rules = parsed
      .map((r) => {
        const obj = r as Record<string, unknown>;
        const weekday = Number(obj.weekday ?? -1);
        const serviceType = String(obj.serviceType ?? "MOVING").toUpperCase();
        const from = String(obj.from ?? "").trim();
        const to = String(obj.to ?? "").trim();
        return {
          id: String(obj.id ?? randomUUID()),
          zoneId: String(obj.zoneId ?? ""),
          serviceType:
            serviceType === "MONTAGE" || serviceType === "ENTSORGUNG" ? serviceType : "MOVING",
          weekday: Number.isInteger(weekday) ? weekday : -1,
          from,
          to,
          active: obj.active !== false,
        } satisfies CalendarRule;
      })
      .filter((r) => r.zoneId && r.weekday >= 0 && r.weekday <= 6 && /^\d{2}:\d{2}$/.test(r.from) && /^\d{2}:\d{2}$/.test(r.to));
    return rules.length > 0 ? rules : DEFAULT_RULES;
  } catch {
    return DEFAULT_RULES;
  }
}

function parseExceptions(raw: string | null | undefined): CalendarException[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((e) => {
        const obj = e as Record<string, unknown>;
        const serviceType = obj.serviceType ? String(obj.serviceType).toUpperCase() : undefined;
        return {
          id: String(obj.id ?? randomUUID()),
          zoneId: obj.zoneId ? String(obj.zoneId) : undefined,
          serviceType:
            serviceType === "MOVING" || serviceType === "MONTAGE" || serviceType === "ENTSORGUNG"
              ? serviceType
              : undefined,
          date: String(obj.date ?? ""),
          closed: obj.closed !== false,
          note: obj.note ? String(obj.note) : undefined,
        } satisfies CalendarException;
      })
      .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date));
  } catch {
    return [];
  }
}

async function getValue(key: string) {
  const row = await prisma.contentSlot.findUnique({
    where: { key },
    select: { value: true },
  });
  return row?.value;
}

async function setValue(key: string, value: string) {
  await prisma.contentSlot.upsert({
    where: { key },
    update: { type: "config", value },
    create: { key, type: "config", value },
  });
}

export async function loadCalendarConfig() {
  const [zonesRaw, rulesRaw, exceptionsRaw] = await Promise.all([
    getValue(KEYS.zones),
    getValue(KEYS.rules),
    getValue(KEYS.exceptions),
  ]);

  const zones = parseZones(zonesRaw);
  const rules = parseRules(rulesRaw);
  const exceptions = parseExceptions(exceptionsRaw);

  return { zones, rules, exceptions };
}

export async function saveCalendarZones(zones: CalendarZone[]) {
  const clean = zones.map((z) => ({
    id: z.id || randomUUID(),
    name: z.name.trim(),
    postalCodes: normalizePostalCodes(z.postalCodes),
    active: z.active !== false,
  }));
  await setValue(KEYS.zones, JSON.stringify(clean));
  return clean;
}

export async function saveCalendarRules(rules: CalendarRule[]) {
  const clean = rules
    .map((r) => ({
      id: r.id || randomUUID(),
      zoneId: String(r.zoneId || "").trim(),
      serviceType: r.serviceType,
      weekday: Number(r.weekday),
      from: String(r.from || "").trim(),
      to: String(r.to || "").trim(),
      active: r.active !== false,
    }))
    .filter((r) => r.zoneId && r.weekday >= 0 && r.weekday <= 6 && /^\d{2}:\d{2}$/.test(r.from) && /^\d{2}:\d{2}$/.test(r.to));
  await setValue(KEYS.rules, JSON.stringify(clean));
  return clean;
}

export async function saveCalendarExceptions(exceptions: CalendarException[]) {
  const clean = exceptions
    .map((e) => ({
      id: e.id || randomUUID(),
      zoneId: e.zoneId?.trim() || undefined,
      serviceType: e.serviceType,
      date: e.date.trim(),
      closed: e.closed !== false,
      note: e.note?.trim() || undefined,
    }))
    .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date));
  await setValue(KEYS.exceptions, JSON.stringify(clean));
  return clean;
}

export function findZoneByPostalCode(
  zones: CalendarZone[],
  postalCode: string,
): CalendarZone | null {
  const zip = postalCode.replace(/[^\d]/g, "");
  for (const zone of zones) {
    if (!zone.active) continue;
    if (zone.postalCodes.includes(zip)) return zone;
  }
  return zones.find((z) => z.active) ?? null;
}
