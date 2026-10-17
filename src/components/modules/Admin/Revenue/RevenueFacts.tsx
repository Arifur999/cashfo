import Card from "@/components/smartly/Card";
import { formatCurrency } from "@/lib/currency";
import { formatMonthName } from "@/lib/date";
import { formatNumber } from "@/lib/number";
import type { IRevenueOverview } from "@/types/revenue.types";

// Three facts under the charts: what a paid person brings, what coupons
// cost, what went back.
const RevenueFacts = ({ overview }: { overview: IRevenueOverview }) => {
  const month = formatMonthName(overview.month);
  const perPerson = overview.paidPeople.now > 0 ? overview.mrr / overview.paidPeople.now : 0;
  const facts = [
    {
      label: "Average per paid person",
      value: `${formatCurrency(perPerson, undefined, 0)} a month`,
      sub: `MRR ÷ ${formatNumber(overview.paidPeople.now)} paid ${overview.paidPeople.now === 1 ? "person" : "people"}`,
    },
    { label: "Coupons cost", value: formatCurrency(overview.couponsCostThisMonth, undefined, 0), sub: `In ${month}, taken off payments that used a coupon` },
    {
      label: "Sent back",
      value: formatCurrency(overview.refundsThisMonth.amount, undefined, 0),
      sub: `${formatNumber(overview.refundsThisMonth.count)} ${overview.refundsThisMonth.count === 1 ? "refund" : "refunds"} in ${month}`,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {facts.map((fact) => (
        <Card key={fact.label} padding="none" className="flex flex-col gap-2 px-5 py-4">
          <span className="text-small text-ink-muted">{fact.label}</span>
          <span className="text-h2 text-ink tabular-nums">{fact.value}</span>
          <span className="text-small leading-snug text-ink-2">{fact.sub}</span>
        </Card>
      ))}
    </div>
  );
};

export default RevenueFacts;
