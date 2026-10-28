import type { ColumnDef } from "@tanstack/react-table";
import PlanChipCell from "@/components/shared/cell/PlanChipCell";
import RelativeTime from "@/components/shared/RelativeTime";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import { formatDate } from "@/lib/date";
import { rolloutLabel } from "@/lib/featureFlags";
import { useLocale } from "@/lib/i18n/LocaleProvider";
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

// What it is: its name, its key and what it does. What switching it
// changes in the app (or that nothing reads it yet) is in its Edit dialog.
const NameCell = ({ flag }: { flag: IFeatureFlag }) => (
  <span className="flex min-w-0 flex-col gap-0.5">
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
      <b className="font-semibold text-ink">{flag.name}</b>
      <code className="rounded-sm bg-surface-sunken px-1.5 font-mono text-[11.5px] text-ink-2">{flag.key}</code>
    </span>
    {flag.description && (
      <span className="truncate text-[12.5px] text-ink-muted" title={flag.description}>
        {flag.description}
      </span>
    )}
  </span>
);

// How many people get it, with its bar, in the reader's language.
const RolloutCell = ({ flag }: { flag: IFeatureFlag }) => {
  const { translate, locale } = useLocale();
  return (
    <span className="flex w-40 flex-col gap-1">
      <span className={cn("text-small font-semibold", flag.isEnabled ? "text-ink" : "text-ink-muted")}>{rolloutLabel(flag, translate, locale)}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
        <span className={cn("block h-full rounded-full", flag.isEnabled ? "bg-emerald" : "bg-line-strong")} style={{ width: `${flag.rolloutPercent}%` }} />
      </span>
    </span>
  );
};

// The plans it is limited to; "All plans" and "Removed plan" are words, the rest names.
const TargetsCell = ({ flag, planNames }: { flag: IFeatureFlag; planNames: Map<string, string> }) => {
  const { translate } = useLocale();
  return (
    <span className="flex max-w-52 flex-wrap gap-1">
      {targetsOf(flag, planNames).map((name) => (
        <PlanChipCell key={name} plan={name === "All plans" || name === "Removed plan" ? translate(name) : name} />
      ))}
    </span>
  );
};

// "Edit", named for its row: it changes who gets the flag, not its name.
const EditButton = ({ flag, onEdit }: { flag: IFeatureFlag; onEdit: (flag: IFeatureFlag) => void }) => {
  const { translate } = useLocale();
  return (
    <span className="flex justify-end">
      <Button variant="secondary" size="xs" className="h-8 px-2.5 text-[12.5px]" aria-label={translate("Edit rollout for {name}", { name: flag.name })} onClick={() => onEdit(flag)}>
        <T>Edit</T>
      </Button>
    </span>
  );
};

// The design's flag list: what it is, its switch, how many people get it,
// on which plans, who changed it last, and its rollout.
export const buildFeatureFlagsColumns = ({ planNames, adminNames, onEdit }: FeatureFlagColumnsOptions): ColumnDef<IFeatureFlag>[] => [
  {
    id: "name",
    accessorKey: "name",
    header: "Flag",
    cell: ({ row }) => <NameCell flag={row.original} />,
    meta: { exportValue: (row) => `${row.name} (${row.key})` },
  },
  {
    id: "isEnabled",
    accessorFn: (row) => (row.isEnabled ? "On" : "Off"),
    header: "On",
    cell: ({ row }) => <FeatureFlagSwitch flag={row.original} targets={targetsOf(row.original, planNames)} />,
    meta: { width: 78 },
  },
  {
    id: "rolloutPercent",
    accessorKey: "rolloutPercent",
    header: "How many people",
    cell: ({ row }) => <RolloutCell flag={row.original} />,
    meta: { width: 170, exportValue: (row) => rolloutLabel(row) },
  },
  {
    id: "targets",
    accessorFn: (row) => targetsOf(row, planNames).join(", "),
    header: "Plans",
    enableSorting: false,
    cell: ({ row }) => <TargetsCell flag={row.original} planNames={planNames} />,
    meta: { width: 200 },
  },
  {
    id: "updatedAt",
    accessorKey: "updatedAt",
    header: "Last change",
    cell: ({ row }) => (
      <span className="flex flex-col gap-px text-small">
        <span className="text-ink">{(row.original.updatedBy && adminNames.get(row.original.updatedBy)) ?? "—"}</span>
        <span className="text-ink-muted">
          <RelativeTime value={row.original.updatedAt} as="day" />
        </span>
      </span>
    ),
    meta: { width: 150, exportValue: (row) => formatDate(row.updatedAt) },
  },
  {
    id: "edit",
    header: () => (
      <span className="sr-only">
        <T>Edit</T>
      </span>
    ),
    cell: ({ row }) => <EditButton flag={row.original} onEdit={onEdit} />,
    enableSorting: false,
    enableHiding: false,
    meta: { width: 64 },
  },
];
