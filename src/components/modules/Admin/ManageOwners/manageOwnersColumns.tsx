import type { ColumnDef } from "@tanstack/react-table";
import { OwnWorkspaceCell } from "@/components/modules/Admin/UserManagement/PeopleCells";
import DateCell from "@/components/shared/cell/DateCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { OWNER_STATUS_LABEL } from "@/components/modules/Admin/UserManagement/usersTable.config";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import type { IOwnerOverviewItem } from "@/types/owner.types";

// The design's Owners list: who, the workspace Reset data wipes (their
// personal one), plan, when they last signed in, status -- and the View /
// Reset data buttons DataTable adds. The plan is plain text, as the board
// writes it, so the red Reset data stays the row's one loud mark.
export const manageOwnersColumns: ColumnDef<IOwnerOverviewItem>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Owner",
    cell: ({ row }) => <UserInfoCell name={row.original.name} email={row.original.email} avatar={false} muted={row.original.status === "DELETED"} />,
    meta: { exportValue: (row) => `${row.name} <${row.email}>` },
  },
  {
    id: "businessName",
    accessorKey: "businessName",
    header: "Workspace",
    cell: ({ row }) => <OwnWorkspaceCell workspace={row.original} long />,
    // "Personal workspace", and the Bangla ব্যক্তিগত ওয়ার্কস্পেস, at body size.
    meta: { width: 170, cellClassName: "truncate" },
  },
  {
    id: "planName",
    accessorKey: "planName",
    header: "Plan",
    // A plan's name is data, shown as written.
    cell: ({ row }) => <span className={row.original.planName ? "text-ink-2" : "text-ink-muted"}>{row.original.planName ?? "—"}</span>,
    meta: { width: 110, cellClassName: "truncate" },
  },
  {
    id: "lastLoginAt",
    accessorKey: "lastLoginAt",
    header: "Last login",
    cell: ({ row }) => <DateCell date={row.original.lastLoginAt} relative />,
    meta: { width: 150 },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={row.original.status} label={OWNER_STATUS_LABEL[row.original.status]} dot />,
    meta: { width: 100 },
  },
];
