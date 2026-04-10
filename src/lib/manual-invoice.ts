export type ManualInvoiceReferences = {
  orderRef?: string;
  offerRef?: string;
  contractRef?: string;
  projectRef?: string;
  externalLink?: string;
};

export type ManualInvoiceServiceDetails = {
  serviceType?: string;
  serviceDate?: string;
  workHours?: string;
  areaSqm?: string;
  volumeM3?: string;
  floor?: string;
  elevator?: string;
  startAddress?: string;
  destinationAddress?: string;
  additionalInfo?: string;
};

export type ManualInvoiceItemDetails = {
  detail?: string;
  workHours?: string;
  areaSqm?: string;
  volumeM3?: string;
  floor?: string;
  pieces?: string;
};

export type ManualInvoiceMeta = {
  version: 1;
  references?: ManualInvoiceReferences;
  serviceDetails?: ManualInvoiceServiceDetails;
  itemDetails?: ManualInvoiceItemDetails[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function cleanObject<T extends Record<string, unknown | undefined>>(
  input: T,
): Partial<Record<keyof T, string>> | undefined {
  const entries = Object.entries(input)
    .map(([key, value]) => [key, cleanString(value)] as const)
    .filter(([, value]) => value !== undefined);

  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries) as Partial<Record<keyof T, string>>;
}

function normalizeItemDetail(value: unknown): ManualInvoiceItemDetails | undefined {
  if (!isRecord(value)) return undefined;
  return cleanObject({
    detail: value.detail,
    workHours: value.workHours,
    areaSqm: value.areaSqm,
    volumeM3: value.volumeM3,
    floor: value.floor,
    pieces: value.pieces,
  }) as ManualInvoiceItemDetails | undefined;
}

export function normalizeManualInvoiceMeta(value: unknown): ManualInvoiceMeta | undefined {
  if (!isRecord(value) || value.version !== 1) return undefined;

  const references = isRecord(value.references)
    ? (cleanObject({
        orderRef: value.references.orderRef,
        offerRef: value.references.offerRef,
        contractRef: value.references.contractRef,
        projectRef: value.references.projectRef,
        externalLink: value.references.externalLink,
      }) as ManualInvoiceReferences | undefined)
    : undefined;

  const serviceDetails = isRecord(value.serviceDetails)
    ? (cleanObject({
        serviceType: value.serviceDetails.serviceType,
        serviceDate: value.serviceDetails.serviceDate,
        workHours: value.serviceDetails.workHours,
        areaSqm: value.serviceDetails.areaSqm,
        volumeM3: value.serviceDetails.volumeM3,
        floor: value.serviceDetails.floor,
        elevator: value.serviceDetails.elevator,
        startAddress: value.serviceDetails.startAddress,
        destinationAddress: value.serviceDetails.destinationAddress,
        additionalInfo: value.serviceDetails.additionalInfo,
      }) as ManualInvoiceServiceDetails | undefined)
    : undefined;

  const itemDetails = Array.isArray(value.itemDetails)
    ? value.itemDetails
        .map(normalizeItemDetail)
        .filter((item): item is ManualInvoiceItemDetails => Boolean(item))
    : undefined;

  if (!references && !serviceDetails && (!itemDetails || itemDetails.length === 0)) {
    return undefined;
  }

  return {
    version: 1,
    references,
    serviceDetails,
    itemDetails: itemDetails && itemDetails.length > 0 ? itemDetails : undefined,
  };
}

export function buildManualInvoiceMeta(input: {
  references?: ManualInvoiceReferences;
  serviceDetails?: ManualInvoiceServiceDetails;
  itemDetails?: ManualInvoiceItemDetails[];
}): ManualInvoiceMeta | undefined {
  const references = cleanObject({
    orderRef: input.references?.orderRef,
    offerRef: input.references?.offerRef,
    contractRef: input.references?.contractRef,
    projectRef: input.references?.projectRef,
    externalLink: input.references?.externalLink,
  }) as ManualInvoiceReferences | undefined;

  const serviceDetails = cleanObject({
    serviceType: input.serviceDetails?.serviceType,
    serviceDate: input.serviceDetails?.serviceDate,
    workHours: input.serviceDetails?.workHours,
    areaSqm: input.serviceDetails?.areaSqm,
    volumeM3: input.serviceDetails?.volumeM3,
    floor: input.serviceDetails?.floor,
    elevator: input.serviceDetails?.elevator,
    startAddress: input.serviceDetails?.startAddress,
    destinationAddress: input.serviceDetails?.destinationAddress,
    additionalInfo: input.serviceDetails?.additionalInfo,
  }) as ManualInvoiceServiceDetails | undefined;

  const itemDetails = input.itemDetails
    ?.map((item) =>
      cleanObject({
        detail: item.detail,
        workHours: item.workHours,
        areaSqm: item.areaSqm,
        volumeM3: item.volumeM3,
        floor: item.floor,
        pieces: item.pieces,
      }) as ManualInvoiceItemDetails | undefined,
    )
    .filter((item): item is ManualInvoiceItemDetails => Boolean(item));

  if (!references && !serviceDetails && (!itemDetails || itemDetails.length === 0)) {
    return undefined;
  }

  return {
    version: 1,
    references,
    serviceDetails,
    itemDetails: itemDetails && itemDetails.length > 0 ? itemDetails : undefined,
  };
}

export function manualInvoiceReferenceRows(input?: ManualInvoiceReferences): Array<{
  label: string;
  value: string;
}> {
  if (!input) return [];
  return [
    input.orderRef ? { label: "Auftrag", value: input.orderRef } : null,
    input.offerRef ? { label: "Angebot", value: input.offerRef } : null,
    input.contractRef ? { label: "Vertrag", value: input.contractRef } : null,
    input.projectRef ? { label: "Projekt", value: input.projectRef } : null,
    input.externalLink ? { label: "Link", value: input.externalLink } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));
}

export function manualInvoiceServiceRows(
  input?: ManualInvoiceServiceDetails,
): Array<{ label: string; value: string }> {
  if (!input) return [];
  return [
    input.serviceType ? { label: "Leistungsart", value: input.serviceType } : null,
    input.serviceDate ? { label: "Einsatzdatum", value: input.serviceDate } : null,
    input.workHours ? { label: "Arbeitsstunden", value: input.workHours } : null,
    input.areaSqm ? { label: "Fläche", value: `${input.areaSqm} m²` } : null,
    input.volumeM3 ? { label: "Volumen", value: `${input.volumeM3} m³` } : null,
    input.floor ? { label: "Etage", value: input.floor } : null,
    input.elevator ? { label: "Aufzug", value: input.elevator } : null,
    input.startAddress ? { label: "Startadresse", value: input.startAddress } : null,
    input.destinationAddress ? { label: "Zieladresse", value: input.destinationAddress } : null,
    input.additionalInfo ? { label: "Zusatzinfo", value: input.additionalInfo } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));
}

export function manualItemDetailLines(input?: ManualInvoiceItemDetails): string[] {
  if (!input) return [];
  return [
    input.detail,
    input.workHours ? `Arbeitsstunden: ${input.workHours}` : undefined,
    input.areaSqm ? `Fläche: ${input.areaSqm} m²` : undefined,
    input.volumeM3 ? `Volumen: ${input.volumeM3} m³` : undefined,
    input.floor ? `Etage: ${input.floor}` : undefined,
    input.pieces ? `Teile/Stückzahl: ${input.pieces}` : undefined,
  ].filter((line): line is string => Boolean(line));
}
