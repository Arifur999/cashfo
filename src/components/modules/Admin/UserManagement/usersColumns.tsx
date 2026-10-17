import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import PlanChipCell from "@/components/shared/cell/PlanChipCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import type { IOwnerOverviewItem } from "@/types/owner.types";
import Localized from "@/components/shared/Localized";
import { plural } from "@/lib/i18n/message";

// The design's Users list: who, phone, their workspace (and how many more),
// plan, when they were last here, how long they have used Smartly, status.
export const usersColumns: ColumnDef<IOwnerOverviewItem>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "User",
    cell: ({ row }) => <UserInfoCell name={row.original.name} email={row.original.email} muted={row.original.status === "DELETED"} />,
    meta: { exportValue: (row) => `${row.name} <${row.email}>` },
  },
  {
    id: "phone",
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => <span className={row.original.phone ? "text-ink-2 tabular-nums" : "text-ink-muted"}>{row.original.phone ?? "—"}</span>,
    meta: { width: 120 },
  },
  {
    id: "businessName",
    accessorKey: "businessName",
    header: "Workspace",
    cell: ({ row }) => (
      <span className="flex items-center gap-2">
        <span className={row.original.businessName ? "truncate text-ink-2" : "text-ink-muted"}>{row.original.businessName ?? "—"}</span>
        {row.original.workspaceCount > 1 && <span className="shrink-0 rounded-full bg-surface-sunken px-2 text-caption font-semibold text-ink-2">+{row.original.workspaceCount - 1}</span>}
      </span>
    ),
    meta: { width: 170, exportValue: (row) => row.businessName ?? "" },
  },
  {
    id: "planName",
    accessorKey: "planName",
    header: "Plan",
    cell: ({ row }) => <PlanChipCell plan={row.original.planName} />,
    meta: { width: 116 },
  },
  {
    id: "lastLoginAt",
    accessorKey: "lastLoginAt",
    header: "Last active",
    cell: ({ row }) => <DateCell date={row.original.lastLoginAt} relative />,
    meta: { width: 124 },
  },
  {
    id: "daysUsing",
    accessorKey: "daysUsing",
    header: "Using for",
    cell: ({ row }) => (
      <span className="text-ink-2 tabular-nums">
        <Localized>{(t) => plural(t, row.original.daysUsing, "{count} day", "{count} days")}</Localized>
      </span>
    ),
    meta: { width: 84 },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={row.original.status} dot />,
    meta: { width: 96 },
  },
];
