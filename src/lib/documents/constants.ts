export const DOCUMENT_PREFIXES = {
  ANGEBOT: "ANG",
  RECHNUNG: "RE",
  AUFTRAG_VERTRAG: "AUF",
  MAHNUNG: "MAH",
  AGB_APPENDIX: "AGB",
} as const;

export const DEFAULT_VAT_RATE = 19;
export const DEFAULT_PAYMENT_TERM_DAYS = 7;
export const DEFAULT_SIGNING_LINK_TTL_HOURS = 168;

export const SIGNING_CONSENT_TEXT =
  "Ich bestätige die Richtigkeit der Angaben und erteile eine einfache elektronische Unterschrift.";
