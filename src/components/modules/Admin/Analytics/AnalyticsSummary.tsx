import StatsGrid from "@/components/shared/StatsGrid";
import { formatNumber } from "@/lib/number";
import type { IEngagementPoint, IFeatureUsageEntry } from "@/types/analytics.types";

interface AnalyticsSummaryProps {
  featureUsage: IFeatureUsageEntry[] | undefined;
  engagement: IEngagementPoint[] | undefined;
}

const countOf = (featureUsage: IFeatureUsageEntry[] | undefined, ...eventTypes: string[]) =>
  featureUsage?.filter((entry) => eventTypes.includes(entry.eventType)).reduce((sum, entry) => sum + entry.count, 0);

// Headline numbers for the selected range, derived from the same reports
// the charts below show.
const AnalyticsSummary = ({ featureUsage, engagement }: AnalyticsSummaryProps) => {
  const latestWau = engagement?.at(-1)?.wau;
  const averageWau = engagement?.length ? Math.round(engagement.reduce((sum, point) => sum + point.wau, 0) / engagement.length) : undefined;

  return (
    <StatsGrid
      items={[
        { title: "Logins", value: formatNumber(countOf(featureUsage, "login")), iconName: "Users" },
        {
          title: "Transactions Added",
          value: formatNumber(countOf(featureUsage, "income_added", "expense_added")),
          iconName: "Wallet",
          description: "Income and expense entries",
        },
        {
          title: "Weekly Active",
          value: formatNumber(latestWau),
          iconName: "TrendingUp",
          description: averageWau === undefined ? undefined : `Average ${formatNumber(averageWau)} over the period`,
        },
        { title: "Workspaces Created", value: formatNumber(countOf(featureUsage, "workspace_created")), iconName: "Layers" },
      ]}
    />
  );
};

export default AnalyticsSummary;
