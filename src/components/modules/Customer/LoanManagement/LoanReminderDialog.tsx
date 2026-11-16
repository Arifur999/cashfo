"use client";

import { Copy, MessageCircle, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Button from "@/components/smartly/Button";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { reminderPhone } from "@/lib/customer/loanDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface LoanReminderDialogProps {
  open: boolean;
  onClose: () => void;
  name: string;
  phone: string | null;
  // What they owe you, more than nothing.
  owed: number;
  currency: string;
  today: string;
  // No number saved: Add phone opens Edit contact.
  onAddPhone: () => void;
}

type Language = "bn" | "en";

// The message in either language, whatever the app is shown in: the
// reader picks the one the person reads.
function reminderText(language: Language, name: string, owed: number, currency: string, today: string): string {
  if (language === "bn") {
    const amount = `${formatCurrency(owed, currency, "bn").replace(/^৳\s*/, "")} টাকা`;
    return `আসসালামু আলাইকুম ${name}। একটু মনে করিয়ে দিচ্ছি, ${formatDate(today, "d MMMM yyyy", "bn")} পর্যন্ত আপনার কাছে আমার পাওনা ${amount}। সুবিধামতো সময়ে দিয়ে দিলে খুশি হব। ধন্যবাদ।`;
  }
  return `Assalamu alaikum ${name}. A gentle reminder: as of ${formatDate(today, "d MMM yyyy", "en")}, ${formatCurrency(owed, currency, "en")} is still due to me. Please pay it when you can. Thank you.`;
}

// Send a reminder (LoanLedger board): what is still owed, the message in
// Bangla or English to change before sending, then copy it or open SMS or
// WhatsApp with it. Nothing is sent from Smartly.
export function LoanReminderDialog({ open, onClose, name, phone, owed, currency, today, onAddPhone }: LoanReminderDialogProps) {
  const { t, fmt, locale } = useLocale();
  const [language, setLanguage] = useState<Language>(locale === "bn" ? "bn" : "en");
  // What the reader typed, until they switch language (which writes it anew).
  const [edited, setEdited] = useState<string | null>(null);
  const text = edited ?? reminderText(language, name, owed, currency, today);
  const to = reminderPhone(phone);
  const body = encodeURIComponent(text);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("Message copied"));
    } catch {
      toast.error(t("Couldn't copy. Select the message and copy it."));
    }
  }

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      width={540}
      headClassName="items-start pt-4.5 pr-5 pb-3.5 pl-6"
      titleClassName="text-[18px] font-bold! leading-[normal]"
      closeClassName="my-0 bg-page text-ink-soft hover:bg-line"
      bodyClassName="gap-3.5 px-6 py-4.5 leading-[normal]"
      footerClassName="px-6"
      title={t("Send a reminder")}
      sub={<span className="text-[13.5px] text-ink-2">{t("{name} owes you {amount}.", { name, amount: formatCurrency(owed, currency, fmt) })}</span>}
      footer={
        <div className="flex w-full flex-wrap items-center gap-2.5">
          <Button type="button" variant="secondary" onClick={copy} className="h-10.5 text-[13.5px]">
            <Copy className="text-ink-soft" />
            {t("Copy message")}
          </Button>
          <span className="flex-1" />
          {to && (
            <>
              <Button asChild variant="secondary" className="h-10.5 text-[13.5px]">
                <a href={`sms:+${to}?body=${body}`}>
                  <MessageSquare className="text-ink-soft" />
                  {t("Send SMS")}
                </a>
              </Button>
              <Button asChild className="h-10.5 bg-whatsapp px-4.5 text-[13.5px] text-white hover:bg-whatsapp/90">
                <a href={`https://wa.me/${to}?text=${body}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle />
                  {t("Open WhatsApp")}
                </a>
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="flex items-center gap-3.5 rounded-[14px] bg-pawna-wash px-3.5 py-3">
        <span className="flex-1 text-[13px] text-brand-ink">{t("Still owed to you")}</span>
        <span className="text-[20px] font-bold text-emerald tabular-nums">{formatCurrency(owed, currency, fmt)}</span>
      </div>
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-[13px] font-semibold text-ink-2">{t("Message language")}</span>
        <SegmentedControl
          options={[
            { value: "bn" as Language, label: t("Bangla") },
            { value: "en" as Language, label: t("English") },
          ]}
          value={language}
          onChange={(next) => {
            setLanguage(next);
            setEdited(null);
          }}
          label={t("Message language")}
          className="rounded-full border-0 bg-page p-0.75"
          itemClassName="h-8 px-3.5 text-[13px] not-aria-pressed:text-ink-2"
        />
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-ink-2">{t("Message")}</span>
        <textarea rows={5} value={text} onChange={(event) => setEdited(event.target.value)} className="resize-y rounded-[12px] border border-input px-3 py-2.5 text-body leading-[1.55] text-ink outline-none focus-visible:border-focus-ring focus-visible:focus-halo" />
        <span className="text-[12px] text-ink-muted">{t("You can change the words before sending.")}</span>
      </label>
      {!to && (
        <div className="flex items-center gap-2.5 rounded-[12px] border border-warning-line bg-warning-50 px-3 py-2.5 text-[13px] text-due-ink">
          <span className="flex-1">{t("No phone number saved for {name}. Add one to send by WhatsApp or SMS.", { name })}</span>
          <button type="button" onClick={onAddPhone} className="font-bold whitespace-nowrap underline-offset-2 hover:underline">
            {t("Add phone")}
          </button>
        </div>
      )}
    </PopupDialog>
  );
}
