// A fixed locale, so a Server Component and the hydrated client format the
// same number identically ("1,234"), whatever the machine's locale is.
const integerFormatter = new Intl.NumberFormat("en-US");

export const formatNumber = (value: number | null | undefined, fallback = "—"): string =>
  typeof value === "number" && Number.isFinite(value) ? integerFormatter.format(value) : fallback;

// 12.345 -> "12.3%"
export const formatPercent = (value: number | null | undefined, fractionDigits = 1, fallback = "—"): string =>
  typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(fractionDigits)}%` : fallback;
