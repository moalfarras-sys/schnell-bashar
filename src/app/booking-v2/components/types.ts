import type { BookingService, BookingSpeed, PriceCalcResponse } from "@/app/booking-v2/lib/pricing";

export type AddressOption = {
  displayName: string;
  postalCode: string;
  city: string;
  state?: string;
  street?: string;
  houseNumber?: string;
  lat: number;
  lon: number;
};

export type ExtrasState = {
  packing: boolean;
  stairs: boolean;
  express: boolean;
  noParkingZone: boolean;
  disposalBags: boolean;
};

export type ContactState = {
  fullName: string;
  phone: string;
  email: string;
  note: string;
};

export type ScheduleState = {
  desiredDate: string;
  timeWindow: "MORNING" | "AFTERNOON" | "EVENING" | "FLEXIBLE";
  speed: BookingSpeed;
};

export type BookingDraft = {
  service: BookingService;
  from?: AddressOption;
  to?: AddressOption;
  volumeM3: number;
  preset: "studio" | "2zimmer" | "3zimmer" | "haus";
  extras: ExtrasState;
  contact: ContactState;
  schedule: ScheduleState;
};

export type CalculationState = {
  loading: boolean;
  error: string | null;
  data: PriceCalcResponse | null;
};


