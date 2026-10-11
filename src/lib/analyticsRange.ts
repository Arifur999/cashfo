// The analytics date range lives in the URL (?range=7|30|90|custom and, for
// custom, &from=&to=) and resolves to an inclusive yyyy-MM-dd window.

export const ANALYTICS_PRESETS = ["7", "30", "90", "custom"] as const;
export type AnalyticsPreset = (typeof ANALYTICS_PRESETS)[number];

export interface AnalyticsRange {
  preset: AnalyticsPreset;
  from: string;
  to: string;
}

type RangeParams = Partial<Record<"range" | "from" | "to", string | null | undefined>>;

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidDay = (value: string | null | undefined): value is string =>
  Boolean(value && DAY_PATTERN.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()));

// Calendar arithmetic on yyyy-MM-dd strings; UTC keeps it free of DST and
// machine-timezone effects.
export const shiftDay = (day: string, deltaDays: number): string => {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + deltaDays)).toISOString().slice(0, 10);
};

// `today` is passed in (from the server render) so resolving never reads the
// clock and the server prefetch and the client agree on the window.
export const resolveAnalyticsRange = (params: RangeParams, today: string): AnalyticsRange => {
  const { range, from, to } = params;
  if (range === "custom" && isValidDay(from) && isValidDay(to) && from <= to && to <= today) {
    return { preset: "custom", from, to };
  }

  const preset = range === "7" || range === "90" ? range : "30";
  return { preset, from: shiftDay(today, -(Number(preset) - 1)), to: today };
};

export const toAnalyticsRangeQuery = ({ from, to }: AnalyticsRange) => new URLSearchParams({ from, to }).toString();
