"use client";

import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { formatDate, formatDayName } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Translate } from "@/lib/i18n/message";
import { humanizeEnum } from "@/lib/statusBadge";
import { shortTicketId, TICKET_STATUS_LABEL } from "@/lib/tickets";
import type { ISupportTicketDetail } from "@/types/ticket.types";

// "today at 1:12 pm", "yesterday at 9:40 am", "1 Oct at 8:12 pm".
const openedAt = (value: string, t: Translate) => {
  const day = formatDayName(value);
  const time = formatDate(value, "h:mm aaa");
  if (day === "Today") return t("today at {time}", { time });
  if (day === "Yesterday") return t("yesterday at {time}", { time });
  return t("{date} at {time}", { date: day, time });
};

// The top of the ticket: its number, how urgent, where it is, the subject,
// and who opened it when.
const TicketHeader = ({ ticket }: { ticket: ISupportTicketDetail }) => {
  const { translate } = useLocale();
  return (
    <div className="flex flex-col gap-2 border-b border-line px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-mono text-small font-semibold text-ink-muted">{shortTicketId(ticket.id)}</code>
        <StatusBadgeCell status={ticket.priority} />
        <StatusBadgeCell status={ticket.status} label={TICKET_STATUS_LABEL[ticket.status]} />
      </div>
      <h1 className="text-h2 leading-snug wrap-break-word text-ink">{ticket.subject}</h1>
      <span className="text-small text-ink-muted">
        {translate("{category} · opened {when} by {name}", {
          category: translate(humanizeEnum(ticket.category)),
          when: openedAt(ticket.createdAt, translate),
          name: ticket.platformUser?.name ?? translate("an unknown person"),
        })}
      </span>
    </div>
  );
};

export default TicketHeader;
