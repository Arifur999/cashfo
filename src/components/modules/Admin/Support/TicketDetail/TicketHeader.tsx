"use client";

import { formatDate, formatDayName } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";
import { humanizeEnum } from "@/lib/statusBadge";
import { shortTicketId } from "@/lib/tickets";
import type { ISupportTicketDetail } from "@/types/ticket.types";
import { TicketPriorityChip, TicketStatusChip } from "../TicketChips";

// "today at 1:12 pm", "yesterday at 9:40 am", "1 Oct at 8:12 pm". The day
// words stay English for the checks below; the date and time come in the
// reader's months and digits.
const openedAt = (value: string, t: Translate, locale: Locale) => {
  const day = formatDayName(value, { locale });
  const time = formatDate(value, "h:mm aaa", "—", locale);
  if (day === "Today") return t("today at {time}", { time });
  if (day === "Yesterday") return t("yesterday at {time}", { time });
  return t("{date} at {time}", { date: day, time });
};

// The top of the ticket: its number, how urgent, where it is, the subject,
// and who opened it when.
const TicketHeader = ({ ticket }: { ticket: ISupportTicketDetail }) => {
  const { translate, locale } = useLocale();
  return (
    <div className="flex flex-col gap-1.5 border-b border-line px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-mono text-small font-semibold text-ink-muted">{shortTicketId(ticket)}</code>
        <TicketPriorityChip priority={ticket.priority} />
        <TicketStatusChip status={ticket.status} />
      </div>
      {/* The conversation card is named by this heading. A subject can be
          Bangla, so it keeps the face's own line height. */}
      <h1 id="ticket-subject" className="text-[20px] leading-[1.3] font-semibold tracking-[-0.02em] wrap-break-word text-ink">
        {ticket.subject}
      </h1>
      <span className="text-small text-ink-muted">
        {translate("{category} · opened {when} by {name}", {
          category: translate(humanizeEnum(ticket.category)),
          when: openedAt(ticket.createdAt, translate, locale),
          name: ticket.platformUser?.name ?? translate("an unknown person"),
        })}
      </span>
    </div>
  );
};

export default TicketHeader;
