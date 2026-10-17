import type { ColumnDef } from "@tanstack/react-table";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import RelativeTime from "@/components/shared/RelativeTime";
import T from "@/components/shared/T";
import { formatDateTime } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { humanizeEnum } from "@/lib/statusBadge";
import { getInitials } from "@/lib/text";
import { awaitingReply, isLate, shortTicketId, TICKET_STATUS_LABEL } from "@/lib/tickets";
import { cn } from "@/lib/utils";
import type { ISupportTicket } from "@/types/ticket.types";

// The dot beside a ticket the user wrote in last.
const NewReplyDot = () => {
  const { translate } = useLocale();
  return <span title={translate("New reply from the user")} className="size-1.75 shrink-0 rounded-full bg-info" />;
};

// The design's queue: the ticket's number with a dot when the user is
// waiting, the subject over who wrote, what kind, how urgent, where it is,
// who has it, and how long since the last message.
export const ticketsColumns: ColumnDef<ISupportTicket>[] = [
  {
    id: "id",
    accessorFn: (row) => shortTicketId(row.id),
    header: "Ticket",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="flex items-center gap-2">
        {awaitingReply(row.original) && <NewReplyDot />}
        <code className="font-mono text-small font-semibold text-ink-2">{shortTicketId(row.original.id)}</code>
      </span>
    ),
    meta: { width: 64 },
  },
  {
    id: "subject",
    accessorKey: "subject",
    header: "Subject",
    cell: ({ row }) => (
      <span className="flex min-w-0 flex-col gap-px">
        <span className={cn("truncate text-ink", awaitingReply(row.original) ? "font-bold" : "font-medium")} title={row.original.subject}>
          {row.original.subject}
        </span>
        <span className="truncate text-small text-ink-muted">{row.original.platformUser?.name ?? <T>Unknown person</T>}</span>
      </span>
    ),
    meta: { exportValue: (row) => `${row.subject} (${row.platformUser?.name ?? "Unknown"})` },
  },
  {
    id: "category",
    accessorKey: "category",
    header: "Type",
    cell: ({ row }) => <span className="text-small text-ink-2">
        <T>{humanizeEnum(row.original.category)}</T>
      </span>,
    meta: { width: 120, exportValue: (row) => humanizeEnum(row.category) },
  },
  {
    id: "priority",
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => <StatusBadgeCell status={row.original.priority} />,
    meta: { width: 86 },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={row.original.status} label={TICKET_STATUS_LABEL[row.original.status]} />,
    meta: { width: 130, exportValue: (row) => TICKET_STATUS_LABEL[row.status] },
  },
  {
    id: "assignee",
    accessorFn: (row) => row.assignedAdmin?.name ?? "Not assigned",
    header: "Assigned to",
    cell: ({ row }) => {
      const admin = row.original.assignedAdmin;
      return (
        <span className="flex min-w-0 items-center gap-2">
          <Avatar className="size-6.5">
            <AvatarFallback className={cn("text-caption font-bold", admin ? "bg-info-soft text-info" : "bg-surface-sunken text-ink-muted")}>{admin ? getInitials(admin.name) : "—"}</AvatarFallback>
          </Avatar>
          <span className={cn("truncate", admin ? "text-ink-2" : "text-ink-muted")}>{admin?.name ?? <T>Not assigned</T>}</span>
        </span>
      );
    },
    meta: { width: 150 },
  },
  {
    id: "lastMessageAt",
    accessorKey: "lastMessageAt",
    header: "Last reply",
    cell: ({ row }) => {
      const late = isLate(row.original);
      return <span className={cn("text-small whitespace-nowrap", late ? "font-bold text-expense" : "font-medium text-ink-muted")}><RelativeTime value={row.original.lastMessageAt ?? row.original.updatedAt} as="elapsed" /></span>;
    },
    meta: { width: 92, align: "right", exportValue: (row) => formatDateTime(row.lastMessageAt ?? row.updatedAt) },
  },
];
