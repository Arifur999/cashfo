import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import type { IOwnerOverviewItem } from "@/types/owner.types";
import { DaysUsedCell, PlanCell } from "./PeopleCells";
import { OWNER_STATUS_LABEL } from "./usersTable.config";

// The v16 Users list: who, phone, plan, when they last signed in, how long
// they have used Smartly, status. (Their workspaces are on their page.)
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
    meta: { width: 130 },
  },
  {
    id: "planName",
    accessorKey: "planName",
    header: "Plan",
    cell: ({ row }) => <PlanCell plan={row.original.planName} trialEndsAt={row.original.trialEndsAt} />,
    meta: { width: 116 },
  },
  {
    // lastLoginAt: when they last signed in, which the board calls active.
    id: "lastLoginAt",
    accessorKey: "lastLoginAt",
    header: "Last active",
    cell: ({ row }) => <DateCell date={row.original.lastLoginAt} relative />,
    meta: { width: 130 },
  },
  {
    id: "daysUsing",
    accessorKey: "daysUsing",
    header: "Using for",
    cell: ({ row }) => <DaysUsedCell days={row.original.daysUsing} />,
    meta: { width: 90 },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={row.original.status} label={OWNER_STATUS_LABEL[row.original.status]} dot />,
    meta: { width: 96 },
  },
];
