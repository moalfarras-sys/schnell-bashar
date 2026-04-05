export type SigningMode = "INTERNAL_ONLY";

export async function getSigningMode(): Promise<SigningMode> {
  return "INTERNAL_ONLY";
}

export async function isInternalOnlySigning(): Promise<boolean> {
  return true;
}
