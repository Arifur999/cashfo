import { Paperclip } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDateTime } from "@/lib/date";
import { getInitials } from "@/lib/text";
import { cn } from "@/lib/utils";
import { isHttpUrl } from "@/lib/validators";
import type { ITicketMessage } from "@/types/ticket.types";

// A reply still on its way to the server is shown optimistically.
export type ThreadMessage = ITicketMessage & { isPending?: boolean };

interface TicketMessageBubbleProps {
  message: ThreadMessage;
  senderName: string;
}

// Staff replies sit on the right and the user's messages on the left -- the
// chat convention, read from the admin's side.
const TicketMessageBubble = ({ message, senderName }: TicketMessageBubbleProps) => {
  const fromStaff = message.senderType === "ADMIN";

  return (
    <div className={cn("flex items-end gap-3", fromStaff && "flex-row-reverse")}>
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className={cn("text-xs", fromStaff && "bg-primary/15 text-primary")}>{getInitials(senderName) || "?"}</AvatarFallback>
      </Avatar>
      <div className={cn("flex max-w-[80%] min-w-0 flex-col gap-1", fromStaff ? "items-end" : "items-start")}>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{senderName}</span> &middot;{" "}
          {message.isPending ? "Sending..." : <time dateTime={message.createdAt}>{formatDateTime(message.createdAt)}</time>}
        </p>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm break-words whitespace-pre-wrap text-foreground",
            fromStaff ? "rounded-br-sm bg-primary/10" : "rounded-bl-sm bg-muted",
            message.isPending && "opacity-60",
          )}
        >
          {message.message}
        </div>
        {isHttpUrl(message.attachmentUrl) && (
          <a
            href={message.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Paperclip className="size-3" aria-hidden="true" /> Attachment
          </a>
        )}
      </div>
    </div>
  );
};

export default TicketMessageBubble;
