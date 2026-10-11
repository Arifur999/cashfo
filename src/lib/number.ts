// A fixed locale, so a Server Component and the hydrated client format the
// same number identically ("1,234"), whatever the machine's locale is.
const integerFormatter = new Intl.NumberFormat("en-US");

export const formatNumber = (value: number | null | undefined, fallback = "—"): string =>
  typeof value === "number" && Number.isFinite(value) ? integerFormatter.format(value) : fallback;

// 12.345 -> "12.3%"
export const formatPercent = (value: number | null | undefined, fractionDigits = 1, fallback = "—"): string =>
  typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(fractionDigits)}%` : fallback;

// A duration given in hours, in the unit that reads fastest:
// 0.4 -> "24m", 5.25 -> "5.3h", 72 -> "3d".
export const formatHours = (hours: number | null | undefined, fallback = "—"): string => {
  if (typeof hours !== "number" || !Number.isFinite(hours) || hours < 0) {
    return fallback;
  }
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  if (hours < 48) {
    return `${Number(hours.toFixed(1))}h`;
  }
  return `${Number((hours / 24).toFixed(1))}d`;
};
