"use client";

import { useMemo, useOptimistic } from "react";
import BackLink from "@/components/shared/BackLink";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { IAdminOption, ISupportTicketDetail, ITicketMessage } from "@/types/ticket.types";
import TicketControls from "./TicketControls";
import TicketConversation from "./TicketConversation";
import TicketHeader from "./TicketHeader";
import type { ThreadMessage } from "./TicketMessageBubble";
import TicketNotesCard from "./TicketNotesCard";
import TicketRequesterCard from "./TicketRequesterCard";
import { useTicketControls } from "./useTicketControls";

const appendMessage = (messages: ThreadMessage[], pending: ThreadMessage) => [...messages, pending];

interface TicketDetailLayoutProps {
  ticket: ISupportTicketDetail;
  admins: IAdminOption[];
  currentAdminId: string | null;
  canManage: boolean;
  // The queue this ticket was opened from, with its tab, filters and page.
  backHref: string;
}

// The board's ticket page: the conversation card on the left; the
// settings, the person and the notes for admins on the right. On a phone
// the settings and the person come first, so the status and the assignee
// aren't below the whole thread.
const TicketDetailLayout = ({ ticket, admins, currentAdminId, canManage, backHref }: TicketDetailLayoutProps) => {
  const { translate } = useLocale();
  // Every card renders the optimistic view, so a status or assignee change
  // shows everywhere on the page at once.
  const controls = useTicketControls(ticket);
  const view = controls.ticket;
  // A sent reply or note shows at once; the refetched ticket replaces it
  // when the request settles.
  const [messages, addPendingMessage] = useOptimistic<ThreadMessage[], ThreadMessage>(ticket.messages, appendMessage);
  const thread = useMemo(() => messages.filter((message) => !message.isInternal), [messages]);
  const notes = useMemo(() => messages.filter((message) => message.isInternal), [messages]);
  const adminNames = useMemo(() => new Map(admins.map((admin) => [admin.id, admin.name])), [admins]);

  const senderName = (message: ITicketMessage) => {
    if (message.senderType === "USER") return ticket.platformUser?.name ?? translate("User");
    return adminNames.get(message.senderId) ?? translate(message.senderId === currentAdminId ? "You" : "Support team");
  };

  return (
    <div className="flex flex-col gap-4.5">
      <BackLink href={backHref} className="gap-1.5 text-[13.5px] leading-[normal]">
        <T>All tickets</T>
      </BackLink>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="ticket-subject" className="flex flex-col overflow-hidden rounded-card border border-line-card bg-surface shadow-card">
          <TicketHeader ticket={view} />
          <TicketConversation
            ticket={view}
            messages={thread}
            senderName={senderName}
            currentAdminId={currentAdminId}
            canReply={canManage}
            onSending={addPendingMessage}
          />
        </section>
        <aside className="order-first flex flex-col gap-3.5 lg:order-0">
          {canManage && <TicketControls controls={controls} admins={admins} currentAdminId={currentAdminId} />}
          <TicketRequesterCard ticket={view} />
          <TicketNotesCard notes={notes} authorName={senderName} />
        </aside>
      </div>
    </div>
  );
};

export default TicketDetailLayout;
