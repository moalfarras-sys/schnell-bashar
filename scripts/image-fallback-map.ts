export const IMAGE_FALLBACK_MAP: Record<string, string> = {};

const NON_IMAGE_ROUTE_PREFIXES = ["/media/slots", "/media/image-meta"];
const NON_IMAGE_ROUTE_EXACT = new Set(["/media/slots/sync"]);

export function normalizeMediaPath(value: string): string {
  const normalized = value.trim().replace(/\\/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function isNonImageRoutePath(value: string): boolean {
  const path = normalizeMediaPath(value);
  if (NON_IMAGE_ROUTE_EXACT.has(path)) return true;
  return NON_IMAGE_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function resolvePreferredImagePath(value: string): string {
  const path = normalizeMediaPath(value);
  return IMAGE_FALLBACK_MAP[path] ?? path;
}
