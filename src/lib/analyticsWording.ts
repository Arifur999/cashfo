import { inEnglish, type Translate } from "./i18n/message";
import { formatNumber } from "./number";

// "60% of all 1,272 accounts"
export const shareOfAccounts = (active: number, total: number, t: Translate = inEnglish) =>
  total > 0 ? t("{percent}% of all {total} accounts", { percent: Math.round((active / total) * 100), total: formatNumber(total) }) : t("No accounts yet");

// "+9 on the week before", "−3 on the week before", "Same as the week before"
export const weekChange = (current: number, previous: number, t: Translate = inEnglish): { text: string; tone: "up" | "down" | "same" } => {
  const difference = current - previous;
  if (difference === 0) return { text: t("Same as the week before"), tone: "same" };
  const change = `${difference > 0 ? "+" : "−"}${formatNumber(Math.abs(difference))}`;
  return { text: t("{change} on the week before", { change }), tone: difference > 0 ? "up" : "down" };
};

// "35% of the weekly number"
export const shareOfWeek = (day: number, week: number, t: Translate = inEnglish) =>
  week > 0 ? t("{percent}% of the weekly number", { percent: Math.round((day / week) * 100) }) : t("Nobody this week");

// How many months after a cohort's own month ("2026-08") a month is: 0 for
// the month they joined.
export const monthsAfter = (cohortMonth: string, month: string) => {
  const [fromYear, fromMonth] = cohortMonth.split("-").map(Number);
  const [toYear, toMonth] = month.split("-").map(Number);
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
};
