import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { TicketPriorityChip, TicketStatusChip } from "../TicketChips";
import { ticketHref } from "../ticketLinks";

// The dot beside a ticket the user wrote in last, said out loud too: the
// colour and the bold subject only reach the eye.
const NewReplyDot = () => {
  const { translate } = useLocale();
  const label = translate("New reply from the user");
  return (
    <>
      <span title={label} aria-hidden="true" className="size-1.75 shrink-0 rounded-full bg-info" />
      <span className="sr-only">{label}</span>
    </>
  );
};

// A ticket no admin has opened yet: the board's blue "New".
export const isNewTicket = (ticket: Pick<ISupportTicket, "firstSeenAt">) => ticket.firstSeenAt === null;

// The subject is a real link (a new tab, a middle-click, a screen reader's
// list of links); the row's own click stays for the rest of the row. A
// ticket nobody has opened says "New", and one the customer sent from
// Settings › Help says "Help page".
const SubjectCell = ({ ticket }: { ticket: ISupportTicket }) => {
  const listQuery = useSearchParams().toString();
  const { translate } = useLocale();
  const fresh = isNewTicket(ticket);
  return (
    <span className="flex min-w-0 flex-col gap-px">
      <span className="flex min-w-0 items-center gap-2">
        <Link
          href={ticketHref(ticket.id, listQuery)}
          onClick={(event) => event.stopPropagation()}
          title={ticket.subject}
          className={cn("truncate text-[13.5px] leading-[normal] text-ink hover:underline", awaitingReply(ticket) || fresh ? "font-bold" : "font-medium")}
        >
          {ticket.subject}
        </Link>
        {fresh && <span className="shrink-0 rounded-full bg-info px-1.75 py-px text-[10.5px] leading-[normal] font-bold tracking-[0.02em] text-white">{translate("New")}</span>}
        {ticket.fromHelpPage && (
          <span title={translate("Sent from Settings › Help & support")} className="shrink-0 rounded-full bg-emerald-soft px-1.75 py-px text-[10.5px] leading-[normal] font-semibold whitespace-nowrap text-brand-ink">
            {translate("Help page")}
          </span>
        )}
      </span>
      <span className="truncate text-[12.5px] leading-[normal] text-ink-muted">{ticket.platformUser?.name ?? <T>Unknown person</T>}</span>
    </span>
  );
};

// The design's queue: the ticket's number with a dot when the user is
// waiting, the subject over who wrote, what kind, how urgent, where it is,
// who has it, and how long since the last message.
export const ticketsColumns: ColumnDef<ISupportTicket>[] = [
  {
    id: "id",
    accessorFn: (row) => shortTicketId(row),
    header: "Ticket",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="flex items-center gap-1.5">
        {awaitingReply(row.original) && <NewReplyDot />}
        <code className="font-mono text-[12.5px] leading-[normal] font-semibold text-ink-2">{shortTicketId(row.original)}</code>
      </span>
    ),
    meta: { width: 76 },
  },
  {
    id: "subject",
    accessorKey: "subject",
    header: "Subject",
    cell: ({ row }) => <SubjectCell ticket={row.original} />,
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
    cell: ({ row }) => <TicketPriorityChip priority={row.original.priority} />,
    meta: { width: 86 },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <TicketStatusChip status={row.original.status} />,
    // Room for "Waiting on user" in either language.
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
            <AvatarFallback className={cn("text-[10px] font-bold", admin ? "bg-info-soft text-info" : "bg-surface-sunken text-ink-faint")}>{admin ? getInitials(admin.name) : "—"}</AvatarFallback>
          </Avatar>
          <span className={cn("truncate text-[13.5px] leading-[normal]", admin ? "text-ink-2" : "text-ink-faint")}>{admin?.name ?? <T>Not assigned</T>}</span>
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
      return <span className={cn("text-[12.5px] leading-[normal] whitespace-nowrap", late ? "font-bold text-expense" : "font-medium text-ink-muted")}><RelativeTime value={row.original.lastMessageAt ?? row.original.updatedAt} as="elapsed" /></span>;
    },
    meta: { width: 92, align: "right", exportValue: (row) => formatDateTime(row.lastMessageAt ?? row.updatedAt) },
  },
];
