"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import { updateBillingDetailsAction } from "@/lib/customer/billingActions";
import { billingEmailProblem, billingNameProblem, billingPhoneProblem, phoneBoxText, phoneDigits, type BillingDetails } from "@/lib/customer/billingDetails";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PopupDialog } from "../../Shared/PopupDialog";

// A name the PDF receipt can print: Latin letters (with accents) only.
const LATIN_ONLY = /^[\p{Script=Latin}\p{M} .'-]*$/u;
const BOX = "h-11 w-full rounded-[10px] border bg-surface px-3 text-[15px] text-ink outline-none focus-visible:border-primary";

interface BillingDetailsDialogProps {
  open: boolean;
  details: BillingDetails;
  onClose: () => void;
  onSaved: (details: BillingDetails) => void;
}

// The board's Billing details popup: the name, phone and email receipts
// carry from the next payment. Each box is checked once it has been left,
// and all of them on Save.
export function BillingDetailsDialog({ open, details, onClose, onSaved }: BillingDetailsDialogProps) {
  const { t } = useLocale();
  const [name, setName] = useState(details.name);
  const [phone, setPhone] = useState(phoneBoxText(details.phone));
  const [email, setEmail] = useState(details.email);
  const [touched, setTouched] = useState<Record<"name" | "phone" | "email", boolean>>({ name: false, phone: false, email: false });
  const [pending, startTransition] = useTransition();

  // Opened again: what is saved now.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName(details.name);
      setPhone(phoneBoxText(details.phone));
      setEmail(details.email);
      setTouched({ name: false, phone: false, email: false });
    }
  }

  const problems = { name: billingNameProblem(name), phone: billingPhoneProblem(phone), email: billingEmailProblem(email) };
  const shown = (key: keyof typeof problems) => (touched[key] ? problems[key] : null);

  function save() {
    setTouched({ name: true, phone: true, email: true });
    if (problems.name || problems.phone || problems.email) return;
    const digits = phoneDigits(phone);
    startTransition(async () => {
      const result = await updateBillingDetailsAction({ name: name.trim(), phone: digits ? `+880${digits}` : null, email: email.trim() });
      if (!result.success || !result.data) {
        toast.error(t(result.message ?? "Couldn't save your billing details"));
        return;
      }
      toast.success(t("Saved"));
      onSaved(result.data);
    });
  }

  const hint = (key: keyof typeof problems, text: string) => {
    const problem = shown(key);
    return (
      <span id={`bd-${key}-hint`} className={cn("text-[12.5px]", problem ? "text-expense" : "text-ink-muted")} role={problem ? "alert" : undefined}>
        {t(problem ?? text)}
      </span>
    );
  };
  const border = (key: keyof typeof problems) => (shown(key) ? "border-expense-fill" : "border-input");
  const leave = (key: keyof typeof problems) => () => setTouched((now) => ({ ...now, [key]: true }));

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      busy={pending}
      width={460}
      title={t("Billing details")}
      sub={t("Used on receipts from your next payment.")}
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" className="h-9.5 text-[13.5px]" disabled={pending} onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button type="submit" size="sm" className="h-9.5 text-[13.5px]" disabled={pending}>
            {t(pending ? "Saving..." : "Save")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bd-name" className="text-[14px] font-medium text-ink">
          {t("Name on receipts")}
        </label>
        <input id="bd-name" type="text" maxLength={60} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} onBlur={leave("name")} aria-invalid={Boolean(shown("name"))} aria-describedby="bd-name-hint" className={cn(BOX, border("name"))} />
        {/* The PDF receipt's fonts have Latin letters only (the backend's billedTo). */}
        {hint("name", LATIN_ONLY.test(name) ? "Printed on every receipt." : "Type it in English letters to see it on the PDF receipt too.")}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bd-phone" className="text-[14px] font-medium text-ink">
          {t("Phone")}
        </label>
        <div className={cn("flex h-11 items-center overflow-hidden rounded-[10px] border bg-surface focus-within:border-primary", border("phone"))}>
          <span className="flex h-full items-center border-r border-line bg-strip px-3 text-[15px] font-medium text-ink-2" lang="en">
            +880
          </span>
          <input id="bd-phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="1XXX-XXXXXX" value={phone} onChange={(event) => setPhone(event.target.value)} onBlur={leave("phone")} aria-invalid={Boolean(shown("phone"))} aria-describedby="bd-phone-hint" className="h-full min-w-0 flex-1 bg-transparent px-3 text-[15px] text-ink outline-none placeholder:text-ink-faint" />
        </div>
        {hint("phone", "We call this number only about a payment problem.")}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bd-email" className="text-[14px] font-medium text-ink">
          {t("Email for receipts")}
        </label>
        <input id="bd-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} onBlur={leave("email")} aria-invalid={Boolean(shown("email"))} aria-describedby="bd-email-hint" className={cn(BOX, border("email"))} />
        {hint("email", "Receipts and renewal reminders go here.")}
      </div>
    </PopupDialog>
  );
}
