"use client";

import { Paperclip, X } from "lucide-react";
import { useImperativeHandle, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import Textarea from "@/components/smartly/form/Textarea";
import type { SupportConversation, SupportTopic } from "@/lib/customer/api";
import { SCREENSHOT_ACCEPT, SCREENSHOT_MAX_BYTES, SUPPORT_TOPICS } from "@/lib/customer/supportDisplay";
import { sendSupportMessageAction } from "@/lib/customer/supportActions";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// What Help can ask of the card: an answer that didn't help, or a search
// that found nothing, leads straight to the message box.
export interface SupportMessageHandle {
  // Brings the box into view and focuses it; a still-empty message starts
  // with what it is about.
  start: (about?: string) => void;
}

interface SupportMessageCardProps {
  // How many conversations the customer has, opened from the link below;
  // null when they couldn't be read (the link still opens them, to try
  // again).
  conversations: number | null;
  onSent: (conversation: SupportConversation) => void;
  onOpenMessages: () => void;
  ref?: React.Ref<SupportMessageHandle>;
}

const prefersReducedMotion = () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Settings > Help's "Send us a message": a topic, the message and an
// optional screenshot. The answer comes back here and in the bell, which
// is always true; an email copy only goes out when the platform sends mail.
export function SupportMessageCard({ conversations, onSent, onOpenMessages, ref }: SupportMessageCardProps) {
  const { t, locale } = useLocale();
  const [topic, setTopic] = useState<SupportTopic>("TECHNICAL");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      start(about?: string) {
        if (about?.trim() && !message.trim()) setMessage(`${t("About: {question}", { question: about.trim() })}\n\n`);
        const box = messageRef.current;
        if (!box) return;
        box.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
        box.focus({ preventScroll: true });
      },
    }),
    [message, t],
  );

  function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!SCREENSHOT_ACCEPT.split(",").includes(file.type)) {
      toast.error(t("Only JPEG, PNG or WEBP screenshots are allowed"));
      return;
    }
    if (file.size > SCREENSHOT_MAX_BYTES) {
      toast.error(t("The screenshot is larger than 5 MB."));
      return;
    }
    setScreenshot(file);
  }

  function send(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim()) {
      toast.error(t("Write your message first."));
      return;
    }
    const form = new FormData();
    form.set("category", topic);
    form.set("message", message.trim());
    if (screenshot) form.set("screenshot", screenshot);
    startTransition(async () => {
      const result = await sendSupportMessageAction(form);
      if (!result.success || !result.data) {
        toast.error(result.message ?? t("Failed to send your message"));
        return;
      }
      toast.success(t("Message sent. We'll answer here and in the bell."));
      setMessage("");
      setScreenshot(null);
      onSent(result.data);
    });
  }

  return (
    <Card padding="none" className="p-4.5">
      <form onSubmit={send} aria-labelledby="help-message" className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="help-message" className="text-title font-semibold text-ink">
            {t("Send us a message")}
          </h2>
          <span className="text-[12.5px] text-ink-muted">{t("We answer here and in the bell.")}</span>
        </div>
        <NativeSelect aria-label={t("Topic")} value={topic} onChange={(event) => setTopic(event.target.value as SupportTopic)} className="h-10.5 font-normal pointer-coarse:h-11" frameClassName="w-full">
          {SUPPORT_TOPICS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.label)}
            </option>
          ))}
        </NativeSelect>
        <Textarea ref={messageRef} rows={4} aria-label={t("Your message")} value={message} maxLength={5000} onChange={(event) => setMessage(event.target.value)} placeholder={t("Tell us what happened, or what you'd like to do.")} className="resize-none px-3 leading-normal" />
        <input ref={fileRef} type="file" accept={SCREENSHOT_ACCEPT} onChange={pick} className="hidden" tabIndex={-1} aria-hidden="true" />
        {screenshot ? (
          <span className="flex min-h-9.5 items-center gap-2 rounded-md border border-line bg-strip pr-1 pl-3 text-small text-ink-2">
            <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{screenshot.name}</span>
            <button type="button" onClick={() => setScreenshot(null)} aria-label={t("Remove the screenshot")} className="flex size-7 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11">
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="flex h-9.5 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-dashed border-input bg-surface text-small font-semibold text-ink-soft hover:bg-surface-sunken pointer-coarse:h-11">
            <Paperclip className="size-3.5" aria-hidden="true" />
            {t("Attach a screenshot")}
          </button>
        )}
        <span className="text-caption leading-[1.45] text-warning">{t("Hide any passwords or card numbers before you attach a screenshot.")}</span>
        <Button type="submit" disabled={isPending} className="w-full pointer-coarse:h-11">
          {isPending && <Loader size={16} onDark />}
          {isPending ? t("Sending...") : t("Send message")}
        </Button>
        {/* Shown when they couldn't be read too: opening them is the way to try again. */}
        {conversations !== 0 && (
          <button type="button" onClick={onOpenMessages} className="self-center rounded-sm px-1 text-small font-semibold text-emerald hover:underline pointer-coarse:min-h-11">
            {conversations === null ? t("Your messages") : t("Your messages ({count})", { count: formatCount(conversations, locale) })}
          </button>
        )}
      </form>
    </Card>
  );
}
