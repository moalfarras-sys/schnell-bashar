/**
 * Format numbers in German locale (de-DE) to ensure Western digits (0-9)
 * instead of Arabic-Indic numerals when browser/OS uses Arabic locale.
 */
export function formatNumberDE(value: number): string {
  return new Intl.NumberFormat("de-DE").format(value);
}
