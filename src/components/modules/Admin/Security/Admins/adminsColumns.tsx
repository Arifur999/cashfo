import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import { Badge } from "@/components/ui/badge";
import { DATE_TIME_FORMAT, formatDate, formatDateTime } from "@/lib/date";
import type { IAdminAccount } from "@/types/adminAccount.types";

// Shown under the name already; still searchable and exportable.
export const ADMINS_HIDDEN_COLUMNS = ["email"] as const;

// Built per viewer, so your own row is marked.
export const buildAdminsColumns = (currentAdminId: string | null): ColumnDef<IAdminAccount>[] => [
  {
    id: "name",
    accessorKey: "name",
    header: "Admin",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <UserInfoCell name={row.original.name} email={row.original.email} />
        {row.original.id === currentAdminId && <Badge variant="secondary">You</Badge>}
      </div>
    ),
  },
  {
    id: "email",
    accessorKey: "email",
    header: "Email",
  },
  {
    id: "role",
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => <StatusBadgeCell status={row.original.role} />,
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={row.original.status} />,
  },
  {
    id: "lastLoginAt",
    accessorKey: "lastLoginAt",
    header: "Last Sign-in",
    cell: ({ row }) =>
      row.original.lastLoginAt ? (
        <DateCell date={row.original.lastLoginAt} formatString={DATE_TIME_FORMAT} />
      ) : (
        <span className="text-muted-foreground italic">Never</span>
      ),
    meta: { exportValue: (row) => (row.lastLoginAt ? formatDateTime(row.lastLoginAt) : "Never") },
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Added",
    cell: ({ row }) => <DateCell date={row.original.createdAt} />,
    meta: { exportValue: (row) => formatDate(row.createdAt) },
  },
];
