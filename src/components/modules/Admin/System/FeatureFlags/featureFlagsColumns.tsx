import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date";
import type { IFeatureFlag } from "@/types/featureFlag.types";
import FeatureFlagSwitch from "./FeatureFlagSwitch";
import RolloutCell from "./RolloutCell";

const targetsOf = (flag: IFeatureFlag, planNames: Map<string, string>) =>
  flag.targetPlanIds.length === 0 ? ["All plans"] : flag.targetPlanIds.map((id) => planNames.get(id) ?? "Unknown plan");

// Built per plan list, since targeting shows plan names for ids.
export const buildFeatureFlagsColumns = (planNames: Map<string, string>): ColumnDef<IFeatureFlag>[] => [
  {
    id: "name",
    accessorKey: "name",
    header: "Flag",
    cell: ({ row }) => (
      <div className="max-w-sm min-w-0 space-y-0.5">
        <p className="font-medium text-foreground">{row.original.name}</p>
        <p className="font-mono text-xs text-muted-foreground">{row.original.key}</p>
        {row.original.description && <p className="text-xs whitespace-normal text-muted-foreground">{row.original.description}</p>}
      </div>
    ),
    meta: { exportValue: (row) => `${row.name} (${row.key})` },
  },
  {
    id: "isEnabled",
    accessorFn: (row) => (row.isEnabled ? "On" : "Off"),
    header: "Enabled",
    cell: ({ row }) => <FeatureFlagSwitch flag={row.original} />,
  },
  {
    id: "rolloutPercent",
    accessorKey: "rolloutPercent",
    header: "Rollout",
    cell: ({ row }) => <RolloutCell percent={row.original.rolloutPercent} isEnabled={row.original.isEnabled} />,
  },
  {
    id: "targets",
    accessorFn: (row) => targetsOf(row, planNames).join(", "),
    header: "Plans",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {targetsOf(row.original, planNames).map((name) => (
          <Badge key={name} variant="outline">
            {name}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    id: "updatedAt",
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => <DateCell date={row.original.updatedAt} />,
    meta: { exportValue: (row) => formatDate(row.updatedAt) },
  },
];
