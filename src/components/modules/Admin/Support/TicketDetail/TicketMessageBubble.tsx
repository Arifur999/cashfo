import { Paperclip } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/text";
import { cn } from "@/lib/utils";
import { isHttpUrl } from "@/lib/validators";
import type { ITicketMessage } from "@/types/ticket.types";
import T from "@/components/shared/T";
import RelativeTime from "@/components/shared/RelativeTime";

// A reply still on its way to the server is shown optimistically.
export type ThreadMessage = ITicketMessage & { isPending?: boolean };

interface TicketMessageBubbleProps {
  message: ThreadMessage;
  senderName: string;
}

// The design's thread: the user on the left in white, the admin on the
// right in mint, each with initials, a name and the time.
const TicketMessageBubble = ({ message, senderName }: TicketMessageBubbleProps) => {
  const fromStaff = message.senderType === "ADMIN";

  return (
    <div className={cn("flex gap-3", fromStaff && "flex-row-reverse")}>
      <Avatar className="size-8.5 shrink-0">
        <AvatarFallback className={cn("text-caption font-bold", fromStaff ? "bg-info-soft text-info" : "bg-mint-50 text-emerald")}>{getInitials(senderName) || "?"}</AvatarFallback>
      </Avatar>
      <div className={cn("flex max-w-[76%] min-w-0 flex-col gap-1", fromStaff ? "items-end" : "items-start")}>
        <span className="text-caption text-ink-muted">
          <b className="font-semibold text-ink">{senderName}</b> · {message.isPending ? (
            <T>Sending...</T>
          ) : (
            <time dateTime={message.createdAt}>
              <RelativeTime value={message.createdAt} />
            </time>
          )}
        </span>
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-body leading-relaxed wrap-break-word whitespace-pre-wrap text-ink",
            fromStaff ? "border-mint-200 bg-mint-50" : "border-line bg-surface",
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
            className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-small text-ink-2 hover:text-ink"
          >
            <Paperclip className="size-3.5" aria-hidden="true" /> <T>Attachment</T>
          </a>
        )}
      </div>
    </div>
  );
};

export default TicketMessageBubble;
