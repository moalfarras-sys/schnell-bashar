import { permanentRedirect } from "next/navigation";

export default async function LegacyBookingSuccessRedirect({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(sp)) {
    if (Array.isArray(value)) {
      for (const v of value) query.append(key, v);
    } else if (typeof value === "string" && value.length > 0) {
      query.set(key, value);
    }
  }

  const suffix = query.toString();
  permanentRedirect(suffix ? `/buchung/bestaetigt?${suffix}` : "/buchung/bestaetigt");
}
