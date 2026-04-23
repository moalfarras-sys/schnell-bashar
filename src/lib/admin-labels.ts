export function documentStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    DRAFT: "Entwurf",
    INTERNAL_REVIEW: "Interne Prüfung",
    ADMIN_APPROVED: "Freigegeben",
    SENT: "Versendet",
    VIEWED: "Angesehen",
    ACCEPTED: "Bestätigt",
    SIGNATURE_PENDING: "Zur Unterschrift freigegeben",
    SIGNED: "Unterschrieben",
    VOID: "Ungültig",
    CANCELLED: "Storniert",
    SUPERSEDED: "Ersetzt",
  };

  return labels[status ?? ""] ?? status ?? "Unbekannt";
}

export function documentTypeLabel(type?: string | null) {
  const labels: Record<string, string> = {
    ANGEBOT: "Angebot",
    RECHNUNG: "Rechnung",
    AUFTRAG_VERTRAG: "Auftrag / Vertrag",
    MAHNUNG: "Mahnung",
    AGB_APPENDIX: "AGB-Zusatzseite",
  };

  return labels[type ?? ""] ?? type ?? "Dokument";
}

export function signingTokenStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    ACTIVE: "Aktiv",
    USED: "Verwendet",
    REVOKED: "Widerrufen",
    EXPIRED: "Abgelaufen",
    SUPERSEDED: "Ersetzt",
  };

  return labels[status ?? ""] ?? status ?? "Unbekannt";
}

export function requestWorkflowStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    NEW: "Neu",
    NEEDS_REVIEW: "Prüfung ausstehend",
    IN_REVIEW: "In Prüfung",
    OFFER_DRAFTED: "Angebot vorbereitet",
    OFFER_SENT: "Angebot versendet",
    OFFER_ACCEPTED: "Angebot bestätigt",
    CONTRACT_DRAFTED: "Vertrag vorbereitet",
    CONTRACT_APPROVED_FOR_SIGNATURE: "Zur Unterschrift freigegeben",
    SIGNATURE_LINK_SENT: "Signatur-Link versendet",
    SIGNED: "Unterschrieben",
    COMPLETED: "Abgeschlossen",
    CANCELLED: "Storniert",
    REJECTED: "Abgelehnt",
  };

  return labels[status ?? ""] ?? status ?? "Unbekannt";
}

export function orderStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    NEW: "Neu",
    REQUESTED: "Angefragt",
    CONFIRMED: "Bestätigt",
    IN_PROGRESS: "In Bearbeitung",
    DONE: "Abgeschlossen",
    CANCELLED: "Storniert",
  };

  return labels[status ?? ""] ?? status ?? "Unbekannt";
}
