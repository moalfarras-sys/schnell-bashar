import { addDays, eachDayOfInterval, format, getISODay, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const DEFAULT_TIMEZONE = "Europe/Berlin";

export type AvailabilityRuleLite = {
  dayOfWeek: number; // ISO day of week: 1 (Mon) .. 7 (Sun)
  startTime: string; // "08:00"
  endTime: string; // "18:00"
  slotMinutes: number;
  capacity: number;
  active: boolean;
};

export type AvailabilityExceptionLite = {
  date: string; // "YYYY-MM-DD"
  closed: boolean;
  overrideCapacity?: number | null;
};

export type BookingInterval = {
  start: Date;
  end: Date;
};

function parseHm(hm: string) {
  const [h, m] = hm.split(":").map((x) => Number(x));
  return { h, m };
}

function makeZonedDate(date: Date, hm: string, tz = DEFAULT_TIMEZONE) {
  const { h, m } = parseHm(hm);
  const local = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    h,
    m,
    0,
    0,
  );
  return fromZonedTime(local, tz);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

export function computeEarliestDateISO(leadDays: number, tz = DEFAULT_TIMEZONE) {
  // Lead time is counted in local calendar days of the configured timezone.
  const today = parseISO(formatInTimeZone(new Date(), tz, "yyyy-MM-dd"));
  const earliest = addDays(today, Math.max(0, leadDays));
  return format(earliest, "yyyy-MM-dd");
}

export function getAvailableSlots(args: {
  fromISO: string; // YYYY-MM-DD or ISO datetime
  toISO: string; // YYYY-MM-DD or ISO datetime
  durationMinutes: number;
  rules: AvailabilityRuleLite[];
  exceptions: AvailabilityExceptionLite[];
  existingBookings: BookingInterval[];
  tz?: string;
  maxResults?: number;
}) {
  const tz = args.tz ?? DEFAULT_TIMEZONE;
  const maxResults = args.maxResults ?? 80;

  const fromDate = parseISO(args.fromISO);
  const toDate = parseISO(args.toISO);
  const startDate = fromDate <= toDate ? fromDate : toDate;
  const endDate = fromDate <= toDate ? toDate : fromDate;

  const days = eachDayOfInterval({
    start: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()),
    end: new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()),
  });

  const exceptionsByDate = new Map(args.exceptions.map((e) => [e.date, e]));
  const rulesByDay = new Map<number, AvailabilityRuleLite[]>();
  for (const r of args.rules.filter((r) => r.active)) {
    const list = rulesByDay.get(r.dayOfWeek) ?? [];
    list.push(r);
    rulesByDay.set(r.dayOfWeek, list);
  }

  const results: { start: Date; end: Date }[] = [];

  for (const day of days) {
    if (results.length >= maxResults) break;

    const dayKey = format(day, "yyyy-MM-dd");
    const ex = exceptionsByDate.get(dayKey);
    if (ex?.closed) continue;

    const dow = getISODay(day); // 1..7
    const dayRules = rulesByDay.get(dow) ?? [];
    if (dayRules.length === 0) continue;

    for (const rule of dayRules) {
      const capacity = ex?.overrideCapacity ?? rule.capacity;
      const slotMinutes = rule.slotMinutes;

      const dayStart = makeZonedDate(day, rule.startTime, tz);
      const dayEnd = makeZonedDate(day, rule.endTime, tz);

      // Generate candidates on the slot grid.
      for (
        let t = new Date(dayStart);
        t < dayEnd && results.length < maxResults;
        t = new Date(t.getTime() + slotMinutes * 60_000)
      ) {
        const start = t;
        const end = new Date(start.getTime() + args.durationMinutes * 60_000);
        if (end > dayEnd) break;

        // Capacity check per slot segment to avoid false negatives/positives.
        let ok = true;
        for (
          let seg = new Date(start);
          seg < end;
          seg = new Date(seg.getTime() + slotMinutes * 60_000)
        ) {
          const segEnd = new Date(seg.getTime() + slotMinutes * 60_000);
          const overlapCount = args.existingBookings.reduce((acc, b) => {
            return overlaps(seg, segEnd, b.start, b.end) ? acc + 1 : acc;
          }, 0);
          if (overlapCount >= capacity) {
            ok = false;
            break;
          }
        }

        if (ok) results.push({ start, end });
      }
    }
  }

  return results;
}

