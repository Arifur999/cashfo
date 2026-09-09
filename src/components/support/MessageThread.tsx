import { cn } from "@/lib/utils";
import type { AdminOption, TicketMessageRow } from "@/lib/api";
import { t } from "@/lib/i18n/t";

interface MessageThreadProps {
  messages: TicketMessageRow[];
  userName: string;
  admins: AdminOption[];
}

export function MessageThread({ messages, userName, admins }: MessageThreadProps) {
  if (messages.length === 0) {
    return <p className="py-8 text-center text-sm text-neutral-400">{t("No messages yet.")}</p>;
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isAdmin = message.senderType === "ADMIN";
        const senderName = isAdmin ? (admins.find((a) => a.id === message.senderId)?.name ?? t("Admin")) : userName;

        return (
          <div key={message.id} className={cn("flex", isAdmin ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-3 text-sm",
                isAdmin ? "bg-green-100 text-green-900" : "bg-neutral-100 text-neutral-800",
              )}
            >
              <p className="mb-1 text-xs font-medium opacity-70">{senderName}</p>
              <p className="whitespace-pre-wrap">{message.message}</p>
              <p className="mt-1 text-[11px] opacity-60">{new Date(message.createdAt).toLocaleString()}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
