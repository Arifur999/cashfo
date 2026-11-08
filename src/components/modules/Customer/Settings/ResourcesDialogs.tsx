"use client";

import { Star } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import { OPEN_SOURCE_PACKAGES } from "@/lib/customer/licences";
import { sendSupportMessageAction } from "@/lib/customer/supportActions";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PopupDialog } from "../Shared/PopupDialog";

const STARS = [1, 2, 3, 4, 5] as const;
const STAR_WORD: Record<(typeof STARS)[number], string> = { 1: "Poor", 2: "Could be better", 3: "Good", 4: "Very good", 5: "Excellent" };
const COMMENT_MAX = 1000;

// The message the support team gets: the stars, then the person's words.
export const ratingMessage = (stars: number, comment: string) => `App rating: ${stars} of 5 stars${comment.trim() ? `\n\n${comment.trim()}` : ""}`;

// About Smartly › Rate us: one to five stars and a line on why, sent to
// the support team as a message (Help › My messages shows it and any reply).
export function RateUsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, fmt } = useLocale();
  const [stars, setStars] = useState<(typeof STARS)[number] | null>(null);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const close = () => {
    if (pending) return;
    setStars(null);
    setComment("");
    onClose();
  };
  const submit = () => {
    if (!stars) return;
    const form = new FormData();
    form.set("category", "OTHER");
    form.set("message", ratingMessage(stars, comment));
    startTransition(async () => {
      const result = await sendSupportMessageAction(form);
      if (!result.success) {
        toast.error(t(result.message ?? "Failed to send your message"));
        return;
      }
      toast.success(t("Thank you. Your rating reached our team."));
      setStars(null);
      setComment("");
      onClose();
    });
  };

  return (
    <PopupDialog
      open={open}
      onClose={close}
      busy={pending}
      width={440}
      title={t("Rate Smartly")}
      sub={t("How is Smartly working for you? Our team reads every rating.")}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" className="h-9.5 text-[13.5px]" disabled={pending} onClick={close}>
            {t("Cancel")}
          </Button>
          <Button type="submit" size="sm" className="h-9.5 text-[13.5px]" disabled={!stars || pending}>
            {t(pending ? "Sending..." : "Send rating")}
          </Button>
        </>
      }
    >
      <fieldset className="flex flex-col items-center gap-2">
        <legend className="sr-only">{t("Your rating")}</legend>
        <div className="flex gap-1.5">
          {STARS.map((value) => {
            const lit = stars !== null && value <= stars;
            return (
              <label key={value} className="cursor-pointer rounded-lg p-1 has-focus-visible:outline-2 has-focus-visible:outline-primary">
                <input type="radio" name="rating" value={value} checked={stars === value} onChange={() => setStars(value)} className="sr-only" />
                <span className="sr-only">{t("{count} of 5 stars", { count: formatCount(value, fmt) })}</span>
                <Star className={cn("size-8", lit ? "fill-current text-warning" : "text-line-strong")} aria-hidden="true" />
              </label>
            );
          })}
        </div>
        <span className="h-5 text-small font-semibold text-ink-2" aria-live="polite">
          {stars ? t(STAR_WORD[stars]) : ""}
        </span>
      </fieldset>
      <label className="flex flex-col gap-1.5">
        <span className="text-small font-medium text-ink">{t("Anything to add? (optional)")}</span>
        <textarea value={comment} maxLength={COMMENT_MAX} rows={3} onChange={(event) => setComment(event.target.value)} placeholder={t("What do you like, and what should we fix?")} className="resize-none rounded-[10px] border border-line bg-surface px-3 py-2.5 text-body text-ink placeholder:text-ink-faint focus-visible:border-primary focus-visible:outline-none" />
      </label>
    </PopupDialog>
  );
}

// About Smartly › Open-source licences: the open-source packages the app
// is built on, each with its licence.
export function LicencesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, fmt } = useLocale();
  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      width={460}
      title={t("Open-source licences")}
      sub={t("Smartly is built with {count} open-source packages. Thank you to everyone who makes them.", { count: formatCount(OPEN_SOURCE_PACKAGES.length, fmt) })}
      bodyClassName="p-0"
      footer={
        <Button type="button" variant="secondary" size="sm" className="h-9.5 text-[13.5px]" onClick={onClose}>
          {t("Close")}
        </Button>
      }
    >
      <ul className="max-h-90 overflow-y-auto">
        {OPEN_SOURCE_PACKAGES.map((one) => (
          <li key={one.name} className="flex items-center justify-between gap-3 border-t border-divider px-6 py-2.5 first:border-t-0">
            <a href={`https://www.npmjs.com/package/${one.name}`} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-body font-medium text-ink hover:text-emerald hover:underline">
              {one.name}
              <span className="sr-only"> ({t("opens in a new tab")})</span>
            </a>
            <span className="shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-[11.5px] font-semibold text-ink-soft">{one.licence}</span>
          </li>
        ))}
      </ul>
    </PopupDialog>
  );
}
