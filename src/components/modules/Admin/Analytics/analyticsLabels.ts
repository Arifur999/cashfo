import { calendarDay, daySpan } from "@/components/modules/Admin/Dashboard/dashboardDates";
import { type AnalyticsRange, resolveAnalyticsRange } from "@/lib/analyticsRange";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { inEnglish, type Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";
import { humanizeEnum } from "@/lib/statusBadge";
import type { DeviceType } from "@/types/analytics.types";

// What each tracked action is called on the page.
const FEATURE_LABELS: Record<string, string> = {
  expense_added: "Expenses added",
  income_added: "Income added",
  login: "Sign-ins",
  account_created: "Accounts added",
  budget_created: "Budgets made",
  workspace_created: "Workspaces made",
  report_viewed: "Reports opened",
};

// Unknown event types still read sensibly ("goal_reached" -> "Goal reached").
export const featureLabel = (eventType: string) => FEATURE_LABELS[eventType] ?? humanizeEnum(eventType.toUpperCase());

export const DEVICE_META: Record<DeviceType, { label: string; color: string }> = {
  MOBILE: { label: "Phone", color: "var(--emerald)" },
  DESKTOP: { label: "Computer", color: "var(--forest)" },
  TABLET: { label: "Tablet", color: "var(--warning-fill)" },
};

// "2026-10-05" -> "5 Oct" ("৫ অক্টো") for chart axes; no timezone involved.
export const formatShortDay = (day: string, locale: Locale = "en") => calendarDay(day, locale);

// "2 Sep – 1 Oct": the window a range covers, in the reader's language.
export const rangeSpanIn = (range: Pick<AnalyticsRange, "from" | "to">, locale: Locale) => daySpan(range.from, range.to, locale);

// "Last 30 days", or the span of a custom range, with the reader's digits.
export const rangeNameIn = (range: AnalyticsRange, locale: Locale, t: Translate = inEnglish) =>
  range.preset === "custom" ? rangeSpanIn(range, locale) : t("Last {count} days", { count: toLocaleDigits(range.preset, locale) });

// The API answers a custom range of more than a year with an error: every
// day in it is a row in the response.
export const MAX_RANGE_DAYS = 366;

// How many days a range covers, both ends included.
export const rangeDays = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;

// The page's range from the URL, as lib/analyticsRange reads it, except that
// a custom range longer than the API takes (an old or hand-made link) falls
// back to the last 30 days instead of failing every chart. The server page
// and the client read it alike, so the prefetch still matches.
export const resolveRange = (params: Parameters<typeof resolveAnalyticsRange>[0], today: string): AnalyticsRange => {
  const range = resolveAnalyticsRange(params, today);
  return rangeDays(range.from, range.to) > MAX_RANGE_DAYS ? resolveAnalyticsRange({}, today) : range;
};

// A cohort cell's green, in five steps so its figure stays readable (4.5:1
// or more): forest on the four pale greens, white on full emerald. `fill` is
// how much emerald is mixed into the card's white.
export interface CohortShade {
  // The lowest share (in %) that gets this shade.
  from: number;
  fill: number;
  text: "forest" | "white";
}

export const COHORT_SHADES: CohortShade[] = [
  { from: 80, fill: 100, text: "white" },
  { from: 60, fill: 55, text: "forest" },
  { from: 40, fill: 40, text: "forest" },
  { from: 20, fill: 26, text: "forest" },
  { from: 0, fill: 12, text: "forest" },
];

export const cohortShade = (percent: number): CohortShade => COHORT_SHADES.find((shade) => percent >= shade.from) ?? COHORT_SHADES[COHORT_SHADES.length - 1];
