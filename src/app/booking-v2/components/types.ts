import type { BookingService, ExtrasState } from "@/app/booking-v2/lib/pricing";

export type AddressOption = {
  displayName: string;
  postalCode: string;
  city: string;
  lat: number;
  lon: number;
};

export type ContactState = {
  fullName: string;
  phone: string;
  email: string;
};

export type BookingDraft = {
  service: BookingService;
  from?: AddressOption;
  to?: AddressOption;
  volumeM3: number;
  preset: "studio" | "2zimmer" | "3zimmer" | "haus";
  extras: ExtrasState;
  contact: ContactState;
};

