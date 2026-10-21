import type { ColumnDef } from "@tanstack/react-table";
import { OwnWorkspaceCell } from "@/components/modules/Admin/UserManagement/PeopleCells";
import DateCell from "@/components/shared/cell/DateCell";
import PlanChipCell from "@/components/shared/cell/PlanChipCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import type { IOwnerOverviewItem } from "@/types/owner.types";

// The design's Owners list: who, the workspace Reset data wipes (their
// personal one), plan, when they last signed in, status -- and the View /
// Reset data buttons DataTable adds.
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
    cell: ({ row }) => <OwnWorkspaceCell name={row.original.businessName} long />,
    meta: { width: 190, cellClassName: "truncate" },
  },
  {
    id: "planName",
    accessorKey: "planName",
    header: "Plan",
    cell: ({ row }) => <PlanChipCell plan={row.original.planName} />,
    meta: { width: 120 },
  },
  {
    id: "lastLoginAt",
    accessorKey: "lastLoginAt",
    header: "Last sign-in",
    cell: ({ row }) => <DateCell date={row.original.lastLoginAt} relative />,
    meta: { width: 150 },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={row.original.status} dot />,
    meta: { width: 100 },
  },
];
