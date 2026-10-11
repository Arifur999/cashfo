import SectionCard from "@/components/shared/SectionCard";
import type { StatsCardProps } from "@/components/shared/StatsCard";
import StatsGrid from "@/components/shared/StatsGrid";
import { formatCurrency } from "@/lib/currency";
import { formatPercent } from "@/lib/number";
import type { IChurnData, IRevenueSummary } from "@/types/revenue.types";
import RevenueTrendChart from "./RevenueTrendChart";

const buildRevenueStats = (summary: IRevenueSummary, churn: IChurnData): StatsCardProps[] => {
  const monthOverMonth =
    summary.lastMonthRevenue > 0 ? ((summary.thisMonthRevenue - summary.lastMonthRevenue) / summary.lastMonthRevenue) * 100 : null;

  return [
    { title: "Total Revenue", value: formatCurrency(summary.totalRevenue, undefined, 0), iconName: "DollarSign" },
    {
      title: "This Month",
      value: formatCurrency(summary.thisMonthRevenue, undefined, 0),
      iconName: "TrendingUp",
      trend: monthOverMonth !== null ? { value: monthOverMonth, label: "vs last month" } : null,
    },
    { title: "MRR", value: formatCurrency(summary.mrr, undefined, 0), iconName: "Wallet" },
    { title: "Churn Rate", value: formatPercent(churn.churnRatePercent), iconName: "Percent" },
  ];
};

// Finance roles only -- the page leaves it out for everyone else.
const RevenueOverview = ({ summary, churn }: { summary: IRevenueSummary; churn: IChurnData }) => {
  return (
    <div className="space-y-6">
      <StatsGrid items={buildRevenueStats(summary, churn)} />
      <SectionCard title="Revenue Trend" tooltip="Successful payments per month over the last 12 months.">
        <RevenueTrendChart trend={summary.revenueTrend} />
      </SectionCard>
    </div>
  );
};

export default RevenueOverview;
