import type { WizardPayload } from "@/lib/wizard-schema";

export type PromoRuleLike = {
  id?: string;
  code: string;
  moduleSlug: "MONTAGE" | "ENTSORGUNG" | null;
  serviceTypeScope: WizardPayload["serviceType"] | null;
  discountType: "PERCENT" | "FLAT_CENTS";
  discountValue: number;
  minOrderCents: number;
  maxDiscountCents: number | null;
  validFrom?: string | Date | null;
  validTo?: string | Date | null;
  active?: boolean;
};

export function normalizePromoCode(input?: string | null) {
  return String(input ?? "").trim().toUpperCase();
}

export function bookingContextToModuleSlug(context?: WizardPayload["bookingContext"]) {
  if (context === "MONTAGE") return "MONTAGE" as const;
  if (context === "ENTSORGUNG") return "ENTSORGUNG" as const;
  return null;
}

export function promoRuleIsCurrentlyValid(rule: PromoRuleLike, now = new Date()) {
  if (rule.active === false) return false;

  const from = rule.validFrom ? new Date(rule.validFrom) : null;
  const to = rule.validTo ? new Date(rule.validTo) : null;
  if (from && from.getTime() > now.getTime()) return false;
  if (to && to.getTime() < now.getTime()) return false;
  return true;
}

export function promoRuleMatchesContext(
  rule: PromoRuleLike,
  context: {
    bookingContext: WizardPayload["bookingContext"];
    serviceType: WizardPayload["serviceType"];
    totalCents?: number;
  },
) {
  const moduleSlug = bookingContextToModuleSlug(context.bookingContext);
  if (rule.moduleSlug && rule.moduleSlug !== moduleSlug) return false;
  if (rule.serviceTypeScope && rule.serviceTypeScope !== context.serviceType) return false;
  if (context.totalCents != null && context.totalCents < Math.max(0, rule.minOrderCents || 0)) {
    return false;
  }
  return true;
}

export function resolvePromoRule(
  rules: PromoRuleLike[],
  input: {
    code?: string | null;
    bookingContext: WizardPayload["bookingContext"];
    serviceType: WizardPayload["serviceType"];
    totalCents?: number;
    now?: Date;
  },
) {
  const code = normalizePromoCode(input.code);
  if (!code) return null;
  const now = input.now ?? new Date();

  const candidate = rules.find((rule) => normalizePromoCode(rule.code) === code);
  if (!candidate) return null;
  if (!promoRuleIsCurrentlyValid(candidate, now)) return null;
  if (
    !promoRuleMatchesContext(candidate, {
      bookingContext: input.bookingContext,
      serviceType: input.serviceType,
      totalCents: input.totalCents,
    })
  ) {
    return null;
  }
  return candidate;
}
