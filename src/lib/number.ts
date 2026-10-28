// A fixed locale, so a Server Component and the hydrated client format the
// same number identically ("1,234"), whatever the machine's locale is.
const integerFormatter = new Intl.NumberFormat("en-US");

export const formatNumber = (value: number | null | undefined, fallback = "—"): string =>
  typeof value === "number" && Number.isFinite(value) ? integerFormatter.format(value) : fallback;

// 12.345 -> "12.3%"
export const formatPercent = (value: number | null | undefined, fractionDigits = 1, fallback = "—"): string =>
  typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(fractionDigits)}%` : fallback;

// 3_435_973_837 -> "3.2 GB", 19_921_943 -> "19 MB": one decimal under 10,
// whole numbers above, in steps of 1,024.
export const formatBytes = (bytes: number): string => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const shown = value < 10 && unit > 0 ? (Math.round(value * 10) / 10).toString() : String(Math.round(value));
  return `${shown} ${units[unit]}`;
};
