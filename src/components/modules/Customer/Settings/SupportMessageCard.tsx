"use client";

import { Paperclip, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import Textarea from "@/components/smartly/form/Textarea";
import type { SupportConversation, SupportTopic } from "@/lib/customer/api";
import { SCREENSHOT_ACCEPT, SCREENSHOT_MAX_BYTES, SUPPORT_TOPICS } from "@/lib/customer/supportDisplay";
import { sendSupportMessageAction } from "@/lib/customer/supportActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface SupportMessageCardProps {
  email: string;
  // The customer's earlier conversations, opened from the link below.
  conversations: number;
  onSent: (conversation: SupportConversation) => void;
  onOpenMessages: () => void;
}

// Settings > Help's "Send us a message": a topic, the message and an
// optional screenshot.
export function SupportMessageCard({ email, conversations, onSent, onOpenMessages }: SupportMessageCardProps) {
  const { t } = useLocale();
  const [topic, setTopic] = useState<SupportTopic>("TECHNICAL");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

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
      toast.success(t("Message sent. We'll answer by email and in the app."));
      setMessage("");
      setScreenshot(null);
      onSent(result.data);
    });
  }

  return (
    <Card padding="none" className="p-5">
      <form onSubmit={send} aria-labelledby="help-message" className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="help-message" className="text-title font-semibold text-ink">
            {t("Send us a message")}
          </h2>
          <span className="text-small text-ink-muted">{t("We reply by email to {email}", { email })}</span>
        </div>
        <NativeSelect aria-label={t("Topic")} value={topic} onChange={(event) => setTopic(event.target.value as SupportTopic)} className="h-10.5 font-normal" frameClassName="w-full">
          {SUPPORT_TOPICS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.label)}
            </option>
          ))}
        </NativeSelect>
        <Textarea rows={4} aria-label={t("Your message")} value={message} maxLength={5000} onChange={(event) => setMessage(event.target.value)} placeholder={t("Tell us what happened, or what you'd like to do.")} className="resize-none px-3 leading-normal" />
        <input ref={fileRef} type="file" accept={SCREENSHOT_ACCEPT} onChange={pick} className="hidden" tabIndex={-1} aria-hidden="true" />
        {screenshot ? (
          <span className="flex h-9.5 items-center gap-2 rounded-md border border-line bg-cream px-3 text-small text-ink-2">
            <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{screenshot.name}</span>
            <button type="button" onClick={() => setScreenshot(null)} aria-label={t("Remove the screenshot")} className="flex size-6 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken hover:text-ink">
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="flex h-9.5 items-center justify-center gap-2 rounded-md border-[1.5px] border-dashed border-line-strong bg-surface text-small font-semibold text-ink-2 hover:bg-cream">
            <Paperclip className="size-3.5" aria-hidden="true" />
            {t("Attach a screenshot")}
          </button>
        )}
        <span className="text-caption leading-[1.45] text-warning">{t("Hide any passwords or card numbers before you attach a screenshot.")}</span>
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? t("Sending...") : t("Send message")}
        </Button>
        {conversations > 0 && (
          <button type="button" onClick={onOpenMessages} className="self-center text-small font-semibold text-emerald hover:underline">
            {t("Your messages ({count})", { count: conversations })}
          </button>
        )}
      </form>
    </Card>
  );
}
