import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import type { IOwnerOverviewItem } from "@/types/owner.types";

export const USERS_HIDDEN_COLUMNS = [] as const;

// A plan's chip, as the design colours them: the paid plans in mint and
// forest, Business in amber, Free in the sunken grey.
const PLAN_TONE: Record<string, string> = {
  "Monthly Pro": "bg-mint-50 text-emerald",
  "Yearly Pro": "bg-forest text-white dark:bg-emerald dark:text-on-action",
  Business: "bg-warning-soft text-warning",
};

// The design's Users list: who, phone, their workspace (and how many more),
// plan, when they were last here, how long they have used Smartly, status.
export const usersColumns: ColumnDef<IOwnerOverviewItem>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "User",
    cell: ({ row }) => <UserInfoCell name={row.original.name} email={row.original.email} muted={row.original.status === "DELETED"} />,
    // A long email must not push the other columns off the page.
    meta: { exportValue: (row) => `${row.name} <${row.email}>`, cellClassName: "max-w-80" },
  },
  {
    id: "phone",
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => <span className={row.original.phone ? "text-ink-2 tabular-nums" : "text-ink-muted"}>{row.original.phone ?? "—"}</span>,
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
    meta: { exportValue: (row) => row.businessName ?? "" },
  },
  {
    id: "planName",
    accessorKey: "planName",
    header: "Plan",
    cell: ({ row }) => (row.original.planName ? <span className={`inline-flex rounded-full px-2 py-px text-caption font-semibold whitespace-nowrap ${PLAN_TONE[row.original.planName] ?? "bg-surface-sunken text-ink-2"}`}>{row.original.planName}</span> : <span className="text-ink-muted">—</span>),
  },
  {
    id: "lastLoginAt",
    accessorKey: "lastLoginAt",
    header: "Last active",
    cell: ({ row }) => <DateCell date={row.original.lastLoginAt} relative />,
  },
  {
    id: "daysUsing",
    accessorKey: "daysUsing",
    header: "Using for",
    cell: ({ row }) => (
      <span className="text-ink-2 tabular-nums">
        {row.original.daysUsing} {row.original.daysUsing === 1 ? "day" : "days"}
      </span>
    ),
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={row.original.status} dot />,
  },
];
