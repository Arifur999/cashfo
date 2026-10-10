import type { StatsCardProps } from "@/components/shared/StatsCard";
import StatsGrid from "@/components/shared/StatsGrid";
import { formatCurrency } from "@/lib/currency";
import { formatNumber } from "@/lib/number";
import type { IDashboardSummary } from "@/types/dashboard.types";

// Role-gated figures arrive as null and are simply left out.
const buildStats = (summary: IDashboardSummary): StatsCardProps[] => [
  { title: "Total Users", value: formatNumber(summary.totalUsers), iconName: "Users" },
  { title: "New Users (30d)", value: formatNumber(summary.newUsersLast30d), iconName: "UserPlus" },
  ...(summary.mrr !== null ? [{ title: "MRR", value: formatCurrency(summary.mrr, undefined, 0), iconName: "DollarSign" as const }] : []),
  { title: "Open Tickets", value: formatNumber(summary.openTickets), iconName: "LifeBuoy" },
  ...(summary.pendingFlags !== null
    ? [{ title: "Pending Flags", value: formatNumber(summary.pendingFlags), iconName: "ShieldAlert" as const }]
    : []),
];

const DashboardStats = ({ summary }: { summary: IDashboardSummary }) => {
  return <StatsGrid items={buildStats(summary)} />;
};

export default DashboardStats;
