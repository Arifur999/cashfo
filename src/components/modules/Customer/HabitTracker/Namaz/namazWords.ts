import { Calendar, Check, Flame, Sunrise, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { WEEKDAY_PLURAL } from "@/lib/customer/habitDisplay";
import type { Insight } from "@/lib/customer/namazDisplay";
import { MONTH_NAMES } from "@/lib/customer/namazDisplay";
import { formatCount } from "@/lib/i18n/digits";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";
import type { Translate } from "@/lib/i18n/message";

// What stands out in a Namaz month, in words: the month page and the
// dashboard say it the same way.
export const INSIGHT_ICON: Record<Insight["key"], LucideIcon> = {
  nothingMissed: Check,
  mostMissed: Sunrise,
  strongest: Check,
  weekday: Calendar,
  run: Flame,
  upFrom: TrendingUp,
  downFrom: TrendingDown,
};

export function insightText(insight: Insight, t: Translate, locale: FormatLocale): string {
  const count = (n: number | undefined) => formatCount(n ?? 0, locale);
  const monthWord = (n: number | undefined) => t(MONTH_NAMES[(n ?? 1) - 1]);
  switch (insight.key) {
    case "nothingMissed":
      return t(insight.n === 1 ? "{count} day in and nothing missed." : "{count} days in and nothing missed.", { count: count(insight.n) });
    case "mostMissed":
      return t(insight.n === 1 ? "{prayer} was missed most: {count} time." : "{prayer} was missed most: {count} times.", { prayer: t(insight.item ?? ""), count: count(insight.n) });
    case "strongest":
      return t("{prayer} was the strongest: {done} of {total}.", { prayer: t(insight.item ?? ""), done: count(insight.n), total: count(insight.of) });
    case "weekday":
      return t("{count} of the {total} missed prayers were on {weekday}.", { count: count(insight.n), total: count(insight.of), weekday: t(WEEKDAY_PLURAL[insight.weekdayIndex ?? 0]) });
    case "run":
      return t("{count} days in a row now with all five prayed.", { count: count(insight.n) });
    case "upFrom":
      return t("Up from {pct}% in {month}.", { pct: count(insight.previousPct), month: monthWord(insight.previousMonth) });
    case "downFrom":
      return t("Down from {pct}% in {month}.", { pct: count(insight.previousPct), month: monthWord(insight.previousMonth) });
  }
}
