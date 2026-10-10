import StatsGrid from "@/components/shared/StatsGrid";
import { formatCurrency } from "@/lib/currency";
import { formatNumber } from "@/lib/number";
import type { IWorkspaceOverviewSummary } from "@/types/workspace.types";

const WorkspaceSummaryStats = ({ summary }: { summary: IWorkspaceOverviewSummary }) => {
  return (
    <StatsGrid
      columns={3}
      items={[
        { title: "Users With Extra Workspaces", value: formatNumber(summary.totalUsers), iconName: "Users" },
        { title: "Additional Workspaces", value: formatNumber(summary.totalAdditionalWorkspaces), iconName: "Layers" },
        {
          title: "Est. Monthly Add-On Revenue",
          value: formatCurrency(summary.totalEstimatedMonthlyAddOnRevenue),
          iconName: "DollarSign",
        },
      ]}
    />
  );
};

export default WorkspaceSummaryStats;
