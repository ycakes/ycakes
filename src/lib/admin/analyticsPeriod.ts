export type AnalyticsPeriod = "day" | "week" | "month" | "year" | "custom" | "all";

export type ResolvedPeriod = {
  period: AnalyticsPeriod;
  /** Inclusive lower bound, or null for "all time". */
  from: Date | null;
  /** Exclusive upper bound (start of the day after the period ends). */
  to: Date;
  /** Same-length immediately-preceding window, for trend comparisons. Null when not comparable (custom/all). */
  previousFrom: Date | null;
  previousTo: Date | null;
  trendLabelKey: "vsYesterday" | "vsLastWeek" | "vsLastMonth" | "vsLastYear" | "vsPreviousPeriod";
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function toISODate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolvePeriod(
  period: AnalyticsPeriod,
  customFrom: string | null,
  customTo: string | null,
  now = new Date(),
): ResolvedPeriod {
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  switch (period) {
    case "day": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { period, from: today, to: tomorrow, previousFrom: yesterday, previousTo: today, trendLabelKey: "vsYesterday" };
    }
    case "week": {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      const previousFrom = new Date(from);
      previousFrom.setDate(previousFrom.getDate() - 7);
      return { period, from, to: tomorrow, previousFrom, previousTo: from, trendLabelKey: "vsLastWeek" };
    }
    case "year": {
      const from = new Date(today.getFullYear(), 0, 1);
      const to = new Date(today.getFullYear() + 1, 0, 1);
      const previousFrom = new Date(today.getFullYear() - 1, 0, 1);
      return { period, from, to, previousFrom, previousTo: from, trendLabelKey: "vsLastYear" };
    }
    case "custom": {
      const from = customFrom ? startOfDay(new Date(customFrom)) : today;
      const toExclusive = customTo ? startOfDay(new Date(customTo)) : today;
      toExclusive.setDate(toExclusive.getDate() + 1);
      const lengthMs = toExclusive.getTime() - from.getTime();
      const previousTo = from;
      const previousFrom = new Date(from.getTime() - lengthMs);
      return { period, from, to: toExclusive, previousFrom, previousTo, trendLabelKey: "vsPreviousPeriod" };
    }
    case "all":
      return { period, from: null, to: tomorrow, previousFrom: null, previousTo: null, trendLabelKey: "vsPreviousPeriod" };
    case "month":
    default: {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      const to = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const previousFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return { period: "month", from, to, previousFrom, previousTo: from, trendLabelKey: "vsLastMonth" };
    }
  }
}

export function trendPercent(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}
