"use client";

import { Check, Paperclip, Send, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { useImperativeHandle, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import type { SupportConversation, SupportTopic } from "@/lib/customer/api";
import { SCREENSHOT_ACCEPT, SCREENSHOT_MAX_BYTES, SUPPORT_TOPICS } from "@/lib/customer/supportDisplay";
import { sendSupportMessageAction } from "@/lib/customer/supportActions";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CARD } from "./boardUi";

// What Help can ask of the card: an answer that didn't help, or a search
// that found nothing, leads straight to the message box.
export interface SupportMessageHandle {
  // Brings the box into view and focuses it; a still-empty subject starts
  // with what it is about.
  start: (about?: string) => void;
}

interface SupportMessageCardProps {
  // The customer's email: a copy and the replies go there.
  email: string;
  // The company's usual first-reply time, in hours (0 when not set).
  replyHours: number;
  onSent: (conversation: SupportConversation) => void;
  // "View in My messages": the conversation just sent.
  onView: (id: string) => void;
  ref?: React.Ref<SupportMessageHandle>;
}

const SUBJECT_MAX = 120;
const MESSAGE_MAX = 2000;
const MESSAGE_MIN = 10;
const FIELD = "w-full rounded-[10px] border bg-surface px-3 text-body text-ink outline-none placeholder:text-ink-faint focus-visible:border-focus-ring focus-visible:focus-halo";

const prefersReducedMotion = () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Settings > Help's "Send a message to our team" (SettingsHelp board): what
// it is about, how urgent, a subject, the message and a screenshot. Once
// sent it gives the ticket number, with the way to the conversation.
export function SupportMessageCard({ email, replyHours, onSent, onView, ref }: SupportMessageCardProps) {
  const { t, fmt } = useLocale();
  const [topic, setTopic] = useState<SupportTopic>("TECHNICAL");
  const [urgent, setUrgent] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ subject?: string; message?: string }>({});
  const [sent, setSent] = useState<SupportConversation | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  function reset() {
    setTopic("TECHNICAL");
    setUrgent(false);
    setSubject("");
    setMessage("");
    setScreenshot(null);
    setErrors({});
  }

  useImperativeHandle(
    ref,
    () => ({
      start(about?: string) {
        setSent(null);
        if (about?.trim() && !subject.trim()) setSubject(t("About: {question}", { question: about.trim() }).slice(0, SUBJECT_MAX));
        window.setTimeout(() => {
          const box = about?.trim() ? messageRef.current : subjectRef.current;
          if (!box) return;
          box.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
          box.focus({ preventScroll: true });
        }, 0);
      },
    }),
    [subject, t],
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
    const next: typeof errors = {};
    if (!subject.trim()) next.subject = "Write a short subject.";
    if (!message.trim()) next.message = "Tell us what happened or what you need.";
    else if (message.trim().length < MESSAGE_MIN) next.message = "Please write a little more, at least 10 letters.";
    setErrors(next);
    if (next.subject || next.message) return;
    const form = new FormData();
    form.set("category", topic);
    form.set("subject", subject.trim());
    form.set("message", message.trim());
    if (urgent) form.set("priority", "URGENT");
    if (screenshot) form.set("screenshot", screenshot);
    startTransition(async () => {
      const result = await sendSupportMessageAction(form);
      if (!result.success || !result.data) {
        toast.error(result.message ?? t("Failed to send your message"));
        return;
      }
      toast.success(t("Message sent"));
      reset();
      setSent(result.data);
      onSent(result.data);
    });
  }

  const number = sent?.number ? `#${toLocaleDigits(String(sent.number), fmt)}` : null;

  return (
    <section aria-labelledby="hp-ct" className={cn(CARD, "overflow-hidden")}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5.5 pt-4.5 pb-3">
        <span className="flex min-w-0 flex-col gap-0.5">
          <h2 id="hp-ct" className="text-[16px] font-semibold text-ink">
            {t("Send a message to our team")}
          </h2>
          <span className="text-[13px] text-ink-muted">{t("It goes straight to the Super Admin. A real person reads every message.")}</span>
        </span>
        <span className="flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-soft-wash px-2.5 text-[12px] font-semibold whitespace-nowrap text-emerald">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          {t("To: Super Admin")}
        </span>
      </div>

      {sent ? (
        <div role="status" className="flex flex-col items-center gap-2.5 border-t border-sunken px-5.5 pt-6.5 pb-7.5 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-success-soft text-tint-green-ink">
            <Check className="size-6.5" strokeWidth={2.5} aria-hidden="true" />
          </span>
          <b className="text-[18px] font-semibold text-ink">{t("Message sent")}</b>
          {number && (
            <span className="text-body text-ink-2">
              {t("Your ticket number is")} <code className="rounded-[6px] bg-soft-wash px-2 py-0.5 font-mono text-body font-bold text-emerald">{number}</code>
            </span>
          )}
          <span className="max-w-115 text-[13px] leading-[1.5] text-ink-muted">
            {replyHours > 0
              ? t("We usually answer in about {count} hours during office hours. Replies show up in My messages and by email to {email}.", { email, count: formatCount(replyHours, fmt) })
              : t("Replies show up in My messages and by email to {email}.", { email })}
          </span>
          <span className="mt-1.5 flex flex-wrap justify-center gap-2.5">
            <Button variant="secondary" className="h-9.5 px-4 text-[13.5px]" onClick={() => setSent(null)}>
              {t("Write another")}
            </Button>
            <Button className="h-9.5 px-4 text-[13.5px]" onClick={() => onView(sent.id)}>
              {t("View in My messages")}
            </Button>
          </span>
        </div>
      ) : (
        <form onSubmit={send} noValidate aria-labelledby="hp-ct">
          <div className="grid gap-x-4.5 gap-y-4 px-5.5 pt-1.5 pb-4.5 @xl:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-[13.5px] font-medium text-ink">{t("What is it about?")}</span>
              <select value={topic} onChange={(event) => setTopic(event.target.value as SupportTopic)} className={cn(FIELD, "select-chevron h-11 cursor-pointer border-input pr-8")}>
                {SUPPORT_TOPICS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label)}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex min-w-0 flex-col gap-1.5">
              <span id="hp-pri" className="text-[13.5px] font-medium text-ink">
                {t("How urgent is it?")}
              </span>
              <div role="radiogroup" aria-labelledby="hp-pri" className="flex gap-0.5 self-start rounded-full bg-page p-[3px]">
                {[false, true].map((value) => (
                  <button
                    key={String(value)}
                    type="button"
                    role="radio"
                    aria-checked={urgent === value}
                    onClick={() => setUrgent(value)}
                    className={cn("flex h-9 items-center gap-1.5 rounded-full px-4 text-[13.5px] whitespace-nowrap", urgent === value ? "bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(18,32,29,0.10)]" : "font-medium text-ink-2 hover:text-ink")}
                  >
                    <span aria-hidden="true" className={cn("size-1.75 rounded-full", value ? "bg-expense-fill" : "bg-ink-faint")} />
                    {t(value ? "Urgent" : "Normal")}
                  </button>
                ))}
              </div>
              <span className="text-[12px] text-ink-muted">{t("Choose Urgent only if money looks wrong or you cannot sign in.")}</span>
            </div>
            <label className="flex flex-col gap-1.5 @xl:col-span-2">
              <span className="flex justify-between text-[13.5px] font-medium text-ink">
                {t("Subject")}
                <span className="text-[12px] font-normal text-ink-faint tabular-nums">{toLocaleDigits(`${subject.length}/${SUBJECT_MAX}`, fmt)}</span>
              </span>
              <input
                ref={subjectRef}
                type="text"
                maxLength={SUBJECT_MAX}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder={t("For example: My Cash balance is wrong")}
                aria-invalid={errors.subject ? true : undefined}
                className={cn(FIELD, "h-11", errors.subject ? "border-expense-fill" : "border-input")}
              />
              {errors.subject && (
                <span role="alert" className="text-[12.5px] text-loss-ink">
                  {t(errors.subject)}
                </span>
              )}
            </label>
            <label className="flex flex-col gap-1.5 @xl:col-span-2">
              <span className="flex justify-between text-[13.5px] font-medium text-ink">
                {t("Message")}
                <span className="text-[12px] font-normal text-ink-faint tabular-nums">{toLocaleDigits(`${message.length}/${MESSAGE_MAX}`, fmt)}</span>
              </span>
              <textarea
                ref={messageRef}
                rows={6}
                maxLength={MESSAGE_MAX}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={t("Tell us what happened, what you expected and the steps you took.")}
                aria-invalid={errors.message ? true : undefined}
                className={cn(FIELD, "min-h-32.5 resize-y py-2.75 leading-[1.55]", errors.message ? "border-expense-fill" : "border-input")}
              />
              {errors.message && (
                <span role="alert" className="text-[12.5px] text-loss-ink">
                  {t(errors.message)}
                </span>
              )}
            </label>
            <div className="flex flex-col gap-2 @xl:col-span-2">
              <div className="flex flex-wrap items-center gap-2">
                <input ref={fileRef} type="file" accept={SCREENSHOT_ACCEPT} onChange={pick} className="hidden" tabIndex={-1} aria-hidden="true" />
                <button type="button" onClick={() => fileRef.current?.click()} className="flex h-9.5 items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-input bg-surface px-4 text-[13px] font-semibold whitespace-nowrap text-ink-2 hover:bg-soft-hover">
                  <Paperclip className="size-3.5" aria-hidden="true" />
                  {t("Attach a screenshot")}
                </button>
                {screenshot && (
                  <span className="flex h-8 max-w-full items-center gap-1.5 rounded-[8px] border border-line bg-page pr-1 pl-2.5 text-[12.5px] text-ink-2">
                    <span className="min-w-0 truncate">{screenshot.name}</span>
                    <button type="button" onClick={() => setScreenshot(null)} aria-label={t("Remove the screenshot")} className="flex size-6 shrink-0 items-center justify-center rounded-[6px] text-ink-muted hover:bg-line hover:text-ink">
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </span>
                )}
                <span className="text-[12px] text-ink-faint">{t("One picture, up to 5 MB")}</span>
              </div>
              <span className="flex items-start gap-1.5 text-[12px] leading-[1.45] text-warning">
                <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                {t("Hide any passwords or card numbers before you attach a screenshot.")}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-soft-row px-5.5 py-3">
            <span className="min-w-0 truncate text-[12.5px] text-ink-muted">{t("We reply here in My messages and by email to {email}", { email })}</span>
            <span className="flex shrink-0 gap-2">
              <Button type="button" variant="secondary" className="h-10 px-3.5 text-body" onClick={reset} disabled={isPending}>
                {t("Clear")}
              </Button>
              <Button type="submit" disabled={isPending} className="h-10 gap-2 px-4.5 text-body">
                {isPending ? <Loader size={16} onDark /> : <Send className="size-4" aria-hidden="true" />}
                {isPending ? t("Sending...") : t("Send message")}
              </Button>
            </span>
          </div>
        </form>
      )}
    </section>
  );
}
