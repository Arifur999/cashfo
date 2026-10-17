import type { ColumnDef } from "@tanstack/react-table";
import { auditActionLabel } from "@/lib/auditActionLabels";
import { isSensitiveAuditEntry } from "@/lib/auditDiff";
import { auditOnText } from "@/lib/auditRecords";
import { formatDateTime } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { IAuditLogEntry } from "@/types/auditLog.types";
import AdminAvatar from "../AdminAvatar";
import SensitiveMarker from "./SensitiveMarker";
import T from "@/components/shared/T";
import RelativeTime from "@/components/shared/RelativeTime";

// The record and what changed, in the reader's language.
const OnCell = ({ entry }: { entry: IAuditLogEntry }) => {
  const { translate } = useLocale();
  const text = auditOnText(entry, translate);
  return (
    <span className="block max-w-100 truncate text-ink-2" title={text}>
      {text}
    </span>
  );
};

// A sign-in is routine; it reads quieter than a change.
const QUIET_ACTIONS = new Set(["ADMIN_LOGIN"]);

// The audit log as the design draws it: when, who, what they did, on what
// (and what changed), from where, and a link into the entry.
export const buildAuditLogColumns = (onOpen: (entry: IAuditLogEntry) => void): ColumnDef<IAuditLogEntry>[] => [
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "When",
    cell: ({ row }) => (
      <span className="text-small whitespace-nowrap text-ink-2" title={formatDateTime(row.original.createdAt)}>
        <RelativeTime value={row.original.createdAt} as="log" />
      </span>
    ),
    meta: { width: 100, exportValue: (row) => formatDateTime(row.createdAt) },
  },
  {
    id: "admin",
    accessorFn: (row) => row.adminUser.name,
    header: "Admin",
    cell: ({ row }) => (
      <span className="flex items-center gap-2">
        <AdminAvatar name={row.original.adminUser.name} role={row.original.adminUser.role} size="sm" />
        <span className="whitespace-nowrap text-ink">{row.original.adminUser.name}</span>
      </span>
    ),
    meta: { width: 170 },
  },
  {
    id: "action",
    accessorFn: (row) => auditActionLabel(row.action),
    header: "What they did",
    cell: ({ row }) => (
      <span className={cn("flex items-center gap-2 font-semibold", QUIET_ACTIONS.has(row.original.action) ? "text-ink-muted" : "text-ink")}>
        {isSensitiveAuditEntry(row.original.newValue) && <SensitiveMarker />}
        <T>{auditActionLabel(row.original.action)}</T>
      </span>
    ),
    meta: { width: 220 },
  },
  {
    id: "on",
    accessorFn: (row) => auditOnText(row),
    header: "On@@record",
    cell: ({ row }) => <OnCell entry={row.original} />,
  },
  {
    id: "ipAddress",
    accessorKey: "ipAddress",
    header: "IP address",
    cell: ({ row }) => <code className="font-mono text-small whitespace-nowrap text-ink-2">{row.original.ipAddress ?? "—"}</code>,
    meta: { width: 130 },
  },
  {
    id: "open",
    header: () => <span className="sr-only"><T>Open</T></span>,
    cell: ({ row }) => (
      <span className="flex justify-end">
        <button
          type="button"
          className="text-small font-semibold text-emerald hover:underline"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(row.original);
          }}
        >
          <T>Open</T>
        </button>
      </span>
    ),
    enableSorting: false,
    enableHiding: false,
    meta: { width: 50 },
  },
];
