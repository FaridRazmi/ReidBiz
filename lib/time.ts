const SHOP_TIMEZONE = "Asia/Kuala_Lumpur";

const dtf = new Intl.DateTimeFormat("en-CA", {
  timeZone: SHOP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Formats a UTC instant as Malaysia local wall-clock text, e.g. "Nov 08, 21:52".
 * The server runs in UTC, so getHours()/getMonth() would show server time —
 * this converts to the shop's timezone first.
 */
export function formatShopDateTime(date: Date): string {
  const parts = dtf.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIndex = Number(get("month")) - 1;
  return `${months[monthIndex]} ${get("day")}, ${hour}:${get("minute")}`;
}

/**
 * Full format with year, e.g. "Nov 08, 2026 21:52".
 */
export function formatShopDateTimeFull(date: Date): string {
  const parts = dtf.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIndex = Number(get("month")) - 1;
  return `${months[monthIndex]} ${get("day")}, ${get("year")} ${hour}:${get("minute")}`;
}

/**
 * Which shop-local calendar date (YYYY-MM-DD) an instant falls on.
 */
export function shopDateKey(date: Date): string {
  const parts = dtf.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Day of week (Mon, Tue, ...) in shop-local time.
 */
export function shopWeekday(date: Date): string {
  const key = shopDateKey(date);
  const weekday = new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
  });
  return weekday;
}

/**
 * Short date label (Nov 08) in shop-local time.
 */
export function shopShortDate(date: Date): string {
  const parts = dtf.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIndex = Number(get("month")) - 1;
  return `${months[monthIndex]} ${get("day")}`;
}

/**
 * True when two instants fall on the same shop-local calendar day.
 */
export function sameShopDay(a: Date, b: Date): boolean {
  return shopDateKey(a) === shopDateKey(b);
}
