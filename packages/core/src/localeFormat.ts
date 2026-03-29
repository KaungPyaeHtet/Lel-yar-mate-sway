import type { AppLocale } from "./appLocale";

/**
 * Tomorrow’s calendar date in the user’s local timezone (`YYYY-MM-DD`).
 * Used for “estimate for tomorrow” UI copy (not tied to the last row in the sheet).
 */
export function tomorrowDateIsoLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Human-readable calendar date for market / weather copy (locale-aware).
 */
export function formatLongDateLabel(dateIso: string, locale: AppLocale): string {
  try {
    const d = new Date(`${dateIso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return dateIso;
    return new Intl.DateTimeFormat(locale === "my" ? "my-MM" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return dateIso;
  }
}
