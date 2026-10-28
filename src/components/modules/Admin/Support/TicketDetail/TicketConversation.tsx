"use client";

import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { ISupportTicketDetail, ITicketMessage } from "@/types/ticket.types";
import TicketMessageBubble, { type ThreadMessage } from "./TicketMessageBubble";
import TicketReplyForm from "./TicketReplyForm";

interface TicketConversationProps {
  ticket: ISupportTicketDetail;
  // The messages the customer sees, oldest first (notes for admins sit
  // beside the thread instead).
  messages: ThreadMessage[];
  senderName: (message: ITicketMessage) => string;
  currentAdminId: string | null;
  canReply: boolean;
  onSending: (message: ThreadMessage) => void;
}

// The thread on the strip ground, and the reply box under it.
const TicketConversation = ({ ticket, messages, senderName, currentAdminId, canReply, onSending }: TicketConversationProps) => {
  const { translate } = useLocale();
  const requesterName = ticket.platformUser?.name ?? translate("the user");

  return (
    <>
      <div className="flex flex-col gap-3.5 bg-strip px-5 py-4.5">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-small text-ink-muted">
            <T>No messages yet.</T>
          </p>
        ) : (
          <ol className="flex flex-col gap-3.5" aria-label={translate("Messages")}>
            {messages.map((message) => (
              <li key={message.id}>
                <TicketMessageBubble message={message} senderName={senderName(message)} />
              </li>
            ))}
          </ol>
        )}
      </div>
      {canReply && <TicketReplyForm ticket={ticket} requesterName={requesterName.split(" ")[0]} currentAdminId={currentAdminId} onSending={onSending} />}
    </>
  );
};

export default TicketConversation;
