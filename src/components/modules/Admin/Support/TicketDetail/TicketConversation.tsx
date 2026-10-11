"use client";

import { useMemo, useOptimistic } from "react";
import SectionCard from "@/components/shared/SectionCard";
import { pluralize } from "@/lib/text";
import type { IAdminOption, ISupportTicketDetail } from "@/types/ticket.types";
import TicketMessageBubble, { type ThreadMessage } from "./TicketMessageBubble";
import TicketReplyForm from "./TicketReplyForm";

const appendMessage = (messages: ThreadMessage[], pending: ThreadMessage) => [...messages, pending];

interface TicketConversationProps {
  ticket: ISupportTicketDetail;
  admins: IAdminOption[];
  currentAdminId: string | null;
  canReply: boolean;
}

const TicketConversation = ({ ticket, admins, currentAdminId, canReply }: TicketConversationProps) => {
  // A sent reply shows at once; the refetched thread replaces it when the
  // request settles.
  const [messages, addPendingMessage] = useOptimistic<ThreadMessage[], ThreadMessage>(ticket.messages, appendMessage);
  const adminNames = useMemo(() => new Map(admins.map((admin) => [admin.id, admin.name])), [admins]);

  const senderName = (message: ThreadMessage) => {
    if (message.senderType === "USER") return ticket.platformUser?.name ?? "User";
    if (message.senderId === currentAdminId) return "You";
    return adminNames.get(message.senderId) ?? "Support team";
  };

  return (
    <SectionCard title="Conversation" action={<span className="text-xs text-muted-foreground">{pluralize(messages.length, "message")}</span>}>
      <div className="space-y-6">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          <ol className="space-y-5" aria-label="Messages">
            {messages.map((message) => (
              <li key={message.id}>
                <TicketMessageBubble message={message} senderName={senderName(message)} />
              </li>
            ))}
          </ol>
        )}
        {canReply && (
          <div className="border-t pt-5">
            <TicketReplyForm ticketId={ticket.id} currentAdminId={currentAdminId} onSending={addPendingMessage} />
          </div>
        )}
      </div>
    </SectionCard>
  );
};

export default TicketConversation;
