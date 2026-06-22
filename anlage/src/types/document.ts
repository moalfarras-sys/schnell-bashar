export type DocumentType = "angebot" | "vertrag" | "rechnung";
export type JobType = "umzug" | "entsorgung" | "montage" | "sonstiges";

export type JobStatus =
  | "entwurf"
  | "angebot_gesendet"
  | "auftrag_bestaetigt"
  | "rechnung_erstellt"
  | "bezahlt";

export type Company = {
  id: string;
  companyId: string;
  slug: string;
  name: string;
  displayName: string;
  brandName: string;
  legalName: string;
  ownerName: string;
  fullLegalLine: string;
  street: string;
  postalCode: string;
  city: string;
  phone: string;
  website: string;
  email: string;
  iban: string;
  bic: string;
  bankName: string;
  accountHolder: string;
  vatId: string;
  taxNumber: string;
  financeOffice: string;
  logoPath: string;
  brand: CompanyBrand;
};

export type CompanyBrand = {
  primaryColor: string;
  secondaryColor: string;
  logoPath: string;
  footerText: string;
  legalName: string;
  displayName: string;
  brandName: string;
  fullLegalLine?: string;
};

export type Customer = {
  id: string;
  companyId: string;
  name: string;
  street: string;
  postalCode: string;
  city: string;
  phone: string;
  mobile: string;
  email: string;
  notes: string;
};

export type MoveAddress = {
  street: string;
  postalCode: string;
  city: string;
  floor: string;
  carryDistance: string;
  hasElevator: boolean;
};

export type LineItem = {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unitPriceCents: number;
};

export type Totals = {
  netCents: number;
  vatCents: number;
  grossCents: number;
};

export type Job = {
  id: string;
  companyId: string;
  status: JobStatus;
  jobType: JobType;
  customer: Customer;
  moveOutAddress: MoveAddress;
  moveInAddress: MoveAddress;
  moveDate: string;
  moveTime: string;
  distanceKm: number;
  volumeCbm: number;
  parkingPermit: boolean;
  paymentMethod: string;
  offerNumber: string;
  invoiceNumber: string;
  contractNumber: string;
  validUntil: string;
  invoiceDate: string;
  serviceDate: string;
  paymentDueDate: string;
  description: string;
  vatRate: number;
  items: LineItem[];
  notes: string;
  paymentAgreement: string;
  bankChangeNotice: boolean;
};

export type DocumentRecord = {
  id: string;
  companyId: string;
  customerId: string;
  jobId: string;
  documentType: DocumentType;
  documentNumber: string;
  documentDate: string;
  pdfPath: string;
  totalNetCents: number;
  vatAmountCents: number;
  totalGrossCents: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type Counters = {
  [companyId: string]: {
    offer: number;
    invoice: number;
    contract: number;
    job: number;
  };
};
