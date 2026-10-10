import HorizontalBarList from "@/components/shared/charts/HorizontalBarList";
import SectionCard from "@/components/shared/SectionCard";
import { formatCurrency } from "@/lib/currency";
import { formatPercent } from "@/lib/number";
import type { IPlanAnalytics } from "@/types/plan.types";

const PlansUsageCard = ({ analytics }: { analytics: IPlanAnalytics }) => {
  const { summary } = analytics;

  return (
    <SectionCard title="Users per Plan" tooltip="Accounts on each plan, with the free/paid split and estimated revenue.">
      <p className="mb-4 text-xs text-muted-foreground">
        {formatPercent(summary.freePercentage, 0)} free &middot; {formatPercent(summary.paidPercentage, 0)} paid &middot;{" "}
        {formatCurrency(summary.totalRevenueEstimate, undefined, 0)} est. revenue
      </p>
      <HorizontalBarList
        items={analytics.perPlan.map((plan) => ({ label: plan.planName, value: plan.totalUsers, unit: "users" }))}
        emptyMessage="No plans yet."
      />
    </SectionCard>
  );
};

export default PlansUsageCard;
