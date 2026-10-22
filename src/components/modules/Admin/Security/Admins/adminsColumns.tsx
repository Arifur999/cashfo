import type { ColumnDef } from "@tanstack/react-table";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { ADMIN_ROLE_CHIP, ADMIN_ROLE_SHORT_LABELS } from "@/lib/adminRoles";
import { formatDateTime } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { IAdminAccount } from "@/types/adminAccount.types";
import AdminAvatar from "../AdminAvatar";
import type { AdminDialog } from "./AdminDialogs";
import AdminRowActions from "./AdminRowActions";
import T from "@/components/shared/T";
import RelativeTime from "@/components/shared/RelativeTime";

const STATUS_LABEL: Record<IAdminAccount["status"], string> = { ACTIVE: "Active", SUSPENDED: "Suspended" };

// "Yesterday", with the full date and time on hover, both in the reader's language.
const LastSignIn = ({ at }: { at: string | null }) => {
  const { locale } = useLocale();
  return (
    <span className="text-small whitespace-nowrap text-ink-2" title={at ? formatDateTime(at, "—", locale) : undefined}>
      {at ? <RelativeTime value={at} as="day" /> : <T>Never</T>}
    </span>
  );
};

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
            {/* "(you)" sits after the name, not inside it, so a long name
                truncates without cutting it off. */}
            <span className="flex min-w-0 items-baseline gap-1">
              <span className={cn("min-w-0 truncate font-semibold", suspended ? "text-ink-muted" : "text-ink")}>{admin.name}</span>
              {admin.id === currentAdminId && (
                <span className="shrink-0 font-semibold text-ink-muted">
                  <T>(you)</T>
                </span>
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
    meta: { width: 120 },
  },
  {
    id: "lastLoginAt",
    accessorKey: "lastLoginAt",
    header: "Last sign-in",
    cell: ({ row }) => <LastSignIn at={row.original.lastLoginAt} />,
    meta: { width: 150, exportValue: (row) => (row.lastLoginAt ? formatDateTime(row.lastLoginAt) : "Never") },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadgeCell status={row.original.status} label={STATUS_LABEL[row.original.status]} tone={row.original.status === "SUSPENDED" ? "danger" : "success"} />
    ),
    meta: { width: 110, exportValue: (row) => STATUS_LABEL[row.status] },
  },
  {
    id: "actions",
    // Named for screen readers only, as the other lists keep it.
    header: () => (
      <span className="sr-only">
        <T>Actions</T>
      </span>
    ),
    cell: ({ row }) => <AdminRowActions admin={row.original} isSelf={row.original.id === currentAdminId} onOpen={onOpen} />,
    enableSorting: false,
    enableHiding: false,
    meta: { width: 150, align: "right" },
  },
];
