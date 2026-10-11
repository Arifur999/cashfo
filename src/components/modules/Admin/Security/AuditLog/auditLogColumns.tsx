import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import { auditActionLabel } from "@/lib/auditActionLabels";
import { isSensitiveAuditEntry } from "@/lib/auditDiff";
import { DATE_TIME_FORMAT, formatDateTime } from "@/lib/date";
import type { IAuditLogEntry } from "@/types/auditLog.types";
import SensitiveMarker from "./SensitiveMarker";

export const entityReference = (entry: Pick<IAuditLogEntry, "entityType" | "entityId">) =>
  entry.entityId ? `${entry.entityType} #${entry.entityId.slice(0, 8)}` : entry.entityType;

export const auditLogColumns: ColumnDef<IAuditLogEntry>[] = [
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => <DateCell date={row.original.createdAt} formatString={DATE_TIME_FORMAT} />,
    meta: { exportValue: (row) => formatDateTime(row.createdAt) },
  },
  {
    id: "admin",
    accessorFn: (row) => row.adminUser.name,
    header: "Admin",
    cell: ({ row }) => <span className="font-medium text-foreground">{row.original.adminUser.name}</span>,
  },
  {
    id: "action",
    accessorFn: (row) => auditActionLabel(row.action),
    header: "Action",
    cell: ({ row }) => (
      <span className="flex items-center gap-2">
        {isSensitiveAuditEntry(row.original.newValue) && <SensitiveMarker />}
        <span className="text-foreground">{auditActionLabel(row.original.action)}</span>
      </span>
    ),
  },
  {
    id: "entity",
    accessorFn: entityReference,
    header: "Record",
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{entityReference(row.original)}</span>,
  },
  {
    id: "ipAddress",
    accessorKey: "ipAddress",
    header: "IP Address",
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.ipAddress ?? "—"}</span>,
  },
];
