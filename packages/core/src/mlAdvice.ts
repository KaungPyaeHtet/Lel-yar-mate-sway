/**
 * Map Python XGBoost next-day % change into simple farmer-facing guidance.
 * `pct` is in percentage points (e.g. 0.17 ≈ +0.17% next day).
 */

export type RiceMlAdvice = "hold" | "sell" | "neutral";

export type AdviceFromMlOptions = {
  /** Min predicted next-day gain (%) to suggest holding; default 0.08. */
  holdAbovePct?: number;
  /** Min predicted next-day loss magnitude (%) to suggest selling; default 0.045 (easier than hold). */
  sellBelowPct?: number;
  /** Week-on-chart % change from ML context; used with `momentumSell7dPct`. */
  priceChange7dPct?: number;
  /** If week is down at least this much (%) and the model does not expect a rise tomorrow, suggest selling. Default -2.5. */
  momentumSell7dPct?: number;
};

/**
 * Maps next-day % (and optional week trend) into hold / sell / neutral.
 * Sell is easier to trigger than hold so farmers see “consider selling” when a small dip
 * or a weak outlook could mean locking in before further losses.
 */
export function adviceFromMlNextDayPct(
  pct: number,
  options?: AdviceFromMlOptions & { deadbandPct?: number }
): RiceMlAdvice {
  const holdAbove =
    options?.holdAbovePct ??
    (options?.deadbandPct != null ? options.deadbandPct : 0.08);
  const sellBelow =
    options?.sellBelowPct ??
    (options?.deadbandPct != null ? options.deadbandPct : 0.045);
  const mom7 = options?.priceChange7dPct;
  const momThr = options?.momentumSell7dPct ?? -2.5;

  if (pct > holdAbove) return "hold";
  if (pct < -sellBelow) return "sell";
  if (
    typeof mom7 === "number" &&
    !Number.isNaN(mom7) &&
    mom7 <= momThr &&
    pct <= 0
  ) {
    return "sell";
  }
  return "neutral";
}

/** e.g. +0.17% or −1.20% for next-day point estimates. */
export function formatSignedPercent(points: number, fractionDigits = 2): string {
  if (Number.isNaN(points)) return "—";
  const sign = points > 0 ? "+" : points < 0 ? "-" : "";
  const v = Math.abs(points).toFixed(fractionDigits);
  return `${sign}${v}%`;
}
