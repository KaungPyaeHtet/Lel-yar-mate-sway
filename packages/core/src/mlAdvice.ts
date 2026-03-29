/**
 * Map Python XGBoost next-day % change into simple farmer-facing guidance.
 * `pct` is in percentage points (e.g. 0.17 ≈ +0.17% next day).
 */

export type RiceMlAdvice = "hold" | "sell" | "neutral";

/**
 * Above `deadbandPct`: model expects a rise → hold grain longer.
 * Below `-deadbandPct`: expects a dip → consider selling.
 */
export function adviceFromMlNextDayPct(
  pct: number,
  options?: { deadbandPct?: number }
): RiceMlAdvice {
  /* Tighter band so modest negative model outputs still surface “consider selling”. */
  const b = options?.deadbandPct ?? 0.075;
  if (pct > b) return "hold";
  if (pct < -b) return "sell";
  return "neutral";
}

/** e.g. +0.17% or −1.20% for next-day point estimates. */
export function formatSignedPercent(points: number, fractionDigits = 2): string {
  if (Number.isNaN(points)) return "—";
  const sign = points > 0 ? "+" : points < 0 ? "-" : "";
  const v = Math.abs(points).toFixed(fractionDigits);
  return `${sign}${v}%`;
}
