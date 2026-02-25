"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CircleAlert,
  Loader2,
  Package,
  Recycle,
  Truck,
  Wrench,
} from "lucide-react";
import { addDays, format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/components/ui/cn";

import { AddressAutocomplete, type AddressOption } from "@/app/(wizard)/buchen/components/address-autocomplete";
import { estimateOrder, type PricingConfigLite } from "@/server/calc/estimate";
import type { WizardPayload } from "@/lib/wizard-schema";
import { formatNumberDE } from "@/lib/format-number";

type CatalogItem = {
  id: string;
  slug: string;
  categoryKey: string;
  nameDe: string;
  defaultVolumeM3: number;
  laborMinutesPerUnit: number;
  isHeavy: boolean;
};

type PricingForWizard = PricingConfigLite & {
  economyLeadDays: number;
  standardLeadDays: number;
  expressLeadDays: number;
};

type ServiceOptionConfig = {
  id: string;
  code: string;
  nameDe: string;
  descriptionDe: string | null;
  pricingType: "FLAT" | "PER_UNIT" | "PER_M3" | "PER_HOUR";
  defaultPriceCents: number;
  defaultLaborMinutes: number;
  defaultVolumeM3: number;
  requiresQuantity: boolean;
  requiresPhoto: boolean;
  isHeavy: boolean;
  sortOrder: number;
};

type ServiceModuleConfig = {
  id: string;
  slug: "MONTAGE" | "ENTSORGUNG";
  nameDe: string;
  descriptionDe: string | null;
  sortOrder: number;
  options: ServiceOptionConfig[];
};

type PromoRuleConfig = {
  id: string;
  code: string;
  moduleSlug: "MONTAGE" | "ENTSORGUNG" | null;
  serviceTypeScope: WizardPayload["serviceType"] | null;
  discountType: "PERCENT" | "FLAT_CENTS";
  discountValue: number;
  minOrderCents: number;
  maxDiscountCents: number | null;
  validFrom: string | null;
  validTo: string | null;
};

type BookingVariant = "default" | "montage" | "entsorgung";

type RoutePricingState = {
  distanceKm: number;
  source: "ors" | "cache" | "fallback";
  driveChargeCents: number;
  perKmCents: number;
  minDriveCents: number;
};

type Access = {
  propertyType: "apartment" | "house" | "office" | "storage";
  floor: number;
  elevator: "none" | "small" | "large";
  stairs: "none" | "few" | "many";
  parking: "easy" | "medium" | "hard";
  needNoParkingZone: boolean;
  carryDistanceM: number;
};

const defaultAccess: Access = {
  propertyType: "apartment",
  floor: 0,
  elevator: "none",
  stairs: "none",
  parking: "easy",
  needNoParkingZone: false,
  carryDistanceM: 0,
};

const addonDefs = [
  { key: "PACKING" as const, label: "Packservice" },
  { key: "DISMANTLE_ASSEMBLE" as const, label: "Möbel Demontage/Montage" },
  { key: "OLD_KITCHEN_DISPOSAL" as const, label: "Alte Küche entsorgen" },
  { key: "BASEMENT_ATTIC_CLEARING" as const, label: "Keller/Dachboden räumen" },
];

const disposalCategoryDefs = [
  { key: "mixed" as const, label: "Gemischter Sperrmüll" },
  { key: "wood" as const, label: "Holz" },
  { key: "metal" as const, label: "Metall" },
  { key: "electronics" as const, label: "Elektrogeräte" },
  { key: "textiles" as const, label: "Textilien" },
  { key: "cardboard" as const, label: "Karton/Papier" },
];

const serviceTypeLabels: Record<WizardPayload["serviceType"], string> = {
  MOVING: "Umzug",
  DISPOSAL: "Entsorgung",
  BOTH: "Umzug + Entsorgung",
};

const speedLabels: Record<WizardPayload["timing"]["speed"], string> = {
  ECONOMY: "Günstig",
  STANDARD: "Standard",
  EXPRESS: "Express",
};

const packageLabels: Record<WizardPayload["packageTier"], string> = {
  STANDARD: "Standard",
  PLUS: "Plus",
  PREMIUM: "Premium",
};

const packageDescriptions: Record<WizardPayload["serviceType"], Record<WizardPayload["packageTier"], string>> = {
  MOVING: {
    STANDARD: "Preisbewusst mit flexiblem Fenster",
    PLUS: "Ausgewogen, schnell und transparent",
    PREMIUM: "Priorisiert und schnellste Planung",
  },
  DISPOSAL: {
    STANDARD: "Kosteneffizient mit flexiblem Timing",
    PLUS: "Optimale Balance aus Preis und Tempo",
    PREMIUM: "Priorisierte Abholung mit Express-Handling",
  },
  BOTH: {
    STANDARD: "Kombi mit Fokus auf Budget",
    PLUS: "Kombi mit bester Gesamtbalance",
    PREMIUM: "Kombi mit maximaler Priorisierung",
  },
};
const contactLabels: Record<WizardPayload["customer"]["contactPreference"], string> = {
  PHONE: "Telefon",
  WHATSAPP: "WhatsApp",
  EMAIL: "E-Mail",
};

const addonLabels: Record<WizardPayload["addons"][number], string> = {
  PACKING: "Packservice",
  DISMANTLE_ASSEMBLE: "Möbel Demontage/Montage",
  OLD_KITCHEN_DISPOSAL: "Alte Küche entsorgen",
  BASEMENT_ATTIC_CLEARING: "Keller/Dachboden räumen",
};

function distanceSourceLabel(source?: "approx" | "ors" | "cache" | "fallback") {
  if (source === "ors") return "exakt berechnet";
  if (source === "cache") return "berechnet";
  if (source === "fallback") return "geschätzt";
  return "geschätzt";
}

function eur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

function setQty(prev: Record<string, number>, id: string, next: number) {
  const qty = Math.max(0, Math.min(20, next));
  const copy = { ...prev };
  if (qty === 0) delete copy[id];
  else copy[id] = qty;
  return copy;
}

function sumQty(items: Record<string, number>) {
  return Object.values(items).reduce((a, b) => a + (b || 0), 0);
}

function leadDays(speed: "ECONOMY" | "STANDARD" | "EXPRESS", pricing: PricingForWizard) {
  switch (speed) {
    case "ECONOMY":
      return pricing.economyLeadDays;
    case "EXPRESS":
      return pricing.expressLeadDays;
    default:
      return pricing.standardLeadDays;
  }
}

function ceilToGrid(minutes: number, grid: number) {
  return Math.ceil(minutes / grid) * grid;
}

export function BookingWizard(props: {
  catalog: CatalogItem[];
  pricing: PricingForWizard;
  modules: ServiceModuleConfig[];
  promoRules: PromoRuleConfig[];
  initialServiceType?: WizardPayload["serviceType"];
  variant?: BookingVariant;
}) {
  const router = useRouter();
  const variant = props.variant ?? "default";
  const lockedServiceType: WizardPayload["serviceType"] | undefined =
    variant === "montage" ? "MOVING" : variant === "entsorgung" ? "DISPOSAL" : undefined;
  const forcedAddons = useMemo<WizardPayload["addons"]>(
    () => (variant === "montage" ? ["DISMANTLE_ASSEMBLE"] : []),
    [variant],
  );
  const hideServiceStep = variant !== "default";
  const bookingContext: WizardPayload["bookingContext"] =
    variant === "montage"
      ? "MONTAGE"
      : variant === "entsorgung"
        ? "ENTSORGUNG"
        : "STANDARD";
  const storageKey = `ssu_wizard_v2_${variant}`;

  const [serviceType, setServiceType] = useState<WizardPayload["serviceType"]>(
    lockedServiceType ?? props.initialServiceType ?? "MOVING",
  );
  const [addons, setAddons] = useState<WizardPayload["addons"]>(forcedAddons);

  const [startAddress, setStartAddress] = useState<AddressOption | undefined>();
  const [destinationAddress, setDestinationAddress] = useState<AddressOption | undefined>();
  const [pickupAddress, setPickupAddress] = useState<AddressOption | undefined>();

  const [accessStart, setAccessStart] = useState<Access>({ ...defaultAccess });
  const [accessDestination, setAccessDestination] = useState<Access>({ ...defaultAccess });
  const [accessPickup, setAccessPickup] = useState<Access>({ ...defaultAccess });

  const [samePickupAsStart, setSamePickupAsStart] = useState(true);

  const [itemsMove, setItemsMove] = useState<Record<string, number>>({});
  const [itemsDisposal, setItemsDisposal] = useState<Record<string, number>>({});
  const [selectedServiceOptions, setSelectedServiceOptions] = useState<Record<string, number>>(
    {},
  );

  const [disposalCategories, setDisposalCategories] = useState<
    WizardPayload["disposal"] extends infer T ? (T extends { categories: infer C } ? C : never) : never
  >([]);
  const [disposalExtraM3, setDisposalExtraM3] = useState(0);
  const [forbiddenConfirmed, setForbiddenConfirmed] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);

  const [speed, setSpeed] = useState<WizardPayload["timing"]["speed"]>("STANDARD");
  const [packageTier, setPackageTier] = useState<WizardPayload["packageTier"]>("PLUS");
  const [offerCode, setOfferCode] = useState("");
  const earliestISO = useMemo(() => {
    const d = addDays(new Date(), leadDays(speed, props.pricing));
    return format(d, "yyyy-MM-dd");
  }, [speed, props.pricing]);

  const [preferredFrom, setPreferredFrom] = useState(earliestISO);
  const [preferredTo, setPreferredTo] = useState(() => format(addDays(new Date(), 14), "yyyy-MM-dd"));
  const [preferredTimeWindow, setPreferredTimeWindow] =
    useState<WizardPayload["timing"]["preferredTimeWindow"]>("FLEXIBLE");

  const [routePricing, setRoutePricing] = useState<RoutePricingState | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [contactPreference, setContactPreference] =
    useState<WizardPayload["customer"]["contactPreference"]>("PHONE");
  const [note, setNote] = useState("");

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const activeModuleSlug =
    variant === "montage"
      ? ("MONTAGE" as const)
      : variant === "entsorgung"
        ? ("ENTSORGUNG" as const)
        : null;

  const activeModuleOptions = useMemo(() => {
    if (!activeModuleSlug) return [] as ServiceOptionConfig[];
    return props.modules.find((module) => module.slug === activeModuleSlug)?.options ?? [];
  }, [activeModuleSlug, props.modules]);

  const estimateServiceOptions = useMemo(() => {
    const list = activeModuleSlug
      ? activeModuleOptions.map((option) => ({
          code: option.code,
          moduleSlug: activeModuleSlug,
          pricingType: option.pricingType,
          defaultPriceCents: option.defaultPriceCents,
          defaultLaborMinutes: option.defaultLaborMinutes,
          isHeavy: option.isHeavy,
          requiresQuantity: option.requiresQuantity,
        }))
      : props.modules.flatMap((module) =>
          module.options.map((option) => ({
            code: option.code,
            moduleSlug: module.slug,
            pricingType: option.pricingType,
            defaultPriceCents: option.defaultPriceCents,
            defaultLaborMinutes: option.defaultLaborMinutes,
            isHeavy: option.isHeavy,
            requiresQuantity: option.requiresQuantity,
          })),
        );

    return list;
  }, [activeModuleOptions, activeModuleSlug, props.modules]);

  const promoRuleMatch = useMemo(() => {
    const code = offerCode.trim().toUpperCase();
    if (!code) return null;

    const now = Date.now();
    const moduleSlug = bookingContext === "MONTAGE" ? "MONTAGE" : bookingContext === "ENTSORGUNG" ? "ENTSORGUNG" : null;

    return (
      props.promoRules.find((rule) => {
        if (rule.code.toUpperCase() !== code) return false;
        if (rule.moduleSlug && rule.moduleSlug !== moduleSlug) return false;
        if (rule.serviceTypeScope && rule.serviceTypeScope !== serviceType) return false;
        if (rule.validFrom && new Date(rule.validFrom).getTime() > now) return false;
        if (rule.validTo && new Date(rule.validTo).getTime() < now) return false;
        return true;
      }) ?? null
    );
  }, [bookingContext, offerCode, props.promoRules, serviceType]);

  const offerContext = useMemo(() => {
    const code = offerCode.trim().toUpperCase();
    if (!code) return undefined;
    if (!promoRuleMatch) {
      return { offerCode: code };
    }

    return {
      offerCode: code,
      ruleId: promoRuleMatch.id,
      appliedDiscountPercent:
        promoRuleMatch.discountType === "PERCENT" ? promoRuleMatch.discountValue : undefined,
      appliedDiscountCents:
        promoRuleMatch.discountType === "FLAT_CENTS" ? promoRuleMatch.discountValue : undefined,
      validUntil: promoRuleMatch.validTo ?? undefined,
    };
  }, [offerCode, promoRuleMatch]);

  // Keep pickup address in sync for BOTH (optional)
  useEffect(() => {
    if (serviceType !== "BOTH") return;
    if (!samePickupAsStart) return;
    if (startAddress) setPickupAddress(startAddress);
  }, [serviceType, samePickupAsStart, startAddress]);

  useEffect(() => {
    // reset timing preference when switching service type
    setPreferredTimeWindow("FLEXIBLE");
  }, [serviceType]);

  useEffect(() => {
    if (lockedServiceType && serviceType !== lockedServiceType) {
      setServiceType(lockedServiceType);
    }
  }, [lockedServiceType, serviceType]);

  useEffect(() => {
    if (forcedAddons.length === 0) return;
    setAddons((prev) => {
      const next = new Set(prev);
      for (const addon of forcedAddons) next.add(addon);
      return [...next] as WizardPayload["addons"];
    });
  }, [forcedAddons]);

  const effectivePickup = serviceType === "BOTH" && samePickupAsStart ? startAddress : pickupAddress;

  useEffect(() => {
    const shouldResolveRoute = serviceType === "MOVING" || serviceType === "BOTH";
    if (!shouldResolveRoute) {
      setRoutePricing(null);
      setRouteError(null);
      setRouteLoading(false);
      return;
    }

    if (!startAddress || !destinationAddress) {
      setRoutePricing(null);
      setRouteError("Bitte Start- und Zieladresse vollständig auswählen.");
      setRouteLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setRouteLoading(true);
      setRouteError(null);
      try {
        const res = await fetch("/api/distance/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            serviceType,
            profile: "driving-car",
            from: {
              lat: startAddress.lat,
              lon: startAddress.lon,
              postalCode: startAddress.postalCode,
            },
            to: {
              lat: destinationAddress.lat,
              lon: destinationAddress.lon,
              postalCode: destinationAddress.postalCode,
            },
          }),
        });

        const json = (await res.json().catch(() => null)) as
          | RoutePricingState
          | { error?: string }
          | null;
        if (!res.ok) {
          throw new Error(
            (json && "error" in json && json.error) ||
              "Distanz konnte nicht berechnet werden.",
          );
        }

        if (cancelled || !json || !("distanceKm" in json)) return;
        setRoutePricing({
          distanceKm: json.distanceKm,
          source: json.source,
          driveChargeCents: json.driveChargeCents,
          perKmCents: json.perKmCents,
          minDriveCents: json.minDriveCents,
        });
      } catch (error) {
        if (cancelled) return;
        setRoutePricing(null);
        if (error instanceof Error && error.name === "AbortError") return;
        setRouteError(
          error instanceof Error
            ? error.message
            : "Distanz konnte nicht berechnet werden.",
        );
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [serviceType, startAddress, destinationAddress]);

  const estimate = useMemo(() => {
    const payloadForEstimate: WizardPayload = {
      bookingContext,
      packageTier,
      offerContext,
      selectedServiceOptions: Object.entries(selectedServiceOptions)
        .filter(([, qty]) => qty > 0)
        .map(([code, qty]) => ({ code, qty })),
      serviceType,
      addons,
      pickupAddress: effectivePickup,
      startAddress,
      destinationAddress,
      accessPickup: effectivePickup ? accessPickup : undefined,
      accessStart: startAddress ? accessStart : undefined,
      accessDestination: destinationAddress ? accessDestination : undefined,
      itemsMove: serviceType === "MOVING" || serviceType === "BOTH" ? itemsMove : {},
      itemsDisposal: serviceType === "DISPOSAL" || serviceType === "BOTH" ? itemsDisposal : {},
      disposal:
        serviceType === "DISPOSAL" || serviceType === "BOTH"
          ? {
            categories: disposalCategories as any,
            volumeExtraM3: disposalExtraM3,
            forbiddenConfirmed,
          }
          : undefined,
      timing: {
        speed,
        requestedFrom: new Date(`${preferredFrom}T00:00:00.000Z`).toISOString(),
        requestedTo: new Date(`${preferredTo}T00:00:00.000Z`).toISOString(),
        preferredTimeWindow,
        jobDurationMinutes: 120,
      },
      customer: {
        name: customerName || "",
        phone: customerPhone || "",
        email: customerEmail || "",
        contactPreference,
        note,
      },
    };

    return estimateOrder(payloadForEstimate, {
      catalog: props.catalog,
      pricing: props.pricing,
      serviceOptions: estimateServiceOptions,
    }, routePricing
      ? {
          distanceKm: routePricing.distanceKm,
          distanceSource: routePricing.source,
          distancePricing: {
            perKmCents: routePricing.perKmCents,
            minDriveCents: routePricing.minDriveCents,
          },
        }
      : undefined);
  }, [
    bookingContext,
    packageTier,
    offerContext,
    selectedServiceOptions,
    serviceType,
    addons,
    effectivePickup,
    startAddress,
    destinationAddress,
    accessPickup,
    accessStart,
    accessDestination,
    itemsMove,
    itemsDisposal,
    disposalCategories,
    disposalExtraM3,
    forbiddenConfirmed,
    speed,
    preferredFrom,
    preferredTo,
    preferredTimeWindow,
    customerName,
    customerPhone,
    customerEmail,
    contactPreference,
    note,
    props.catalog,
    props.pricing,
    estimateServiceOptions,
    routePricing,
  ]);

  const jobDurationMinutes = useMemo(() => {
    const base = Math.ceil(estimate.laborHours * 60 + 30);
    return ceilToGrid(Math.max(120, base), 60);
  }, [estimate.laborHours]);

  // Keep requested date range valid.
  useEffect(() => {
    if (!preferredFrom || !preferredTo) return;
    if (preferredFrom < earliestISO) setPreferredFrom(earliestISO);
  }, [earliestISO, preferredFrom, preferredTo]);

  useEffect(() => {
    if (!preferredFrom || !preferredTo) return;
    if (preferredTo < preferredFrom) setPreferredTo(preferredFrom);
  }, [preferredFrom, preferredTo]);


  const steps = useMemo(
    () =>
      getSteps(serviceType, {
        hideServiceStep,
        itemsTitle: "Umfang",
      }),
    [serviceType, hideServiceStep],
  );
  const current = steps[step] ?? steps[0];

  const canNext = useMemo(() => {
    switch (current.key) {
      case "service":
        return true;
      case "location":
        if (serviceType === "MOVING") return !!startAddress && !!destinationAddress;
        if (serviceType === "DISPOSAL") return !!pickupAddress;
        return !!startAddress && !!destinationAddress; // BOTH
      case "items":
        if (variant !== "default") return Object.values(selectedServiceOptions).some((qty) => qty > 0);
        if (serviceType === "DISPOSAL") return sumQty(itemsDisposal) > 0 || disposalExtraM3 > 0;
        return sumQty(itemsMove) > 0;
      case "disposal":
        return forbiddenConfirmed;
      case "package":
        return true;
      case "timing":
        return Boolean(preferredFrom && preferredTo && preferredFrom <= preferredTo);
      case "customer":
        return customerName.trim().length >= 2 && customerPhone.trim().length >= 6 && customerEmail.includes("@");
      case "summary":
        return true;
      default:
        return false;
    }
  }, [
    current.key,
    variant,
    serviceType,
    startAddress,
    destinationAddress,
    pickupAddress,
    itemsMove,
    itemsDisposal,
    selectedServiceOptions,
    disposalExtraM3,
    forbiddenConfirmed,
    preferredFrom,
    preferredTo,
    customerName,
    customerPhone,
    customerEmail,
  ]);

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: WizardPayload = {
        bookingContext,
        packageTier,
        offerContext,
        selectedServiceOptions: Object.entries(selectedServiceOptions)
          .filter(([, qty]) => qty > 0)
          .map(([code, qty]) => ({ code, qty })),
        serviceType,
        addons,
        pickupAddress: serviceType === "DISPOSAL" ? pickupAddress : effectivePickup,
        startAddress: serviceType === "MOVING" || serviceType === "BOTH" ? startAddress : undefined,
        destinationAddress:
          serviceType === "MOVING" || serviceType === "BOTH" ? destinationAddress : undefined,
        accessPickup:
          serviceType === "DISPOSAL" || serviceType === "BOTH"
            ? (serviceType === "BOTH" && samePickupAsStart ? accessStart : accessPickup)
            : undefined,
        accessStart: serviceType === "MOVING" || serviceType === "BOTH" ? accessStart : undefined,
        accessDestination:
          serviceType === "MOVING" || serviceType === "BOTH" ? accessDestination : undefined,
        itemsMove: serviceType === "MOVING" || serviceType === "BOTH" ? itemsMove : {},
        itemsDisposal: serviceType === "DISPOSAL" || serviceType === "BOTH" ? itemsDisposal : {},
        disposal:
          serviceType === "DISPOSAL" || serviceType === "BOTH"
            ? {
              categories: disposalCategories as any,
              volumeExtraM3: disposalExtraM3,
              forbiddenConfirmed,
            }
            : undefined,
        timing: {
          speed,
          requestedFrom: new Date(`${preferredFrom}T00:00:00.000Z`).toISOString(),
          requestedTo: new Date(`${preferredTo}T00:00:00.000Z`).toISOString(),
          preferredTimeWindow,
          jobDurationMinutes,
        },
        customer: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          email: customerEmail.trim(),
          contactPreference,
          note: note.trim(),
        },
      };

      const fd = new FormData();
      fd.set("payload", JSON.stringify(payload));
      fd.set("website", "");
      for (const f of photos.slice(0, 10)) fd.append("photos", f);

      const res = await fetch("/api/orders", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Senden fehlgeschlagen.");

      localStorage.removeItem(storageKey);
      const params = new URLSearchParams({ order: json.publicId });
      if (json.pdfToken) params.set("token", json.pdfToken);
      if (json.offer?.token) params.set("offerToken", json.offer.token);
      if (json.offer?.offerNo) params.set("offerNo", json.offer.offerNo);
      router.push(`/buchen/bestaetigt?${params.toString()}`);
    } catch (e: any) {
      setSubmitError(e?.message || "Senden fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  // Persist wizard state (excluding files)
  useEffect(() => {
    const data = {
      serviceType,
      packageTier,
      offerCode,
      addons,
      startAddress,
      destinationAddress,
      pickupAddress,
      accessStart,
      accessDestination,
      accessPickup,
      samePickupAsStart,
      itemsMove,
      itemsDisposal,
      selectedServiceOptions,
      disposalCategories,
      disposalExtraM3,
      forbiddenConfirmed,
      speed,
      preferredFrom,
      preferredTo,
      preferredTimeWindow,
      customerName,
      customerPhone,
      customerEmail,
      contactPreference,
      note,
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [
    storageKey,
    serviceType,
    packageTier,
    offerCode,
    addons,
    startAddress,
    destinationAddress,
    pickupAddress,
    accessStart,
    accessDestination,
    accessPickup,
    samePickupAsStart,
    itemsMove,
    itemsDisposal,
    selectedServiceOptions,
    disposalCategories,
    disposalExtraM3,
    forbiddenConfirmed,
    speed,
    preferredFrom,
    preferredTo,
    preferredTimeWindow,
    customerName,
    customerPhone,
    customerEmail,
    contactPreference,
    note,
  ]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.serviceType && !lockedServiceType) setServiceType(d.serviceType);
      if (d.packageTier) setPackageTier(d.packageTier);
      if (typeof d.offerCode === "string") setOfferCode(d.offerCode);
      if (Array.isArray(d.addons)) {
        const next = new Set<WizardPayload["addons"][number]>(d.addons);
        for (const addon of forcedAddons) next.add(addon);
        setAddons([...next] as WizardPayload["addons"]);
      }
      setStartAddress(d.startAddress);
      setDestinationAddress(d.destinationAddress);
      setPickupAddress(d.pickupAddress);
      setAccessStart(d.accessStart ?? defaultAccess);
      setAccessDestination(d.accessDestination ?? defaultAccess);
      setAccessPickup(d.accessPickup ?? defaultAccess);
      setSamePickupAsStart(!!d.samePickupAsStart);
      setItemsMove(d.itemsMove ?? {});
      setItemsDisposal(d.itemsDisposal ?? {});
      setSelectedServiceOptions(d.selectedServiceOptions ?? {});
      setDisposalCategories(d.disposalCategories ?? []);
      setDisposalExtraM3(Number(d.disposalExtraM3 ?? 0));
      setForbiddenConfirmed(!!d.forbiddenConfirmed);
      setSpeed(d.speed ?? "STANDARD");
      setPreferredFrom(d.preferredFrom ?? d.requestedFrom ?? earliestISO);
      setPreferredTo(d.preferredTo ?? d.requestedTo ?? preferredTo);
      setPreferredTimeWindow(d.preferredTimeWindow ?? "FLEXIBLE");
      setCustomerName(d.customerName ?? "");
      setCustomerPhone(d.customerPhone ?? "");
      setCustomerEmail(d.customerEmail ?? "");
      setContactPreference(d.contactPreference ?? "PHONE");
      setNote(d.note ?? "");
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  return (
    <Container className="py-10 lg:py-12">
      {variant !== "default" ? (
        <div className="mb-6 rounded-3xl border border-brand-300/40 bg-gradient-to-r from-slate-900/95 via-slate-900/92 to-brand-950/40 px-5 py-4 text-sm text-slate-100 shadow-[0_10px_28px_rgba(2,8,23,0.45)]">
          {variant === "montage" ? (
            <div>
              <div className="text-base font-extrabold">Montage-Buchung</div>
              <div className="mt-1 font-semibold">
                Dieser Ablauf ist speziell für Möbelmontage optimiert. Die Leistung
                <span className="font-extrabold"> &quot;Möbel Demontage/Montage&quot;</span> ist bereits enthalten.
              </div>
            </div>
          ) : (
            <div>
              <div className="text-base font-extrabold">Entsorgungs-Buchung</div>
              <div className="mt-1 font-semibold">
                Dieser Ablauf ist auf Sperrmüll und Entsorgung ausgelegt, inklusive Kategorien, Verbots-Check und Foto-Upload.
              </div>
            </div>
          )}
        </div>
      ) : null}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="glass-card-solid rounded-3xl">
          <WizardHeader steps={steps} step={step} />

          <div className="p-6 sm:p-8">
            {current.key === "service" ? (
              <StepService
                serviceType={serviceType}
                setServiceType={setServiceType}
                addons={addons}
                setAddons={setAddons}
                forcedAddons={forcedAddons}
              />
            ) : null}

            {current.key === "location" ? (
              <StepLocation
                serviceType={serviceType}
                startAddress={startAddress}
                setStartAddress={setStartAddress}
                destinationAddress={destinationAddress}
                setDestinationAddress={setDestinationAddress}
                pickupAddress={pickupAddress}
                setPickupAddress={setPickupAddress}
                samePickupAsStart={samePickupAsStart}
                setSamePickupAsStart={setSamePickupAsStart}
                accessStart={accessStart}
                setAccessStart={setAccessStart}
                accessDestination={accessDestination}
                setAccessDestination={setAccessDestination}
                accessPickup={accessPickup}
                setAccessPickup={setAccessPickup}
              />
            ) : null}

            {current.key === "items" ? (
              variant === "default" ? (
                <StepItems
                  serviceType={serviceType}
                  catalog={props.catalog}
                  itemsMove={itemsMove}
                  setItemsMove={setItemsMove}
                  itemsDisposal={itemsDisposal}
                  setItemsDisposal={setItemsDisposal}
                />
              ) : (
                <StepServiceOptions
                  title={variant === "montage" ? "Leistungen & Geräte" : "Entsorgungsleistungen"}
                  options={activeModuleOptions}
                  selected={selectedServiceOptions}
                  setSelected={setSelectedServiceOptions}
                />
              )
            ) : null}

            {current.key === "disposal" ? (
              <StepDisposal
                serviceType={serviceType}
                catalog={props.catalog}
                itemsDisposal={itemsDisposal}
                setItemsDisposal={setItemsDisposal}
                disposalCategories={disposalCategories as any}
                setDisposalCategories={setDisposalCategories as any}
                disposalExtraM3={disposalExtraM3}
                setDisposalExtraM3={setDisposalExtraM3}
                forbiddenConfirmed={forbiddenConfirmed}
                setForbiddenConfirmed={setForbiddenConfirmed}
                photos={photos}
                setPhotos={setPhotos}
              />
            ) : null}

            {current.key === "package" ? (
              <StepPackage
                serviceType={serviceType}
                packageTier={packageTier}
                setPackageTier={setPackageTier}
                offerCode={offerCode}
                setOfferCode={setOfferCode}
                offerContext={offerContext}
                promoMatched={!!promoRuleMatch}
              />
            ) : null}

            {current.key === "timing" ? (
              <StepTiming
                speed={speed}
                setSpeed={setSpeed}
                earliestISO={earliestISO}
                preferredFrom={preferredFrom}
                setPreferredFrom={setPreferredFrom}
                preferredTo={preferredTo}
                setPreferredTo={setPreferredTo}
                preferredTimeWindow={preferredTimeWindow}
                setPreferredTimeWindow={setPreferredTimeWindow}
                jobDurationMinutes={jobDurationMinutes}
              />
            ) : null}

            {current.key === "customer" ? (
              <StepCustomer
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerPhone={customerPhone}
                setCustomerPhone={setCustomerPhone}
                customerEmail={customerEmail}
                setCustomerEmail={setCustomerEmail}
                contactPreference={contactPreference}
                setContactPreference={setContactPreference}
                note={note}
                setNote={setNote}
              />
            ) : null}

            {current.key === "summary" ? (
              <StepSummary
                serviceType={serviceType}
                packageTier={packageTier}
                offerContext={offerContext}
                selectedServiceOptions={selectedServiceOptions}
                serviceOptions={activeModuleOptions}
                addons={addons}
                startAddress={startAddress}
                destinationAddress={destinationAddress}
                pickupAddress={effectivePickup}
                accessStart={serviceType === "MOVING" || serviceType === "BOTH" ? accessStart : undefined}
                accessDestination={
                  serviceType === "MOVING" || serviceType === "BOTH"
                    ? accessDestination
                    : undefined
                }
                accessPickup={
                  serviceType === "DISPOSAL" || serviceType === "BOTH"
                    ? serviceType === "BOTH" && samePickupAsStart
                      ? accessStart
                      : accessPickup
                    : undefined
                }
                itemsMove={itemsMove}
                itemsDisposal={itemsDisposal}
                catalog={props.catalog}
                disposalCategories={disposalCategories as any}
                disposalExtraM3={disposalExtraM3}
                forbiddenConfirmed={forbiddenConfirmed}
                speed={speed}
                requestedFrom={preferredFrom}
                requestedTo={preferredTo}
                preferredTimeWindow={preferredTimeWindow}
                customerName={customerName}
                customerPhone={customerPhone}
                customerEmail={customerEmail}
                contactPreference={contactPreference}
                note={note}
                estimate={estimate}
                routeLoading={routeLoading}
                routeError={routeError}
              />
            ) : null}

            {submitError ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 shadow-premiumSoft">
                {submitError}
              </div>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="outline"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0 || submitting}
                className="transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <ArrowLeft className="h-4 w-4" />
                Zurück
              </Button>

              {current.key !== "summary" ? (
                <Button
                  onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                  disabled={!canNext || submitting}
                  className="shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                >
                  Weiter
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={submitting || !canNext} className="shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Anfrage senden
                </Button>
              )}
            </div>

            <div className="mt-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
              Hinweis: Preise sind Schätzwerte auf Basis Ihrer Auswahl. Nach Prüfung bestätigen wir das finale Angebot.
            </div>
          </div>
        </div>

        <aside className="glass-card-solid h-fit rounded-3xl p-6 lg:sticky lg:top-24">
          <div className="text-sm font-extrabold text-slate-900 dark:text-white">Live-Schätzung</div>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="rounded-2xl border border-slate-300/80 bg-gradient-to-br from-slate-50 to-[color:var(--surface-elevated)] p-4 shadow-sm dark:border-slate-600 dark:from-slate-800/90 dark:to-slate-900/90">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Volumen</div>
              <div className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{formatNumberDE(estimate.totalVolumeM3)} m³</div>
            </div>
            <div className="rounded-2xl border border-slate-300/80 bg-gradient-to-br from-slate-50 to-[color:var(--surface-elevated)] p-4 shadow-sm dark:border-slate-600 dark:from-slate-800/90 dark:to-slate-900/90">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Arbeitszeit</div>
              <div className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{formatNumberDE(estimate.laborHours)} Std.</div>
            </div>
            <div className="rounded-2xl border border-brand-400/70 bg-gradient-to-br from-brand-50 to-[color:var(--surface-elevated)] p-4 shadow-sm dark:border-brand-500/70 dark:from-brand-900/25 dark:to-slate-900/95">
              <div className="text-xs font-bold text-brand-700 dark:text-brand-300">Preisrahmen</div>
              <div className="mt-1 text-lg font-extrabold text-brand-800 dark:text-brand-300">
                {eur(estimate.priceMinCents)}  {eur(estimate.priceMaxCents)}
              </div>
              {estimate.distanceKm != null ? (
                <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Distanz ({distanceSourceLabel(estimate.distanceSource)}):{" "}
                  {formatNumberDE(estimate.distanceKm)} km
                </div>
              ) : null}
              {(serviceType === "MOVING" || serviceType === "BOTH") && estimate.driveChargeCents > 0 ? (
                <div className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Fahrkosten: {eur(estimate.driveChargeCents)}
                </div>
              ) : null}
              {routeLoading ? (
                <div className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Distanz wird berechnet…
                </div>
              ) : null}
              {routeError ? (
                <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                  {routeError}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border-2 border-slate-200 bg-[color:var(--surface-elevated)] p-4 text-sm shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/60">
            <div className="flex items-start gap-2">
              <CircleAlert className="mt-0.5 h-5 w-5 text-brand-700 dark:text-brand-400" />
              <div>
                <div className="font-extrabold text-slate-900 dark:text-white">Ohne lange Texte</div>
                <div className="mt-1 text-slate-600 dark:text-slate-400">
                  Bitte wählen Sie möglichst genau aus. Notizen sind optional und kurz.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
            Probleme? <Link className="font-bold text-brand-700 hover:underline dark:text-brand-300" href="/kontakt">Kontakt</Link>
          </div>
        </aside>
      </div>
    </Container>
  );
}

function getSteps(
  serviceType: WizardPayload["serviceType"],
  options?: { hideServiceStep?: boolean; itemsTitle?: string },
) {
  const itemsTitle = options?.itemsTitle?.trim() || "Umfang";
  const base = [
    { key: "service" as const, title: "Leistung" },
    { key: "location" as const, title: "Adressen" },
    { key: "items" as const, title: itemsTitle },
  ];
  const disposal = { key: "disposal" as const, title: "Entsorgung" };
  const packageStep = { key: "package" as const, title: "Paket & Angebot" };
  const rest = [
    { key: "timing" as const, title: "Wunschtermin" },
    { key: "customer" as const, title: "Kontakt" },
    { key: "summary" as const, title: "Prüfen & Senden" },
  ];

  const withService =
    serviceType === "DISPOSAL" || serviceType === "BOTH"
      ? [...base, disposal, packageStep, ...rest]
      : [...base, packageStep, ...rest];

  if (options?.hideServiceStep) {
    return withService.filter((step) => step.key !== "service");
  }

  return withService;
}

function WizardHeader(props: { steps: { key: string; title: string }[]; step: number }) {
  const pct = Math.round(((props.step + 1) / props.steps.length) * 100);
  return (
    <div className="border-b border-slate-300 bg-gradient-to-r from-[color:var(--surface-elevated)] via-brand-50/50 to-slate-50 p-6 sm:p-8 dark:border-slate-700 dark:from-slate-900/95 dark:via-slate-900/92 dark:to-brand-950/25">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-brand-700 dark:text-brand-300">
            Schritt {props.step + 1} von {props.steps.length}
          </div>
          <div className="mt-1 text-xl font-extrabold text-slate-950 dark:text-white">
            {props.steps[props.step]?.title}
          </div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 text-sm font-extrabold text-brand-700 shadow-sm dark:from-brand-900/50 dark:to-slate-800 dark:text-brand-300">
          {pct}%
        </div>
      </div>
      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {props.steps.map((s, idx) => (
          <div
            key={s.key}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-300",
              idx === props.step
                ? "bg-brand-600 text-white shadow-md shadow-brand-200 dark:shadow-brand-900/40"
                : idx < props.step
                  ? "bg-brand-50 text-brand-800 dark:bg-brand-900/35 dark:text-brand-300"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
            )}
          >
            {idx < props.step ? (
              <span className="mr-1">S</span>
            ) : null}
            {s.title}
          </div>
        ))}
      </div>
    </div>
  );
}

function StepService(props: {
  serviceType: WizardPayload["serviceType"];
  setServiceType: (v: WizardPayload["serviceType"]) => void;
  addons: WizardPayload["addons"];
  setAddons: (v: WizardPayload["addons"]) => void;
  forcedAddons: WizardPayload["addons"];
}) {
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        <ServiceCard
          active={props.serviceType === "MOVING"}
          title="Umzug"
          desc="Transport und Planung - privat oder gewerblich."
          icon={Truck}
          onClick={() => props.setServiceType("MOVING")}
        />
        <ServiceCard
          active={props.serviceType === "DISPOSAL"}
          title="Entsorgung / Sperrmüll"
          desc="Abholung und Entsorgung - klar strukturiert."
          icon={Recycle}
          onClick={() => props.setServiceType("DISPOSAL")}
        />
        <ServiceCard
          active={props.serviceType === "BOTH"}
          title="Umzug + Entsorgung"
          desc="Beides kombiniert - weniger Aufwand."
          icon={Package}
          onClick={() => props.setServiceType("BOTH")}
        />
      </div>

      <div className="mt-8">
        <div className="text-sm font-extrabold text-slate-900">Optionale Zusatzleistungen</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {addonDefs.map((a) => {
            const checked = props.addons.includes(a.key);
            const forced = props.forcedAddons.includes(a.key);
            return (
              <label
                key={a.key}
                className={cn(
                  "glass-card-solid glass-card-hover flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-all duration-300",
                  checked ? "border-brand-400 bg-brand-50 shadow-md shadow-brand-100" : "border-slate-300",
                )}
              >
                <Checkbox
                  checked={checked}
                  disabled={forced}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...props.addons, a.key]
                      : props.addons.filter((x) => x !== a.key);
                    props.setAddons(next);
                  }}
                />
                <div>
                  <div className="text-sm font-extrabold text-slate-900">{a.label}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-600">
                    {forced
                      ? "In diesem Buchungsweg automatisch enthalten."
                      : "Als strukturierte Option - Details klären wir im Angebot."}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ServiceCard(props: {
  active: boolean;
  title: string;
  desc: string;
  icon: any;
  onClick: () => void;
}) {
  const Icon = props.icon;
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        "premium-elevate rounded-3xl border-2 p-6 text-left shadow-md",
        props.active ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30 dark:border-brand-400" : "border-slate-300 bg-[color:var(--surface-elevated)] hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800/60 dark:hover:border-slate-500",
      )}
      aria-pressed={props.active}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "inline-flex h-12 w-12 items-center justify-center rounded-2xl shadow-md",
            props.active ? "bg-brand-600 text-white" : "bg-slate-800 text-white",
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="text-lg font-extrabold text-slate-950">{props.title}</div>
      </div>
      <div className="mt-3 text-sm font-semibold text-slate-700">{props.desc}</div>
    </button>
  );
}

function StepLocation(props: {
  serviceType: WizardPayload["serviceType"];
  startAddress?: AddressOption;
  setStartAddress: (v?: AddressOption) => void;
  destinationAddress?: AddressOption;
  setDestinationAddress: (v?: AddressOption) => void;
  pickupAddress?: AddressOption;
  setPickupAddress: (v?: AddressOption) => void;
  samePickupAsStart: boolean;
  setSamePickupAsStart: (v: boolean) => void;
  accessStart: Access;
  setAccessStart: (v: Access) => void;
  accessDestination: Access;
  setAccessDestination: (v: Access) => void;
  accessPickup: Access;
  setAccessPickup: (v: Access) => void;
}) {
  return (
    <div className="grid gap-8">
      {props.serviceType === "MOVING" || props.serviceType === "BOTH" ? (
        <div className="grid gap-6">
          <AddressAutocomplete
            label="Startadresse"
            required
            value={props.startAddress}
            onChange={props.setStartAddress}
          />
          <AccessCard title="Zugang (Start)" value={props.accessStart} onChange={props.setAccessStart} />

          <AddressAutocomplete
            label="Zieladresse"
            required
            value={props.destinationAddress}
            onChange={props.setDestinationAddress}
          />
          <AccessCard
            title="Zugang (Ziel)"
            value={props.accessDestination}
            onChange={props.setAccessDestination}
          />
        </div>
      ) : null}

      {props.serviceType === "DISPOSAL" ? (
        <div className="grid gap-6">
          <AddressAutocomplete
            label="Abholadresse"
            required
            value={props.pickupAddress}
            onChange={props.setPickupAddress}
          />
          <AccessCard title="Zugang (Abholung)" value={props.accessPickup} onChange={props.setAccessPickup} />
        </div>
      ) : null}

      {props.serviceType === "BOTH" ? (
        <div className="premium-surface-emphasis rounded-3xl p-6">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={props.samePickupAsStart}
              onChange={(e) => props.setSamePickupAsStart(e.target.checked)}
            />
            <div>
              <div className="text-sm font-extrabold text-slate-900">
                Abholadresse für Entsorgung = Startadresse
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-700">
                Aktivieren, um Tippen zu sparen. (Sie können später eine andere Abholadresse wählen.)
              </div>
            </div>
          </div>

          {!props.samePickupAsStart ? (
            <div className="mt-6 grid gap-6">
              <AddressAutocomplete
                label="Abholadresse (Entsorgung)"
                value={props.pickupAddress}
                onChange={props.setPickupAddress}
              />
              <AccessCard
                title="Zugang (Abholung)"
                value={props.accessPickup}
                onChange={props.setAccessPickup}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AccessCard(props: { title: string; value: Access; onChange: (v: Access) => void }) {
  const v = props.value;
  const set = (patch: Partial<Access>) => props.onChange({ ...v, ...patch });
  return (
    <div className="premium-surface-emphasis rounded-3xl p-6">
      <div className="text-sm font-extrabold text-slate-900">{props.title}</div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-xs font-bold text-slate-600">Objekt</div>
          <div className="mt-2">
            <Select
              value={v.propertyType}
              onChange={(e) => set({ propertyType: e.target.value as any })}
            >
              <option value="apartment">Wohnung</option>
              <option value="house">Haus</option>
              <option value="office">Büro</option>
              <option value="storage">Lager</option>
            </Select>
          </div>
        </div>

        <div>
          <div className="text-xs font-bold text-slate-600">Etage</div>
          <div className="mt-2">
            <Select value={String(v.floor)} onChange={(e) => set({ floor: Number(e.target.value) })}>
              <option value="-1">Keller (-1)</option>
              <option value="0">EG (0)</option>
              {Array.from({ length: 12 }).map((_, idx) => (
                <option key={idx + 1} value={String(idx + 1)}>
                  {idx + 1}. OG
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <div className="text-xs font-bold text-slate-600">Aufzug</div>
          <div className="mt-2">
            <Select
              value={v.elevator}
              onChange={(e) => set({ elevator: e.target.value as any })}
            >
              <option value="none">Nein</option>
              <option value="small">Ja (klein)</option>
              <option value="large">Ja (groß)</option>
            </Select>
          </div>
        </div>

        <div>
          <div className="text-xs font-bold text-slate-600">Treppen</div>
          <div className="mt-2">
            <Select value={v.stairs} onChange={(e) => set({ stairs: e.target.value as any })}>
              <option value="none">Keine</option>
              <option value="few">Wenig</option>
              <option value="many">Viele</option>
            </Select>
          </div>
        </div>

        <div>
          <div className="text-xs font-bold text-slate-600">Parken</div>
          <div className="mt-2">
            <Select value={v.parking} onChange={(e) => set({ parking: e.target.value as any })}>
              <option value="easy">Einfach</option>
              <option value="medium">Mittel</option>
              <option value="hard">Schwierig</option>
            </Select>
          </div>
          <label className="mt-3 flex items-start gap-3 text-sm">
            <Checkbox
              checked={v.needNoParkingZone}
              onChange={(e) => set({ needNoParkingZone: e.target.checked })}
            />
            <span className="text-xs font-semibold text-slate-700">
              Halteverbotszone benötigt?
            </span>
          </label>
        </div>

        <div>
          <div className="text-xs font-bold text-slate-600">Trageweg</div>
          <div className="mt-2">
            <input
              type="range"
              min={0}
              max={150}
              value={v.carryDistanceM}
              onChange={(e) => set({ carryDistanceM: Number(e.target.value) })}
              className="w-full accent-brand-600"
            />
            <div className="mt-1 text-xs font-semibold text-slate-700">{v.carryDistanceM} m</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepItems(props: {
  serviceType: WizardPayload["serviceType"];
  catalog: CatalogItem[];
  itemsMove: Record<string, number>;
  setItemsMove: (v: Record<string, number>) => void;
  itemsDisposal: Record<string, number>;
  setItemsDisposal: (v: Record<string, number>) => void;
}) {
  const showMove = props.serviceType === "MOVING" || props.serviceType === "BOTH";
  const target = showMove ? props.itemsMove : props.itemsDisposal;
  const setTarget = showMove ? props.setItemsMove : props.setItemsDisposal;

  return (
    <div>
      <div className="premium-surface-emphasis rounded-3xl p-5 text-sm font-semibold text-slate-800">
        Bitte wählen Sie Mengen aus dem Katalog. Kein Freitext nötig.
      </div>

      <div className="mt-6 grid gap-8">
        {["furniture", "appliance", "boxes", "special"].map((cat) => (
          <ItemCategory
            key={cat}
            title={catTitle(cat)}
            items={props.catalog.filter((i) => i.categoryKey === cat)}
            qty={target}
            onChange={(id, q) => setTarget(setQty(target, id, q))}
          />
        ))}
      </div>
    </div>
  );
}

function serviceOptionPricingLabel(option: ServiceOptionConfig) {
  switch (option.pricingType) {
    case "FLAT":
      return `Pauschal ${eur(option.defaultPriceCents)}`;
    case "PER_UNIT":
      return `${eur(option.defaultPriceCents)} pro Einheit`;
    case "PER_M3":
      return `${eur(option.defaultPriceCents)} pro m³`;
    case "PER_HOUR":
      return `${eur(option.defaultPriceCents)} pro Stunde`;
    default:
      return eur(option.defaultPriceCents);
  }
}

function StepServiceOptions(props: {
  title: string;
  options: ServiceOptionConfig[];
  selected: Record<string, number>;
  setSelected: (v: Record<string, number>) => void;
}) {
  if (props.options.length === 0) {
    return (
      <div className="premium-surface-emphasis rounded-3xl p-6 text-sm font-semibold text-slate-700 dark:text-slate-300">
        Derzeit sind keine Leistungen aktiv. Bitte kontaktieren Sie unser Team.
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="premium-surface-emphasis rounded-3xl p-6">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">{props.title}</div>
        <div className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
          Wählen Sie die gewünschten Leistungen. Die Schätzung wird live aktualisiert.
        </div>
      </div>

      <div className="grid gap-3">
        {props.options.map((option) => {
          const qty = props.selected[option.code] ?? 0;
          const active = qty > 0;
          return (
            <div
              key={option.id}
              className={cn(
                "premium-elevate rounded-2xl border-2 bg-[color:var(--surface-elevated)] p-4 shadow-sm",
                active
                  ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-950/30"
                  : "border-slate-300 dark:border-slate-600 dark:bg-slate-800/60",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">{option.nameDe}</div>
                  {option.descriptionDe ? (
                    <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {option.descriptionDe}
                    </div>
                  ) : null}
                  <div className="mt-2 text-xs font-bold text-brand-700 dark:text-brand-300">
                    {serviceOptionPricingLabel(option)}
                  </div>
                </div>

                {option.requiresQuantity ? (
                  <QtyStepper
                    value={qty}
                    onChange={(next) => props.setSelected(setQty(props.selected, option.code, next))}
                  />
                ) : (
                  <Button
                    type="button"
                    variant={active ? "primary" : "outline"}
                    className={cn("min-w-[9rem]", !active ? "border-slate-300 dark:border-slate-600" : "")}
                    onClick={() =>
                      props.setSelected(setQty(props.selected, option.code, active ? 0 : 1))
                    }
                  >
                    {active ? "Ausgewählt" : "Auswählen"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function catTitle(cat: string) {
  if (cat === "furniture") return "Möbel";
  if (cat === "appliance") return "Geräte";
  if (cat === "boxes") return "Kartons";
  return "Spezial / Schwer";
}

function ItemCategory(props: {
  title: string;
  items: CatalogItem[];
  qty: Record<string, number>;
  onChange: (id: string, nextQty: number) => void;
}) {
  if (props.items.length === 0) return null;
  return (
    <div>
      <div className="text-sm font-extrabold text-slate-900 dark:text-white">{props.title}</div>
      <div className="mt-4 grid gap-3">
        {props.items.map((it) => (
          <div
            key={it.id}
            className="premium-elevate flex items-center justify-between gap-4 rounded-2xl border-2 border-slate-200 bg-[color:var(--surface-elevated)] p-4 shadow-sm backdrop-blur-sm hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-slate-600"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{it.nameDe}</div>
              <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                ca. {formatNumberDE(it.defaultVolumeM3)} m³ {it.isHeavy ? " · schwer" : ""}
              </div>
            </div>

            <QtyStepper
              value={props.qty[it.id] ?? 0}
              onChange={(v) => props.onChange(it.id, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function QtyStepper(props: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-xl border-2 border-slate-200 bg-[color:var(--surface-elevated)] shadow-md dark:border-slate-600 dark:bg-slate-800">
      <button
        type="button"
        className="h-10 w-10 font-extrabold text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
        onClick={() => props.onChange(props.value - 1)}
        aria-label="Minus"
      >
        
      </button>
      <div className="w-10 text-center text-sm font-extrabold text-slate-900 dark:text-white" lang="de" dir="ltr">{formatNumberDE(props.value)}</div>
      <button
        type="button"
        className="h-10 w-10 font-extrabold text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
        onClick={() => props.onChange(props.value + 1)}
        aria-label="Plus"
      >
        +
      </button>
    </div>
  );
}

function StepDisposal(props: {
  serviceType: WizardPayload["serviceType"];
  catalog: CatalogItem[];
  itemsDisposal: Record<string, number>;
  setItemsDisposal: (v: Record<string, number>) => void;
  disposalCategories: string[];
  setDisposalCategories: (v: string[]) => void;
  disposalExtraM3: number;
  setDisposalExtraM3: (v: number) => void;
  forbiddenConfirmed: boolean;
  setForbiddenConfirmed: (v: boolean) => void;
  photos: File[];
  setPhotos: (v: File[]) => void;
}) {
  return (
    <div className="grid gap-8">
      {props.serviceType === "BOTH" ? (
        <div className="premium-surface-emphasis rounded-3xl p-6">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Recycle className="h-5 w-5 text-brand-700" />
            Was soll entsorgt werden?
          </div>
          <div className="mt-4 grid gap-8">
            {["furniture", "appliance", "boxes", "special"].map((cat) => (
              <ItemCategory
                key={cat}
                title={catTitle(cat)}
                items={props.catalog.filter((i) => i.categoryKey === cat)}
                qty={props.itemsDisposal}
                onChange={(id, q) => props.setItemsDisposal(setQty(props.itemsDisposal, id, q))}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="premium-surface-emphasis rounded-3xl p-6">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">Kategorien</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {disposalCategoryDefs.map((c) => {
            const checked = props.disposalCategories.includes(c.key);
            return (
              <label
                key={c.key}
                className={cn(
                  "premium-elevate flex items-start gap-3 rounded-2xl border-2 bg-[color:var(--surface-elevated)] p-4 shadow-sm backdrop-blur-sm dark:bg-slate-800/60",
                  checked ? "border-brand-400 bg-brand-50 dark:bg-brand-950/30 dark:border-brand-400" : "border-slate-300 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500",
                )}
              >
                <Checkbox
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...props.disposalCategories, c.key]
                      : props.disposalCategories.filter((x) => x !== c.key);
                    props.setDisposalCategories(next);
                  }}
                />
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">{c.label}</div>
              </label>
            );
          })}
        </div>

        <div className="mt-6">
          <div className="text-xs font-bold text-slate-600 dark:text-slate-400">Zusatz-Volumen (falls nicht im Katalog)</div>
          <input
            className="mt-3 w-full accent-brand-600"
            type="range"
            min={0}
            max={12}
            step={0.5}
            value={props.disposalExtraM3}
            onChange={(e) => props.setDisposalExtraM3(Number(e.target.value))}
          />
          <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">{formatNumberDE(props.disposalExtraM3)} m³</div>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 h-5 w-5 text-amber-700 dark:text-amber-400" />
            <div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-amber-200">Nicht erlaubt</div>
              <div className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                Gefährliche Stoffe, Chemikalien, Batterien, Reifen und Sondermüll sind ausgeschlossen.
              </div>
              <label className="mt-3 flex items-start gap-3 text-sm">
                <Checkbox
                  checked={props.forbiddenConfirmed}
                  onChange={(e) => props.setForbiddenConfirmed(e.target.checked)}
                />
                <span className="text-xs font-bold text-slate-900">
                  Ich bestätige, dass keine ausgeschlossenen Materialien enthalten sind. *
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-sm font-extrabold text-slate-900">Fotos (optional)</div>
          <div className="mt-2 text-xs font-semibold text-slate-600">Max. 10 Bilder, je 8MB.</div>
          <input
            className="mt-3 block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-slate-800"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []).slice(0, 10);
              props.setPhotos(files);
            }}
          />
          {props.photos.length ? (
            <ul className="mt-3 grid gap-1 text-xs font-semibold text-slate-600">
              {props.photos.map((f) => (
                <li key={f.name}>{f.name}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StepTiming(props: {
  speed: WizardPayload["timing"]["speed"];
  setSpeed: (v: WizardPayload["timing"]["speed"]) => void;
  earliestISO: string;
  preferredFrom: string;
  setPreferredFrom: (v: string) => void;
  preferredTo: string;
  setPreferredTo: (v: string) => void;
  preferredTimeWindow: WizardPayload["timing"]["preferredTimeWindow"];
  setPreferredTimeWindow: (v: WizardPayload["timing"]["preferredTimeWindow"]) => void;
  jobDurationMinutes: number;
}) {
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        <SpeedCard
          active={props.speed === "ECONOMY"}
          title="Günstig"
          desc="Günstiger, längere Vorlaufzeit."
          onClick={() => props.setSpeed("ECONOMY")}
        />
        <SpeedCard
          active={props.speed === "STANDARD"}
          title="Standard"
          desc="Balanciert Preis & Tempo."
          onClick={() => props.setSpeed("STANDARD")}
        />
        <SpeedCard
          active={props.speed === "EXPRESS"}
          title="Express"
          desc="Schnellstmglich, hherer Preis."
          onClick={() => props.setSpeed("EXPRESS")}
        />
      </div>

      <div className="premium-surface-emphasis mt-8 rounded-3xl p-6">
        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <CalendarDays className="h-5 w-5 text-brand-700" />
          Wunschtermin
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs font-bold text-slate-600">Von</div>
            <Input
              type="date"
              value={props.preferredFrom}
              min={props.earliestISO}
              onChange={(e) => props.setPreferredFrom(e.target.value)}
            />
            <div className="mt-1 text-xs font-semibold text-slate-600">
              Frhestens: {props.earliestISO}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-600">Bis</div>
            <Input
              type="date"
              value={props.preferredTo}
              min={props.preferredFrom}
              onChange={(e) => props.setPreferredTo(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 text-xs font-semibold text-slate-600">
          Geschtzte Dauer: {props.jobDurationMinutes} Minuten
        </div>

        <div className="mt-6">
          <div className="text-sm font-extrabold text-slate-900">Bevorzugtes Zeitfenster</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              { key: "FLEXIBLE", label: "Flexibel" },
              { key: "MORNING", label: "Vormittag" },
              { key: "AFTERNOON", label: "Nachmittag" },
              { key: "EVENING", label: "Abend" },
            ].map((option) => {
              const active = props.preferredTimeWindow === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  className={cn(
                    "premium-elevate rounded-2xl border-2 px-4 py-3 text-left text-sm font-bold",
                    active
                      ? "border-brand-500 bg-brand-50 text-brand-900 dark:border-brand-400 dark:bg-brand-950/30 dark:text-brand-200"
                      : "border-slate-300 bg-[color:var(--surface-elevated)] text-slate-800 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200",
                  )}
                  onClick={() => props.setPreferredTimeWindow(option.key as WizardPayload["timing"]["preferredTimeWindow"])}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
            Termin angefragt: Wir bestätigen den finalen Termin nach Prüfung per E-Mail.
          </div>
        </div>
      </div>
    </div>
  );
}

function StepPackage(props: {
  serviceType: WizardPayload["serviceType"];
  packageTier: WizardPayload["packageTier"];
  setPackageTier: (v: WizardPayload["packageTier"]) => void;
  offerCode: string;
  setOfferCode: (v: string) => void;
  offerContext?: WizardPayload["offerContext"];
  promoMatched: boolean;
}) {
  const tiers: WizardPayload["packageTier"][] = ["STANDARD", "PLUS", "PREMIUM"];
  return (
    <div className="grid gap-6">
      <div className="premium-surface-emphasis rounded-3xl p-6">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">Paket wählen</div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {tiers.map((tier) => {
            const active = props.packageTier === tier;
            return (
              <button
                key={tier}
                type="button"
                className={cn(
                  "premium-elevate rounded-2xl border-2 p-5 text-left shadow-sm",
                  active
                    ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-950/30"
                    : "border-slate-300 bg-[color:var(--surface-elevated)] hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800/60 dark:hover:border-slate-500",
                )}
                onClick={() => props.setPackageTier(tier)}
              >
                <div className="text-base font-extrabold text-slate-900 dark:text-white">
                  {packageLabels[tier]}
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {packageDescriptions[props.serviceType][tier]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="premium-surface-emphasis rounded-3xl p-6">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">Angebotscode</div>
        <div className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
          Optionaler Angebotscode aus Ihrer Aktion oder Kampagne.
        </div>
        <Input
          className="mt-3"
          value={props.offerCode}
          onChange={(e) => props.setOfferCode(e.target.value.toUpperCase())}
          placeholder="Code eingeben"
          maxLength={50}
        />
        {props.promoMatched && props.offerContext?.appliedDiscountPercent ? (
          <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
            Rabatt aktiv: {formatNumberDE(props.offerContext.appliedDiscountPercent)}%
          </div>
        ) : props.promoMatched && props.offerContext?.appliedDiscountCents ? (
          <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
            Rabatt aktiv: {eur(props.offerContext.appliedDiscountCents)}
          </div>
        ) : props.offerCode.trim() ? (
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            Code ist aktuell ungültig oder nicht auf diese Buchung anwendbar.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SpeedCard(props: { active: boolean; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={cn(
        "premium-elevate rounded-3xl border-2 p-6 text-left shadow-md",
        props.active ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30 dark:border-brand-400" : "border-slate-300 bg-[color:var(--surface-elevated)] hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800/60 dark:hover:border-slate-500",
      )}
      onClick={props.onClick}
      aria-pressed={props.active}
    >
      <div className="text-lg font-extrabold text-slate-950 dark:text-white">{props.title}</div>
      <div className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-400">{props.desc}</div>
    </button>
  );
}

function StepCustomer(props: {
  customerName: string;
  setCustomerName: (v: string) => void;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  customerEmail: string;
  setCustomerEmail: (v: string) => void;
  contactPreference: WizardPayload["customer"]["contactPreference"];
  setContactPreference: (v: WizardPayload["customer"]["contactPreference"]) => void;
  note: string;
  setNote: (v: string) => void;
}) {
  return (
    <div className="premium-surface-emphasis rounded-3xl p-6">
      <div className="text-sm font-extrabold text-slate-900">Ihre Kontaktdaten</div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <div className="text-xs font-bold text-slate-700">Name *</div>
          <Input value={props.customerName} onChange={(e) => props.setCustomerName(e.target.value)} />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-700">Telefon *</div>
          <Input value={props.customerPhone} onChange={(e) => props.setCustomerPhone(e.target.value)} placeholder="+49 …" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-700">E-Mail *</div>
          <Input type="email" value={props.customerEmail} onChange={(e) => props.setCustomerEmail(e.target.value)} placeholder="name@email.de" />
        </div>
        <div className="sm:col-span-2">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-400">Bevorzugter Kontakt</div>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {(["PHONE", "WHATSAPP", "EMAIL"] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={cn(
                  "premium-elevate rounded-2xl border-2 px-4 py-3 text-sm font-extrabold shadow-sm",
                  props.contactPreference === k
                    ? "border-brand-500 bg-brand-50 text-slate-900 dark:bg-brand-950/30 dark:text-brand-300 dark:border-brand-400"
                    : "border-slate-300 bg-[color:var(--surface-elevated)] text-slate-800 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800",
                )}
                onClick={() => props.setContactPreference(k)}
              >
                {k === "PHONE" ? "Telefon" : k === "WHATSAPP" ? "WhatsApp" : "E-Mail"}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-400">Notiz (optional, max. 300 Zeichen)</div>
          <Textarea
            value={props.note}
            onChange={(e) => props.setNote(e.target.value.slice(0, 300))}
            placeholder="Optional: kurze Hinweise (z.B. empfindliche Gegenstände)."
          />
          <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">{props.note.length}/300</div>
        </div>
      </div>
    </div>
  );
}

function StepSummary(props: {
  serviceType: WizardPayload["serviceType"];
  packageTier: WizardPayload["packageTier"];
  offerContext?: WizardPayload["offerContext"];
  selectedServiceOptions: Record<string, number>;
  serviceOptions: ServiceOptionConfig[];
  addons: WizardPayload["addons"];
  startAddress?: AddressOption;
  destinationAddress?: AddressOption;
  pickupAddress?: AddressOption;
  accessStart?: Access;
  accessDestination?: Access;
  accessPickup?: Access;
  itemsMove: Record<string, number>;
  itemsDisposal: Record<string, number>;
  catalog: CatalogItem[];
  disposalCategories: string[];
  disposalExtraM3: number;
  forbiddenConfirmed: boolean;
  speed: WizardPayload["timing"]["speed"];
  requestedFrom: string;
  requestedTo: string;
  preferredTimeWindow: WizardPayload["timing"]["preferredTimeWindow"];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  contactPreference: WizardPayload["customer"]["contactPreference"];
  note: string;
  estimate: ReturnType<typeof estimateOrder>;
  routeLoading: boolean;
  routeError: string | null;
}) {
  return (
    <div className="grid gap-6">
      <div className="premium-surface-emphasis rounded-3xl p-6">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">Zusammenfassung</div>
        <div className="mt-4 grid gap-3 text-sm text-slate-700 dark:text-slate-300">
          <div>
            <span className="font-extrabold">Leistung:</span>{" "}
            {serviceTypeLabels[props.serviceType]} · {speedLabels[props.speed]}
          </div>
          <div>
            <span className="font-extrabold">Paket:</span> {packageLabels[props.packageTier]}
          </div>
          {props.offerContext?.offerCode ? (
            <div>
              <span className="font-extrabold">Angebotscode:</span> {props.offerContext.offerCode}
            </div>
          ) : null}
          {props.addons.length ? (
            <div>
              <span className="font-extrabold">Zusatzleistungen:</span>{" "}
              {props.addons.map((addon) => addonLabels[addon] ?? addon).join(", ")}
            </div>
          ) : null}
          {props.startAddress ? (
            <div>
              <span className="font-extrabold">Start:</span> {props.startAddress.displayName}
            </div>
          ) : null}
          {props.destinationAddress ? (
            <div>
              <span className="font-extrabold">Ziel:</span> {props.destinationAddress.displayName}
            </div>
          ) : null}
          {props.pickupAddress ? (
            <div>
              <span className="font-extrabold">Abholung:</span> {props.pickupAddress.displayName}
            </div>
          ) : null}

          {props.accessStart ? (
            <div>
              <span className="font-extrabold">Zugang Start:</span> {accessText(props.accessStart)}
            </div>
          ) : null}
          {props.accessDestination ? (
            <div>
              <span className="font-extrabold">Zugang Ziel:</span> {accessText(props.accessDestination)}
            </div>
          ) : null}
          {props.accessPickup ? (
            <div>
              <span className="font-extrabold">Zugang Abholung:</span> {accessText(props.accessPickup)}
            </div>
          ) : null}

          {props.requestedFrom && props.requestedTo ? (
            <div>
              <span className="font-extrabold">Wunschtermin:</span>{" "}
              {formatInTimeZone(new Date(`${props.requestedFrom}T00:00:00.000Z`), "Europe/Berlin", "dd.MM.yyyy")}{" "}
              bis{" "}
              {formatInTimeZone(new Date(`${props.requestedTo}T00:00:00.000Z`), "Europe/Berlin", "dd.MM.yyyy")}{" "}
              (
              {props.preferredTimeWindow === "MORNING"
                ? "Vormittag"
                : props.preferredTimeWindow === "AFTERNOON"
                  ? "Nachmittag"
                  : props.preferredTimeWindow === "EVENING"
                    ? "Abend"
                    : "Flexibel"}
              )
            </div>
          ) : null}
        </div>
      </div>

      <div className="premium-surface-emphasis rounded-3xl p-6">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">Gegenstände</div>
        <SummaryItems title="Umzug" catalog={props.catalog} qty={props.itemsMove} />
        <SummaryItems title="Entsorgung" catalog={props.catalog} qty={props.itemsDisposal} />
        <SummaryServiceOptions options={props.serviceOptions} selected={props.selectedServiceOptions} />
        {props.disposalCategories.length ? (
          <div className="mt-4 text-sm">
            <span className="font-extrabold">Kategorien:</span> {props.disposalCategories.join(", ")}
          </div>
        ) : null}
        {props.disposalExtraM3 > 0 ? (
          <div className="mt-2 text-sm">
            <span className="font-extrabold">Zusatz-Volumen:</span> {formatNumberDE(props.disposalExtraM3)} m³
          </div>
        ) : null}
        {(props.serviceType === "DISPOSAL" || props.serviceType === "BOTH") ? (
          <div className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
            Ausschlüsse bestätigt: {props.forbiddenConfirmed ? "Ja" : "Nein"}
          </div>
        ) : null}
      </div>

      <div className="premium-surface-emphasis rounded-3xl p-6">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">Schätzung</div>
        <div className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-300">
          <div>
            <span className="font-extrabold">Volumen:</span> {formatNumberDE(props.estimate.totalVolumeM3)} m³
          </div>
          <div>
            <span className="font-extrabold">Arbeitszeit:</span> {formatNumberDE(props.estimate.laborHours)} Std.
          </div>
          {(props.serviceType === "MOVING" || props.serviceType === "BOTH") ? (
            <div>
              <span className="font-extrabold">Fahrkosten:</span>{" "}
              {eur(props.estimate.driveChargeCents)}
            </div>
          ) : null}
          {props.estimate.distanceKm != null ? (
            <div>
              <span className="font-extrabold">Distanz:</span>{" "}
              {formatNumberDE(props.estimate.distanceKm)} km (
              {distanceSourceLabel(props.estimate.distanceSource)})
            </div>
          ) : null}
          {props.routeLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
              Distanz wird berechnet…
            </div>
          ) : null}
          {props.routeError ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              {props.routeError}
            </div>
          ) : null}
          <div>
            <span className="font-extrabold">Preisrahmen:</span>{" "}
            {eur(props.estimate.priceMinCents)}  {eur(props.estimate.priceMaxCents)}
          </div>
          {props.estimate.breakdown.packageAdjustmentCents !== 0 ? (
            <div>
              <span className="font-extrabold">Paket-Anpassung:</span>{" "}
              {eur(props.estimate.breakdown.packageAdjustmentCents)}
            </div>
          ) : null}
          {props.estimate.breakdown.serviceOptionsCents > 0 ? (
            <div>
              <span className="font-extrabold">Service-Leistungen:</span>{" "}
              {eur(props.estimate.breakdown.serviceOptionsCents)}
            </div>
          ) : null}
          {props.estimate.breakdown.discountCents > 0 ? (
            <div>
              <span className="font-extrabold">Rabatt:</span> -{eur(props.estimate.breakdown.discountCents)}
            </div>
          ) : null}
          {props.estimate.breakdown.minimumOrderAppliedCents > 0 ? (
            <div>
              <span className="font-extrabold">Mindestauftragswert:</span>{" "}
              +{eur(props.estimate.breakdown.minimumOrderAppliedCents)}
            </div>
          ) : null}
        </div>
      </div>

      <div className="premium-surface-emphasis rounded-3xl p-6">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">Kontakt</div>
        <div className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-300">
          <div>
            <span className="font-extrabold">Name:</span> {props.customerName || ""}
          </div>
          <div>
            <span className="font-extrabold">Telefon:</span> {props.customerPhone || ""}
          </div>
          <div>
            <span className="font-extrabold">E-Mail:</span> {props.customerEmail || ""}
          </div>
          <div>
            <span className="font-extrabold">Kontaktweg:</span>{" "}
            {contactLabels[props.contactPreference]}
          </div>
          {props.note ? (
            <div>
              <span className="font-extrabold">Notiz:</span> {props.note}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function accessText(a: Access) {
  const propertyTypeLabel: Record<Access["propertyType"], string> = {
    apartment: "Wohnung",
    house: "Haus",
    office: "Büro",
    storage: "Lager",
  };
  const elevatorLabel: Record<Access["elevator"], string> = {
    none: "Kein Aufzug",
    small: "Kleiner Aufzug",
    large: "Großer Aufzug",
  };
  const stairsLabel: Record<Access["stairs"], string> = {
    none: "Keine",
    few: "Wenige",
    many: "Viele",
  };
  const parkingLabel: Record<Access["parking"], string> = {
    easy: "Einfach",
    medium: "Mittel",
    hard: "Schwierig",
  };

  const parts = [
    `Objekt: ${propertyTypeLabel[a.propertyType]}`,
    `Etage: ${a.floor}`,
    `Aufzug: ${elevatorLabel[a.elevator]}`,
    `Treppen: ${stairsLabel[a.stairs]}`,
    `Parken: ${parkingLabel[a.parking]}`,
    `Trageweg: ${a.carryDistanceM} m`,
  ];
  if (a.needNoParkingZone) parts.push("Halteverbotszone: Ja");
  return parts.join(" · ");
}

function SummaryItems(props: { title: string; catalog: CatalogItem[]; qty: Record<string, number> }) {
  const entries = Object.entries(props.qty).filter(([, q]) => q > 0);
  if (entries.length === 0) return null;
  return (
    <div className="mt-4">
      <div className="text-xs font-bold text-slate-600 dark:text-slate-400">{props.title}</div>
      <ul className="mt-2 grid gap-1 text-sm text-slate-700 dark:text-slate-300">
        {entries.map(([id, qty]) => {
          const it = props.catalog.find((c) => c.id === id);
          return (
            <li key={id} className="flex items-center justify-between gap-3">
              <span className="truncate">{it?.nameDe ?? id}</span>
              <span className="font-extrabold"> {qty}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SummaryServiceOptions(props: {
  options: ServiceOptionConfig[];
  selected: Record<string, number>;
}) {
  const entries = Object.entries(props.selected)
    .map(([code, qty]) => ({
      code,
      qty,
      option: props.options.find((opt) => opt.code === code),
    }))
    .filter((entry) => entry.qty > 0);

  if (entries.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="text-xs font-bold text-slate-600 dark:text-slate-400">Service-Leistungen</div>
      <ul className="mt-2 grid gap-1 text-sm text-slate-700 dark:text-slate-300">
        {entries.map((entry) => (
          <li key={entry.code} className="flex items-center justify-between gap-3">
            <span className="truncate">{entry.option?.nameDe ?? entry.code}</span>
            <span className="font-extrabold"> {entry.qty}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}


