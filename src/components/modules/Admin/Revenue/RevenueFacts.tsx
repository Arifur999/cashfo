import Card from "@/components/smartly/Card";
import { formatCurrency } from "@/lib/currency";
import { formatMonthName } from "@/lib/date";
import type { IRevenueOverview } from "@/types/revenue.types";
import { getTranslator } from "@/lib/i18n/locale";
import { plural } from "@/lib/i18n/message";

// Three facts under the charts: what a paid person brings, what coupons
// cost, what went back.
const RevenueFacts = async ({ overview }: { overview: IRevenueOverview }) => {
  const { t } = await getTranslator("admin");
  const month = t(formatMonthName(overview.month));
  const perPerson = overview.paidPeople.now > 0 ? overview.mrr / overview.paidPeople.now : 0;
  const facts = [
    {
      label: "Average per paid person",
      value: t("{amount} a month", { amount: formatCurrency(perPerson, undefined, 0) }),
      sub: plural(t, overview.paidPeople.now, "MRR ÷ {count} paid person", "MRR ÷ {count} paid people"),
    },
    { label: "Coupons cost", value: formatCurrency(overview.couponsCostThisMonth, undefined, 0), sub: t("In {month}, taken off payments that used a coupon", { month }) },
    {
      label: "Sent back",
      value: formatCurrency(overview.refundsThisMonth.amount, undefined, 0),
      sub: plural(t, overview.refundsThisMonth.count, "{count} refund in {month}", "{count} refunds in {month}", { month }),
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {facts.map((fact) => (
        <Card key={fact.label} padding="none" className="flex flex-col gap-2 px-5 py-4">
          <span className="text-small text-ink-muted">{t(fact.label)}</span>
          <span className="text-h2 text-ink tabular-nums">{fact.value}</span>
          <span className="text-small leading-snug text-ink-2">{fact.sub}</span>
        </Card>
      ))}
    </div>
  );
};

export default RevenueFacts;
