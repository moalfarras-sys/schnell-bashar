const bucket = new Map<string, number[]>();

export function isHoneypotTriggered(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0;
}

export function isRateLimited(key: string, limit = 3, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const timestamps = bucket.get(key) ?? [];
  const next = timestamps.filter((ts) => now - ts < windowMs);
  const limited = next.length >= limit;
  if (!limited) next.push(now);
  bucket.set(key, next);
  return limited;
}

export function requestIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") || "unknown-ip";
}
