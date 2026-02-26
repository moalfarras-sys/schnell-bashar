import { loadOperationalSettings } from "@/server/settings/operational-settings";

export type SigningMode = "INTERNAL_ONLY" | "HYBRID";

export async function getSigningMode(): Promise<SigningMode> {
  const envMode = String(process.env.SIGNING_MODE ?? "")
    .trim()
    .toUpperCase();
  if (envMode === "INTERNAL_ONLY") return "INTERNAL_ONLY";
  if (envMode === "HYBRID") return "HYBRID";

  try {
    const settings = await loadOperationalSettings();
    return settings.signingMode;
  } catch {
    return "INTERNAL_ONLY";
  }
}

export async function isInternalOnlySigning(): Promise<boolean> {
  return (await getSigningMode()) === "INTERNAL_ONLY";
}
