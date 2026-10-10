import StatsGrid from "@/components/shared/StatsGrid";
import { formatDateTime } from "@/lib/date";
import { formatNumber } from "@/lib/number";
import type { IOwnerDetail } from "@/types/owner.types";

const OwnerSummaryStats = ({ owner }: { owner: IOwnerDetail }) => {
  return (
    <StatsGrid
      columns={3}
      items={[
        { title: "Plan", value: owner.planName ?? "None", iconName: "Tag" },
        { title: "Workspaces", value: formatNumber(owner.workspaceCount), iconName: "Layers" },
        { title: "Last Login", value: formatDateTime(owner.lastLoginAt, "Never"), iconName: "Clock" },
      ]}
    />
  );
};

export default OwnerSummaryStats;
