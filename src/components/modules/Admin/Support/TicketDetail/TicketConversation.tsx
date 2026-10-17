"use client";

import { useMemo, useOptimistic } from "react";
import type { IAdminOption, ISupportTicketDetail, TicketStatus } from "@/types/ticket.types";
import TicketMessageBubble, { type ThreadMessage } from "./TicketMessageBubble";
import TicketReplyForm from "./TicketReplyForm";

const appendMessage = (messages: ThreadMessage[], pending: ThreadMessage) => [...messages, pending];

interface TicketConversationProps {
  ticket: ISupportTicketDetail;
  admins: IAdminOption[];
  currentAdminId: string | null;
  canReply: boolean;
  onSetStatus?: (status: TicketStatus) => void;
}

// The thread on a cream ground, and the reply box under it.
const TicketConversation = ({ ticket, admins, currentAdminId, canReply, onSetStatus }: TicketConversationProps) => {
  // A sent reply shows at once; the refetched thread replaces it when the
  // request settles.
  const [messages, addPendingMessage] = useOptimistic<ThreadMessage[], ThreadMessage>(ticket.messages, appendMessage);
  const adminNames = useMemo(() => new Map(admins.map((admin) => [admin.id, admin.name])), [admins]);
  const requesterName = ticket.platformUser?.name ?? "the user";

  const senderName = (message: ThreadMessage) => {
    if (message.senderType === "USER") return ticket.platformUser?.name ?? "User";
    return adminNames.get(message.senderId) ?? (message.senderId === currentAdminId ? "You" : "Support team");
  };

  return (
    <>
      <div className="flex flex-col gap-4 bg-cream p-5">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-small text-ink-muted">No messages yet.</p>
        ) : (
          <ol className="flex flex-col gap-4" aria-label="Messages">
            {messages.map((message) => (
              <li key={message.id}>
                <TicketMessageBubble message={message} senderName={senderName(message)} />
              </li>
            ))}
          </ol>
        )}
      </div>
      {canReply && (
        <TicketReplyForm ticketId={ticket.id} requesterName={requesterName.split(" ")[0]} currentAdminId={currentAdminId} onSending={addPendingMessage} onSetStatus={onSetStatus} />
      )}
    </>
  );
};

export default TicketConversation;
