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
  /** Day-on-chart % change from ML meta (same series as chart). */
  priceChange1dPct?: number;
  /** Week-on-chart % change from ML context; used with `momentumSell7dPct`. */
  priceChange7dPct?: number;
  /** If week is down at least this much (%) and the model does not expect a rise tomorrow, suggest selling. Default -2.5. */
  momentumSell7dPct?: number;
  /**
   * One-day chart drop: if `priceChange1dPct <=` this (e.g. −4%), treat like a shock
   * unless the model forecasts a clear bounce (`pct` above cap). Default -4.
   */
  momentumSell1dPct?: number;
  /**
   * With a bad day (`…1dPct <= momentumSell1dPct`), sell if next-day `pct` is at or
   * below this. Default 0.42.
   */
  momentumSell1dMaxNextDayPct?: number;
  /**
   * Very bad day (e.g. ≤ −5%): sell unless the model forecasts a strong bounce.
   * Default −5.
   */
  momentumSell1dHardPct?: number;
  /** With `…1dPct <= momentumSell1dHardPct`, sell if `pct` is at or below this. Default 0.65. */
  momentumSell1dHardMaxNextDayPct?: number;
  /**
   * Stronger “bad week” threshold: if `priceChange7dPct <=` this, allow a higher
   * `pct` ceiling before we still say sell (demo downtrends often get +0.2–0.5% from trees).
   * Default -8.
   */
  momentumSellSevere7dPct?: number;
  /**
   * With a mild down week (`…7dPct <= momentumSell7dPct`), sell if predicted next-day
   * `pct` is at or below this (not only ≤0). Default 0.18.
   */
  momentumSellMaxNextDayPct?: number;
  /**
   * With a severe down week (`…7dPct <= momentumSellSevere7dPct`), sell if `pct` is at
   * or below this. Default 0.58 (trees often emit small +0.2–0.5% on sliding series).
   */
  momentumSellSevereMaxNextDayPct?: number;
  /**
   * “Crash week” on the chart (steep downtrend). If 7d% is at or below this,
   * suggest selling unless the model forecasts a strong bounce (`pct` above cap).
   * Default -10 (covers ~−11% demo downtrends; was −12 and missed them).
   */
  crashWeek7dPct?: number;
  /** With crash week, sell if predicted next-day `pct` is at or below this. Default 0.58. */
  crashWeekMaxNextDayPct?: number;
  /**
   * Sustained slide: bad week on chart (`…7dPct <=` this) **and** price still down vs
   * prior point (`priceChange1dPct < 0`) → sell unless `pct` above cap.
   * Default -4.5.
   */
  momentumSellSlideWeekPct?: number;
  /** Max next-day `pct` for sustained slide. Default 0.92. */
  momentumSellSlideMaxNextDayPct?: number;
};

/**
 * Maps next-day % (and optional week trend) into hold / sell / neutral.
 * Sell is easier to trigger than hold so farmers see “consider selling” when a small dip
 * or a weak outlook could mean locking in before further losses.
 *
 * Down-week rule runs before a plain “hold”: shallow positive model outputs are common on
 * sliding price histories, so we should not flash “hold” when the chart week is clearly
 * down unless the model forecasts a sizable bounce (`pct` above the mild/severe caps).
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
  const mom1 = options?.priceChange1dPct;
  const mom7 = options?.priceChange7dPct;
  const momThr = options?.momentumSell7dPct ?? -2.5;
  const momSevere = options?.momentumSellSevere7dPct ?? -8.0;
  const capMild = options?.momentumSellMaxNextDayPct ?? 0.18;
  const capSevere = options?.momentumSellSevereMaxNextDayPct ?? 0.58;
  const crashThr = options?.crashWeek7dPct ?? -10.0;
  /** Steep chart downtrend: do not show “hold” on a tiny predicted bounce. */
  const crashCap = options?.crashWeekMaxNextDayPct ?? 0.58;
  const shock1d = options?.momentumSell1dPct ?? -4.0;
  const cap1d = options?.momentumSell1dMaxNextDayPct ?? 0.42;
  const shock1dHard = options?.momentumSell1dHardPct ?? -5.0;
  const cap1dHard = options?.momentumSell1dHardMaxNextDayPct ?? 0.85;
  const slideWeek = options?.momentumSellSlideWeekPct ?? -4.5;
  const slideCap = options?.momentumSellSlideMaxNextDayPct ?? 0.92;

  if (pct < -sellBelow) return "sell";

  if (
    typeof mom1 === "number" &&
    !Number.isNaN(mom1) &&
    mom1 <= shock1dHard &&
    pct <= cap1dHard
  ) {
    return "sell";
  }

  if (
    typeof mom1 === "number" &&
    !Number.isNaN(mom1) &&
    mom1 <= shock1d &&
    pct <= cap1d
  ) {
    return "sell";
  }

  // Week clearly down and still falling vs prior observation → prefer sell over hold.
  if (
    typeof mom7 === "number" &&
    typeof mom1 === "number" &&
    !Number.isNaN(mom7) &&
    !Number.isNaN(mom1) &&
    mom7 <= slideWeek &&
    mom1 < 0 &&
    pct <= slideCap
  ) {
    return "sell";
  }

  if (
    typeof mom7 === "number" &&
    !Number.isNaN(mom7) &&
    mom7 <= crashThr &&
    pct <= crashCap
  ) {
    return "sell";
  }

  if (
    typeof mom7 === "number" &&
    !Number.isNaN(mom7) &&
    mom7 <= momThr
  ) {
    const cap = mom7 <= momSevere ? capSevere : capMild;
    if (pct <= cap) return "sell";
  }

  if (pct > holdAbove) return "hold";

  return "neutral";
}

/** e.g. +0.17% or −1.20% for next-day point estimates. */
export function formatSignedPercent(points: number, fractionDigits = 2): string {
  if (Number.isNaN(points)) return "—";
  const sign = points > 0 ? "+" : points < 0 ? "-" : "";
  const v = Math.abs(points).toFixed(fractionDigits);
  return `${sign}${v}%`;
}
