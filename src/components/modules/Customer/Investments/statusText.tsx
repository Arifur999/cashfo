"use client";

import { daysBetween, dayOf, type InvestmentFigures } from "@/lib/customer/investmentDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Chip, FREQUENCY_WORDS, STATUS_CHIP } from "./investmentLook";
import { useInvestments } from "./InvestmentsProvider";

// The status chip's words: late, due soon, on track, no fixed date,
// matured, closed.
export function useStatusLabel() {
  const { t, fmt } = useLocale();
  const { today, day } = useInvestments();
  return (f: InvestmentFigures): string => {
    const n = f.next ? daysBetween(today, f.next) : 0;
    switch (f.status) {
      case "late":
        return f.late === 1 ? t("Late since {date}", { date: day(f.next, "d MMM") }) : t("{count} payouts late", { count: formatCount(f.late, fmt) });
      case "soon":
        return n <= 0 ? t("Due today") : n === 1 ? t("Due tomorrow") : t("Due in {count} days", { count: formatCount(n, fmt) });
      case "ok":
        return t("On track");
      case "open":
        return t("No fixed date");
      case "matured":
        return t("Matured on {date}", { date: day(dayOf(f.investment.maturityDate), "d MMM") });
      default:
        return t("Closed");
    }
  };
}

export function StatusChip({ figures }: { figures: InvestmentFigures }) {
  const label = useStatusLabel();
  return <Chip className={STATUS_CHIP[figures.status]}>{label(figures)}</Chip>;
}

// "15 November 2026 · Tk 15,000", "Last profit 20 Sep 2026", "Closed on …".
export function NextPayout({ figures: f }: { figures: InvestmentFigures }) {
  const { t } = useLocale();
  const { money, day } = useInvestments();
  if (f.closed) return <>{t("Closed on {date}", { date: day(dayOf(f.investment.closedAt)) })}</>;
  if (!f.step) return <>{f.last ? t("Last profit {date}", { date: day(dayOf(f.last.date)) }) : t("No profit yet")}</>;
  if (!f.next) return <>{t("No more payouts")}</>;
  return <>{day(f.next) + (f.per ? ` · ${money(f.per)}` : "")}</>;
}

// "Tk 15,000 a month", or how profit comes when the amount isn't fixed.
export function usePlanText() {
  const { t } = useLocale();
  const { money } = useInvestments();
  return (f: InvestmentFigures): string => {
    const words = FREQUENCY_WORDS[f.investment.frequency];
    if (!f.step) return t("Not fixed, record each profit when it comes");
    if (!f.per) return t("{freq}, amount not fixed", { freq: t(words.label) });
    return `${money(f.per)} ${t(words.each)}`;
  };
}
