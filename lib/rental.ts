export const DURATION_TYPES = ["3h", "day", "week", "month"] as const;
export type DurationType = (typeof DURATION_TYPES)[number];

export const DURATION_LABELS: Record<DurationType, string> = {
  "3h": "3 Hours",
  day: "1 Day",
  week: "1 Week",
  month: "1 Month",
};

const DURATION_HOURS: Record<DurationType, number> = {
  "3h": 3,
  day: 24,
  week: 168,
  month: 720,
};

export function isDurationType(value: string): value is DurationType {
  return (DURATION_TYPES as readonly string[]).includes(value);
}

export function durationHours(type: DurationType): number {
  return DURATION_HOURS[type];
}

export function rentalEndAt(start: Date, type: DurationType) {
  return new Date(start.getTime() + DURATION_HOURS[type] * 60 * 60 * 1000);
}

export function toLocalInputValue(date: Date) {
  const tz = process.env.SHOP_TIMEZONE || "Asia/Kuala_Lumpur";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

type ProductPriceFields = {
  rentalPrice3h: unknown;
  rentalPriceDay: unknown;
  rentalPriceWeek: unknown;
  rentalPriceMonth: unknown;
};

export function priceForProduct(product: ProductPriceFields, type: DurationType): number {
  const map: Record<DurationType, unknown> = {
    "3h": product.rentalPrice3h,
    day: product.rentalPriceDay,
    week: product.rentalPriceWeek,
    month: product.rentalPriceMonth,
  };
  const value = Number(map[type]);
  return Number.isFinite(value) ? value : 0;
}

export function rentalPrices(product: ProductPriceFields): Record<DurationType, number> {
  return {
    "3h": priceForProduct(product, "3h"),
    day: priceForProduct(product, "day"),
    week: priceForProduct(product, "week"),
    month: priceForProduct(product, "month"),
  };
}

export function formatRemaining(endAt: Date, now: Date = new Date()) {
  const ms = endAt.getTime() - now.getTime();
  if (ms <= 0) return "Ended";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export const EXPIRY_WARNING_DAYS = 3;

export type AccountExpiryStatus = "none" | "active" | "expiring" | "expired";

export function accountExpiryStatus(
  expiry: Date | null | undefined,
  now: Date = new Date(),
): AccountExpiryStatus {
  if (!expiry) return "none";
  const diffMs = expiry.getTime() - now.getTime();
  if (diffMs < 0) return "expired";
  if (diffMs <= EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000) return "expiring";
  return "active";
}

export function daysUntil(date: Date, now: Date = new Date()) {
  return Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}
