"use client";

import { ChevronRight, Paperclip } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/modules/Customer/Books/shared/Drawer";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import Textarea from "@/components/smartly/form/Textarea";
import type { SupportConversation } from "@/lib/customer/api";
import { replySupportMessageAction } from "@/lib/customer/supportActions";
import { screenshotUrl, SUPPORT_STATUS } from "@/lib/customer/supportDisplay";
import { formatRecentDateTime } from "@/lib/date";
import { plural } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const ANSWERED = { label: "Answered", tone: "info" } as const;

interface MessagesDrawerProps {
  open: boolean;
  conversations: SupportConversation[];
  // The conversation shown; null lists them all.
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
  onUpdated: (conversation: SupportConversation) => void;
}

// The customer's messages to support and the answers, newest first, and
// one conversation with a box to answer in.
export function MessagesDrawer({ open, conversations, selectedId, onSelect, onClose, onUpdated }: MessagesDrawerProps) {
  const { t } = useLocale();
  const [reply, setReply] = useState("");
  const [isPending, startTransition] = useTransition();
  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? null;
  const closed = selected?.status === "CLOSED";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || closed) return;
    if (!reply.trim()) {
      toast.error(t("Write your reply first."));
      return;
    }
    startTransition(async () => {
      const result = await replySupportMessageAction(selected.id, reply.trim());
      if (!result.success || !result.data) {
        toast.error(result.message ?? t("Failed to send your reply"));
        return;
      }
      setReply("");
      onUpdated(result.data);
    });
  }

  const footer = selected ? (
    <>
      <Button type="button" variant="secondary" onClick={() => onSelect(null)}>
        {t("All messages")}
      </Button>
      {!closed && (
        <Button type="submit" disabled={isPending}>
          {isPending ? t("Sending...") : t("Send reply")}
        </Button>
      )}
    </>
  ) : (
    <Button type="button" variant="secondary" onClick={onClose}>
      {t("Close")}
    </Button>
  );

  return (
    <Drawer open={open} title={selected ? selected.subject : t("Your messages")} busy={isPending} onClose={onClose} onSubmit={submit} footer={footer}>
      {!selected && conversations.length === 0 && <p className="text-small text-ink-muted">{t("You haven't written to us yet.")}</p>}
      {!selected && conversations.length > 0 && (
        <ul className="-mx-2 flex flex-col">
          {conversations.map((conversation) => {
            // Being looked at, with the last word from the team: answered.
            const answered = conversation.status === "IN_PROGRESS" && conversation.messages.at(-1)?.senderType === "ADMIN";
            const status = answered ? ANSWERED : SUPPORT_STATUS[conversation.status];
            return (
              <li key={conversation.id}>
                <button type="button" onClick={() => onSelect(conversation.id)} className="flex w-full items-center gap-3 rounded-md px-2 py-3 text-left hover:bg-hover">
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-body font-semibold text-ink">{conversation.subject}</span>
                    <span className="flex flex-wrap items-center gap-2 text-caption text-ink-muted">
                      <Chip tone={status.tone} size="sm">
                        {t(status.label)}
                      </Chip>
                      {formatRecentDateTime(conversation.updatedAt, { t })} · {plural(t, conversation.messages.length, "{count} message", "{count} messages")}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {selected && (
        <>
          <ol className="flex flex-col gap-4">
            {selected.messages.map((message) => {
              const mine = message.senderType === "USER";
              return (
                <li key={message.id} className={cn("flex max-w-[86%] flex-col gap-1", mine ? "items-end self-end" : "items-start self-start")}>
                  <span className="text-caption text-ink-muted">
                    <b className="font-semibold text-ink">{mine ? t("You") : t("Smartly support")}</b> · {formatRecentDateTime(message.createdAt, { t })}
                  </span>
                  <div className={cn("rounded-lg border px-4 py-3 text-body leading-relaxed wrap-break-word whitespace-pre-wrap text-ink", mine ? "border-mint-200 bg-mint-50" : "border-line bg-surface")}>{message.message}</div>
                  {message.attachmentId && (
                    <a href={screenshotUrl(message.attachmentId)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5 text-small text-ink-2 hover:text-ink">
                      <Paperclip className="size-3.5" aria-hidden="true" />
                      {t("Screenshot")}
                    </a>
                  )}
                </li>
              );
            })}
          </ol>
          {closed ? (
            <p className="rounded-md bg-surface-sunken px-4 py-3 text-small text-ink-2">{t("This conversation is closed. Send a new message instead.")}</p>
          ) : (
            <Textarea rows={3} aria-label={t("Your reply")} value={reply} maxLength={5000} onChange={(event) => setReply(event.target.value)} placeholder={t("Write a reply")} className="resize-none" />
          )}
        </>
      )}
    </Drawer>
  );
}
