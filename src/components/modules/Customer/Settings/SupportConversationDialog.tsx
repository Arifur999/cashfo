"use client";

import { Check, CircleCheck, Clock, Paperclip, Send, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { SupportConversation } from "@/lib/customer/api";
import { replySupportMessageAction, solveSupportMessageAction } from "@/lib/customer/supportActions";
import { screenshotUrl, supportStatusOf, topicName, waitsOnYou } from "@/lib/customer/supportDisplay";
import { formatDate } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getInitials } from "@/lib/text";
import { cn } from "@/lib/utils";

const REPLY_MAX = 2000;

// The newest message, shown whenever a conversation opens or a reply lands:
// the thread scrolls to its end.
const showNewest = (node: HTMLElement | null) => {
  const box = node?.closest("[data-thread]");
  if (box) box.scrollTop = box.scrollHeight;
};

interface SupportConversationDialogProps {
  conversation: SupportConversation | null;
  // The customer's own name, written over their lines.
  name: string;
  // The company's initial, on the team's avatar.
  companyInitial: string;
  onClose: () => void;
  onUpdated: (conversation: SupportConversation) => void;
}

// One conversation with the team (HelpConversation board): its number,
// state, subject and topic; the thread on a grey ground, a band when the
// team waits on you or it is solved, and the answer box with Mark as solved.
export function SupportConversationDialog({ conversation, name, companyInitial, onClose, onUpdated }: SupportConversationDialogProps) {
  const { t, fmt } = useLocale();
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSolving, startSolving] = useTransition();
  const busy = isPending || isSolving;

  // A reply belongs to its conversation: opening another starts afresh.
  const [prevId, setPrevId] = useState(conversation?.id ?? null);
  if ((conversation?.id ?? null) !== prevId) {
    setPrevId(conversation?.id ?? null);
    setReply("");
    setError(null);
  }

  const closed = conversation?.status === "CLOSED";
  const solved = conversation?.status === "RESOLVED" || closed;
  const status = conversation ? supportStatusOf(conversation) : null;
  const when = (iso: string) => formatDate(iso, "d MMMM yyyy, h:mm a", "", fmt);

  function send() {
    if (!conversation || closed || busy) return;
    if (!reply.trim()) {
      setError(t("Write your reply first."));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await replySupportMessageAction(conversation.id, reply.trim());
      if (!result.success || !result.data) {
        toast.error(result.message ?? t("Failed to send your reply"));
        return;
      }
      setReply("");
      onUpdated(result.data);
    });
  }

  function solve() {
    if (!conversation || busy) return;
    startSolving(async () => {
      const result = await solveSupportMessageAction(conversation.id);
      if (!result.success || !result.data) {
        toast.error(result.message ?? t("Couldn't mark it as solved"));
        return;
      }
      toast.success(t("Marked as solved"));
      onUpdated(result.data);
    });
  }

  return (
    <Dialog open={conversation !== null} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent showCloseButton={false} className="flex max-h-[calc(100dvh-48px)] w-170 max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 text-ink shadow-[0_24px_60px_rgba(18,32,29,0.28)] ring-0 sm:max-w-[calc(100vw-32px)]">
        {conversation && status && (
          <>
            <div className="flex shrink-0 items-start gap-3 border-b border-head-rule pt-4 pr-4 pb-3.5 pl-6">
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex flex-wrap items-center gap-2">
                  {conversation.number !== undefined && <code className="font-mono text-[13px] font-semibold text-ink-muted">#{toLocaleDigits(String(conversation.number), fmt)}</code>}
                  <span className={cn("rounded-full px-2.25 py-0.5 text-[12px] font-semibold whitespace-nowrap", status.className)}>{t(status.label)}</span>
                  {conversation.priority === "URGENT" && <span className="rounded-full bg-loss-wash px-2.25 py-0.5 text-[12px] font-semibold text-loss-ink">{t("Urgent")}</span>}
                </span>
                <DialogTitle className="text-[18px] leading-[1.35] font-bold wrap-break-word text-ink">{conversation.subject}</DialogTitle>
                <DialogDescription className="text-[12.5px] text-ink-muted">
                  {t(topicName(conversation.category))} · {t("Opened {date}", { date: formatDate(conversation.createdAt, "d MMMM yyyy", "", fmt) })}
                </DialogDescription>
              </span>
              <button type="button" onClick={onClose} disabled={busy} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-page text-ink-2 hover:bg-line disabled:opacity-50">
                <X className="size-4.5" aria-hidden="true" />
              </button>
            </div>

            <ol data-thread="" className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto bg-soft-row px-6 py-4.5">
              {conversation.messages.map((message, index) => {
                const mine = message.senderType === "USER";
                return (
                  <li key={message.id} ref={index === conversation.messages.length - 1 ? showNewest : undefined} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
                    <span aria-hidden="true" className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold", mine ? "bg-soft-wash text-emerald" : "bg-primary text-white")}>
                      {mine ? getInitials(name) : companyInitial}
                    </span>
                    <div className={cn("flex max-w-[80%] min-w-0 flex-col gap-1", mine ? "items-end" : "items-start")}>
                      <span className="text-[12px] text-ink-muted">
                        <b className="font-semibold text-ink">{mine ? t("You") : (message.senderName ?? t("Smartly support"))}</b> · {mine ? name : t("Smartly support")} · {when(message.createdAt)}
                      </span>
                      <div className={cn("rounded-[14px] border px-3.5 py-2.75 text-body leading-[1.55] [overflow-wrap:anywhere] whitespace-pre-wrap text-ink", mine ? "border-mint-200 bg-soft-wash" : "border-line bg-surface")}>{message.message}</div>
                      {message.attachmentId && (
                        <a href={screenshotUrl(message.attachmentId)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-[8px] border border-line bg-surface px-2.5 py-1.5 text-[12.5px] text-ink-2 hover:text-ink">
                          <Paperclip className="size-3.5" aria-hidden="true" />
                          {t("Screenshot")}
                          <span className="sr-only">({t("opens in a new tab")})</span>
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {!solved && waitsOnYou(conversation) && (
              <div className="flex shrink-0 items-center gap-2 bg-warning-soft px-6 py-2.5 text-[13px] font-medium text-due-ink">
                <Clock className="size-4" aria-hidden="true" />
                {t("We are waiting for your answer. Reply below.")}
              </div>
            )}
            {solved && (
              <div className="flex shrink-0 items-center gap-2 bg-success-soft px-6 py-2.5 text-[13px] font-medium text-tint-green-ink">
                <CircleCheck className="size-4" aria-hidden="true" />
                {t(closed ? "This conversation is closed. Send a new message instead." : "This is solved. Write again if you still need help.")}
              </div>
            )}

            {!closed && (
              <div className="flex shrink-0 flex-col gap-2 border-t border-line px-6 pt-3.5 pb-4.5">
                <textarea
                  rows={3}
                  maxLength={REPLY_MAX}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                      event.preventDefault();
                      send();
                    }
                  }}
                  placeholder={t(solved ? "Write here to open this again" : "Write your reply")}
                  aria-label={t("Your reply")}
                  aria-invalid={error ? true : undefined}
                  className={cn("resize-none rounded-[12px] border bg-surface px-3.25 py-2.75 text-body leading-[1.55] text-ink outline-none placeholder:text-ink-faint focus-visible:border-focus-ring focus-visible:focus-halo", error ? "border-expense-fill" : "border-input")}
                />
                {error && (
                  <span role="alert" className="text-[12.5px] text-loss-ink">
                    {error}
                  </span>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex-1 text-[12px] text-ink-faint">{t("Ctrl + Enter sends")}</span>
                  {!solved && (
                    <Button variant="secondary" onClick={solve} disabled={busy} className="h-9.5 gap-1.5 px-3.5 text-[13.5px] text-tint-green-ink">
                      {isSolving ? <Loader size={14} /> : <Check className="size-4" aria-hidden="true" />}
                      {t("Mark as solved")}
                    </Button>
                  )}
                  <Button onClick={send} disabled={busy} className="h-9.5 gap-1.75 px-4 text-[13.5px]">
                    {isPending ? <Loader size={14} onDark /> : <Send className="size-4" aria-hidden="true" />}
                    {isPending ? t("Sending...") : t("Send reply")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
