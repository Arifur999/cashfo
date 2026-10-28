"use client";

import { ChevronRight, Paperclip } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/modules/Customer/Books/shared/Drawer";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import ErrorState from "@/components/smartly/ErrorState";
import Textarea from "@/components/smartly/form/Textarea";
import type { SupportConversation } from "@/lib/customer/api";
import { replySupportMessageAction } from "@/lib/customer/supportActions";
import { screenshotUrl, SUPPORT_STATUS } from "@/lib/customer/supportDisplay";
import { formatRecentDateTime } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const ANSWERED = { label: "Answered", tone: "info" } as const;

// Being looked at, with the last word from the team: answered.
const statusOf = (conversation: SupportConversation) => (conversation.status === "IN_PROGRESS" && conversation.messages.at(-1)?.senderType === "ADMIN" ? ANSWERED : SUPPORT_STATUS[conversation.status]);

// The newest message, shown whenever a conversation opens or a reply lands:
// the drawer's body scrolls to its end. The body itself, not the page, so a
// sheet still sliding in never moves the window.
const showNewest = (node: HTMLElement | null) => {
  for (let box = node?.parentElement; box; box = box.parentElement) {
    const { overflowY } = getComputedStyle(box);
    if (overflowY === "auto" || overflowY === "scroll") {
      box.scrollTop = box.scrollHeight;
      return;
    }
  }
};

interface MessagesDrawerProps {
  open: boolean;
  // null when they couldn't be read: the drawer says so, with Try again.
  conversations: SupportConversation[] | null;
  // They are being read again.
  reading?: boolean;
  onRetry: () => void;
  // The conversation shown; null lists them all.
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
  onUpdated: (conversation: SupportConversation) => void;
}

// The customer's messages to support and the answers, newest first, and
// one conversation with a box to answer in, kept at the bottom.
export function MessagesDrawer({ open, conversations, reading = false, onRetry, selectedId, onSelect, onClose, onUpdated }: MessagesDrawerProps) {
  const { t, fmt } = useLocale();
  const [reply, setReply] = useState("");
  const [isPending, startTransition] = useTransition();
  const selected = conversations?.find((conversation) => conversation.id === selectedId) ?? null;
  const closed = selected?.status === "CLOSED";

  // A reply belongs to its conversation: opening another starts afresh.
  const [prevSelectedId, setPrevSelectedId] = useState(selectedId);
  if (selectedId !== prevSelectedId) {
    setPrevSelectedId(selectedId);
    setReply("");
  }

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

  // The answer box sits in the footer, so it stays in reach however long
  // the conversation is.
  const footer = selected ? (
    <div className="flex w-full flex-col gap-3">
      {closed ? (
        <p className="rounded-md border border-line bg-strip px-4 py-3 text-small text-ink-2">{t("This conversation is closed. Send a new message instead.")}</p>
      ) : (
        <Textarea rows={3} aria-label={t("Your reply")} value={reply} maxLength={5000} onChange={(event) => setReply(event.target.value)} placeholder={t("Write a reply")} className="resize-none" />
      )}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => onSelect(null)} disabled={isPending} className="pointer-coarse:h-11">
          {t("All messages")}
        </Button>
        {!closed && (
          <Button type="submit" variant="action" disabled={isPending} className="px-5 pointer-coarse:h-11">
            {isPending && <Loader />}
            {isPending ? t("Sending...") : t("Send reply")}
          </Button>
        )}
      </div>
    </div>
  ) : (
    <Button type="button" variant="secondary" onClick={onClose} className="pointer-coarse:h-11">
      {t("Close")}
    </Button>
  );

  const body = () => {
    if (conversations === null) {
      return reading ? (
        <div className="flex justify-center py-10">
          <Loader size={24} label="Loading..." />
        </div>
      ) : (
        <ErrorState bordered={false} title={t("Couldn't load your messages")} onRetry={onRetry} />
      );
    }
    if (!selected) {
      if (conversations.length === 0) return <p className="py-6 text-center text-small text-ink-muted">{t("You haven't written to us yet.")}</p>;
      return (
        <ul className="-mx-2 flex flex-col">
          {conversations.map((conversation) => {
            const status = statusOf(conversation);
            const count = conversation.messages.length;
            return (
              <li key={conversation.id}>
                <button type="button" onClick={() => onSelect(conversation.id)} className="flex min-h-14 w-full items-center gap-3 rounded-md px-2 py-3 text-left hover:bg-hover focus-visible:-outline-offset-2">
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-body font-semibold text-ink">{conversation.subject}</span>
                    <span className="flex flex-wrap items-center gap-2 text-caption text-ink-muted">
                      <Chip tone={status.tone} size="sm">
                        {t(status.label)}
                      </Chip>
                      {formatRecentDateTime(conversation.updatedAt, { t, locale: fmt })} · {t(count === 1 ? "{count} message" : "{count} messages", { count: formatCount(count, fmt) })}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      );
    }
    const status = statusOf(selected);
    return (
      <>
        <Chip tone={status.tone} size="sm" className="self-start">
          {t(status.label)}
        </Chip>
        <ol className="flex flex-col gap-4">
          {selected.messages.map((message, index) => {
            const mine = message.senderType === "USER";
            return (
              <li key={message.id} ref={index === selected.messages.length - 1 ? showNewest : undefined} className={cn("flex max-w-[86%] flex-col gap-1", mine ? "items-end self-end" : "items-start self-start")}>
                <span className="text-caption text-ink-muted">
                  <b className="font-semibold text-ink">{mine ? t("You") : t("Smartly support")}</b> · {formatRecentDateTime(message.createdAt, { t, locale: fmt })}
                </span>
                <div className={cn("rounded-lg border px-4 py-3 text-body leading-relaxed wrap-break-word whitespace-pre-wrap text-ink", mine ? "border-mint-200 bg-mint-50" : "border-line bg-surface")}>{message.message}</div>
                {message.attachmentId && (
                  <a href={screenshotUrl(message.attachmentId)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5 text-small text-ink-2 hover:text-ink pointer-coarse:min-h-11">
                    <Paperclip className="size-3.5" aria-hidden="true" />
                    {t("Screenshot")}
                    <span className="sr-only">({t("opens in a new tab")})</span>
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      </>
    );
  };

  return (
    <Drawer open={open} title={selected ? selected.subject : t("Your messages")} busy={isPending} onClose={onClose} onSubmit={submit} footer={footer}>
      {body()}
    </Drawer>
  );
}
