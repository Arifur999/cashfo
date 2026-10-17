import type { AnalyticsRange } from "./analyticsRange";
import { formatDate } from "./date";
import { formatNumber } from "./number";

// Days are calendar dates, so they are read at noon UTC (no shifting).
const dayLabel = (day: string) => formatDate(`${day}T12:00:00Z`, "d MMM");

// "2 Sep – 1 Oct": the window the charts cover.
export const rangeSpan = (range: Pick<AnalyticsRange, "from" | "to">) => `${dayLabel(range.from)} – ${dayLabel(range.to)}`;

// "Last 30 days", or the span of a custom range.
export const rangeName = (range: AnalyticsRange) => (range.preset === "custom" ? rangeSpan(range) : `Last ${range.preset} days`);

// "60% of all 1,272 accounts"
export const shareOfAccounts = (active: number, total: number) =>
  total > 0 ? `${Math.round((active / total) * 100)}% of all ${formatNumber(total)} accounts` : "No accounts yet";

// "+9 on the week before", "−3 on the week before", "Same as the week before"
export const weekChange = (current: number, previous: number): { text: string; tone: "up" | "down" | "same" } => {
  const difference = current - previous;
  if (difference === 0) return { text: "Same as the week before", tone: "same" };
  return { text: `${difference > 0 ? "+" : "−"}${formatNumber(Math.abs(difference))} on the week before`, tone: difference > 0 ? "up" : "down" };
};

// "35% of the weekly number"
export const shareOfWeek = (day: number, week: number) => (week > 0 ? `${Math.round((day / week) * 100)}% of the weekly number` : "Nobody this week");

// How many months after a cohort's own month ("2026-08") a month is: 0 for
// the month they joined.
export const monthsAfter = (cohortMonth: string, month: string) => {
  const [fromYear, fromMonth] = cohortMonth.split("-").map(Number);
  const [toYear, toMonth] = month.split("-").map(Number);
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
};
