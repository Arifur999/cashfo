import type { ColumnDef } from "@tanstack/react-table";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { ADMIN_ROLE_CHIP, ADMIN_ROLE_SHORT_LABELS } from "@/lib/adminRoles";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { IAdminAccount } from "@/types/adminAccount.types";
import AdminAvatar from "../AdminAvatar";
import type { AdminDialog } from "./AdminDialogs";
import AdminRowActions from "./AdminRowActions";
import T from "@/components/shared/T";
import RelativeTime from "@/components/shared/RelativeTime";

const STATUS_LABEL: Record<IAdminAccount["status"], string> = { ACTIVE: "Active", SUSPENDED: "Suspended" };

// The admin team as the design draws it: who (with "(you)" on your own
// row), their role, when they last signed in, whether they can, and the
// row's actions. Built per viewer, so your own row is marked.
export const buildAdminsColumns = (currentAdminId: string | null, onOpen: (dialog: AdminDialog, admin: IAdminAccount) => void): ColumnDef<IAdminAccount>[] => [
  {
    id: "name",
    accessorKey: "name",
    header: "Admin",
    cell: ({ row }) => {
      const admin = row.original;
      const suspended = admin.status === "SUSPENDED";
      return (
        <span className="flex min-w-0 items-center gap-3">
          <AdminAvatar name={admin.name} role={admin.role} muted={suspended} />
          <span className="flex min-w-0 flex-col gap-px">
            <span className={cn("truncate font-semibold", suspended ? "text-ink-muted" : "text-ink")}>
              {admin.name}
              {admin.id === currentAdminId && (
                <>
                  {" "}
                  <T>(you)</T>
                </>
              )}
            </span>
            <span className="truncate text-small text-ink-muted">{admin.email}</span>
          </span>
        </span>
      );
    },
    meta: { exportValue: (row) => `${row.name} <${row.email}>` },
  },
  {
    id: "role",
    accessorFn: (row) => ADMIN_ROLE_SHORT_LABELS[row.role],
    header: "Role",
    cell: ({ row }) => (
      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-caption font-semibold whitespace-nowrap", ADMIN_ROLE_CHIP[row.original.role])}>
        <T>{ADMIN_ROLE_SHORT_LABELS[row.original.role]}</T>
      </span>
    ),
  },
  {
    id: "lastLoginAt",
    accessorKey: "lastLoginAt",
    header: "Last sign-in",
    cell: ({ row }) => (
      <span className="text-small whitespace-nowrap text-ink-2" title={row.original.lastLoginAt ? formatDateTime(row.original.lastLoginAt) : undefined}>
        {row.original.lastLoginAt ? <RelativeTime value={row.original.lastLoginAt} as="day" /> : <T>Never</T>}
      </span>
    ),
    meta: { exportValue: (row) => (row.lastLoginAt ? formatDateTime(row.lastLoginAt) : "Never") },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadgeCell status={row.original.status} label={STATUS_LABEL[row.original.status]} tone={row.original.status === "SUSPENDED" ? "danger" : "success"} />
    ),
    meta: { exportValue: (row) => STATUS_LABEL[row.status] },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <AdminRowActions admin={row.original} isSelf={row.original.id === currentAdminId} onOpen={onOpen} />,
    enableSorting: false,
    enableHiding: false,
    meta: { align: "right" },
  },
];
