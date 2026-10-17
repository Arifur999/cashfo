import type { ColumnDef } from "@tanstack/react-table";
import PlanChipCell from "@/components/shared/cell/PlanChipCell";
import { Button } from "@/components/ui/button";
import { formatDate, formatRelativeDay } from "@/lib/date";
import { rolloutLabel } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";
import type { IFeatureFlag } from "@/types/featureFlag.types";
import FeatureFlagSwitch from "./FeatureFlagSwitch";

interface FeatureFlagColumnsOptions {
  planNames: Map<string, string>;
  adminNames: Map<string, string>;
  onEdit: (flag: IFeatureFlag) => void;
}

const targetsOf = (flag: IFeatureFlag, planNames: Map<string, string>) =>
  flag.targetPlanIds.length === 0 ? ["All plans"] : flag.targetPlanIds.map((id) => planNames.get(id) ?? "Removed plan");

// The design's flag list: what it is, its switch, how many people get it,
// on which plans, who changed it last, and Edit.
export const buildFeatureFlagsColumns = ({ planNames, adminNames, onEdit }: FeatureFlagColumnsOptions): ColumnDef<IFeatureFlag>[] => [
  {
    id: "name",
    accessorKey: "name",
    header: "Flag",
    cell: ({ row }) => (
      <span className="flex max-w-md min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <b className="font-semibold text-ink">{row.original.name}</b>
          <code className="rounded-sm bg-surface-sunken px-2 font-mono text-caption text-ink-2">{row.original.key}</code>
        </span>
        {row.original.description && <span className="truncate text-small text-ink-muted">{row.original.description}</span>}
        {/* A key no code reads yet: switching it changes nothing. */}
        {!row.original.usedFor && <span className="text-caption font-semibold text-warning">Not used by the app yet</span>}
      </span>
    ),
    meta: { exportValue: (row) => `${row.name} (${row.key})` },
  },
  {
    id: "isEnabled",
    accessorFn: (row) => (row.isEnabled ? "On" : "Off"),
    header: "On",
    cell: ({ row }) => <FeatureFlagSwitch flag={row.original} />,
  },
  {
    id: "rolloutPercent",
    accessorKey: "rolloutPercent",
    header: "How many people",
    cell: ({ row }) => (
      <span className="flex w-40 flex-col gap-1">
        <span className={cn("text-small font-semibold", row.original.isEnabled ? "text-ink" : "text-ink-muted")}>{rolloutLabel(row.original)}</span>
        <span className="h-1.5 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
          <span className={cn("block h-full rounded-full", row.original.isEnabled ? "bg-emerald" : "bg-line-strong")} style={{ width: `${row.original.rolloutPercent}%` }} />
        </span>
      </span>
    ),
    meta: { exportValue: (row) => rolloutLabel(row) },
  },
  {
    id: "targets",
    accessorFn: (row) => targetsOf(row, planNames).join(", "),
    header: "Plans",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="flex max-w-52 flex-wrap gap-1">
        {targetsOf(row.original, planNames).map((name) => (
          <PlanChipCell key={name} plan={name} />
        ))}
      </span>
    ),
  },
  {
    id: "updatedAt",
    accessorKey: "updatedAt",
    header: "Last change",
    cell: ({ row }) => (
      <span className="flex flex-col gap-px text-small">
        <span className="text-ink">{(row.original.updatedBy && adminNames.get(row.original.updatedBy)) ?? "—"}</span>
        <span className="text-ink-muted">{formatRelativeDay(row.original.updatedAt)}</span>
      </span>
    ),
    meta: { exportValue: (row) => formatDate(row.updatedAt) },
  },
  {
    id: "edit",
    header: () => <span className="sr-only">Edit</span>,
    cell: ({ row }) => (
      <span className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-md border-line-strong bg-surface px-3 text-small font-semibold text-ink hover:bg-cream"
          onClick={() => onEdit(row.original)}
        >
          Edit
        </Button>
      </span>
    ),
    enableSorting: false,
    enableHiding: false,
  },
];
