"use client";

import { Check, Copy, Image as ImageIcon, Info, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { BankAccountDetails, ManualWallet } from "@/lib/customer/billingDisplay";
import { formatWalletNumber, payerOk, referenceOk, walletMeta, type WalletMeta } from "@/lib/customer/checkoutDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// A screenshot the API takes: a JPEG, PNG or WEBP up to 5 MB.
export const SHOT_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const SHOT_MAX_BYTES = 5 * 1024 * 1024;

export interface ManualForm {
  wallet: ManualWallet;
  from: string;
  trx: string;
  shot: File | null;
}

interface ManualPanelProps {
  wallets: WalletMeta[];
  // Where the money goes: the number, or the bank account; null when the
  // admin hasn't set this way up (their own instructions say instead).
  account: string | BankAccountDetails | null;
  instructions: string | null;
  // What to send, and as the customer reads it ("৳ 1,910").
  amount: number;
  amountText: string;
  // What the customer writes as the reference: their phone, else their name.
  reference: { label: string; value: string; byPhone: boolean };
  form: ManualForm;
  onChange: (next: Partial<ManualForm>) => void;
  // Show what is missing (after a press of the button).
  tried: boolean;
  readOnly: boolean;
  // The bank account name to suggest.
  namePlaceholder: string;
  // Fix the details: an earlier screenshot is already with the payment.
  savedShot?: { onRemove: () => void } | null;
  // Fix the details: only the fields, without the steps and the note.
  stepsHidden?: boolean;
}

// Checkout › Send money yourself (Checkout board, manual): the wallet tabs,
// three numbered steps with what to copy, the number sent from and the
// TrxID, and an optional screenshot.
export function ManualPanel({ wallets, account, instructions, amount, amountText, reference, form, onChange, tried, readOnly, namePlaceholder, savedShot, stepsHidden = false }: ManualPanelProps) {
  const { t, fmt } = useLocale();
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const wallet = walletMeta(form.wallet);
  const bank = form.wallet === "BANK";
  const fromOk = payerOk(form.wallet, form.from);
  const trxOk = referenceOk(form.wallet, form.trx);

  async function copy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      toast.success(t("Copied: {value}", { value }));
      window.setTimeout(() => setCopied((now) => (now === key ? null : now)), 1600);
    } catch {
      toast.error(t("Couldn't copy. Select the text and copy it yourself."));
    }
  }

  function chooseShot(file: File | undefined) {
    if (!file) return;
    if (!SHOT_TYPES.includes(file.type)) return void toast.error(t("Only JPEG, PNG or WEBP screenshots are allowed"));
    if (file.size > SHOT_MAX_BYTES) return void toast.error(t("The screenshot is bigger than 5 MB"));
    onChange({ shot: file });
  }

  const copyButton = (key: string, value: string, label: string, small = false) => {
    const done = copied === key;
    return (
      <button
        type="button"
        onClick={() => void copy(key, value)}
        aria-label={t("Copy {label}", { label })}
        className={cn(
          "flex shrink-0 items-center gap-1.25 rounded-lg font-semibold transition-colors",
          small ? "h-6.5 px-2.25 text-[12px]" : "h-7 px-2.5 text-[12.5px]",
          done ? "bg-emerald text-white" : "bg-mint-50 text-brand-ink hover:bg-mint-200/60",
        )}
      >
        {!small && (done ? <Check className="size-3.25" strokeWidth={2.4} aria-hidden="true" /> : <Copy className="size-3.25" strokeWidth={2.2} aria-hidden="true" />)}
        {done ? t("Copied") : t("Copy")}
      </button>
    );
  };

  const chip = (key: string, label: string, shown: string, value = shown) => (
    <span key={key} className="flex h-10 items-center gap-2.5 rounded-field border border-line bg-surface pr-1.5 pl-3">
      <span className="flex flex-col leading-[1.15]">
        <span className="text-[11px] text-ink-muted">{label}</span>
        <b className="text-[14.5px] font-semibold tracking-[0.01em] text-ink tabular-nums" lang="en">
          {shown}
        </b>
      </span>
      {copyButton(key, value, label)}
    </span>
  );

  const referenceChip = chip("ref", reference.label, reference.byPhone ? formatWalletNumber(reference.value) : reference.value, reference.value);
  const steps: { text: string; extra?: React.ReactNode }[] = [{ text: t(wallet.how) }];
  if (account === null) {
    steps.push({ text: instructions ?? t("Send exactly {amount}.", { amount: amountText }) });
  } else if (typeof account === "string") {
    steps.push({
      text: t("Send exactly {amount} to our {wallet} number (Personal).", { amount: amountText, wallet: wallet.name }),
      extra: (
        <div className="flex flex-wrap gap-2">
          {chip("num", t("Smartly {wallet}", { wallet: wallet.name }), formatWalletNumber(account), account)}
          {chip("amt", t("Amount"), amountText, String(amount))}
        </div>
      ),
    });
  } else {
    const rows: [string, string, string | null][] = [
      [t("Account name"), account.accountName, null],
      [t("Bank"), account.branch ? `${account.bankName} · ${account.branch}` : account.bankName, null],
      [t("Account number"), account.accountNumber, "acc"],
      ...(account.routingNumber ? [[t("Routing number"), account.routingNumber, "rt"] as [string, string, string]] : []),
      [t("Amount"), amountText, "amt"],
    ];
    steps.push({
      text: t("Send exactly {amount} to this account:", { amount: amountText }),
      extra: (
        <dl className="grid grid-cols-[minmax(0,130px)_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-field border border-line bg-surface px-3 py-2.5 text-[13.5px]">
          {rows.map(([label, value, key]) => (
            <div key={label} className="contents">
              <dt className="text-ink-muted">{label}</dt>
              <dd className="font-semibold wrap-break-word text-ink tabular-nums" lang="en">
                {value}
              </dd>
              <span>{key && copyButton(key, key === "amt" ? String(amount) : value, label, true)}</span>
            </div>
          ))}
        </dl>
      ),
    });
  }
  steps.push({
    text: bank
      ? reference.byPhone
        ? t("In the transfer note, write your phone number so we know it is you.")
        : t("In the transfer note, write your name so we know it is you.")
      : reference.byPhone
        ? t("In Reference, write your phone number so we know it is you.")
        : t("In Reference, write your name so we know it is you."),
    extra: <div className="flex flex-wrap gap-2">{referenceChip}</div>,
  });

  const fieldClass = "h-11.5 rounded-xl border bg-surface px-3.5 text-[15px] text-ink outline-none placeholder:text-ink-faint focus-visible:ring-2 focus-visible:ring-focus-ring/40 disabled:opacity-60";
  const fromBad = tried && !fromOk;
  const trxBad = tried && !trxOk;

  return (
    <div className="flex flex-col gap-3.5">
      {wallets.length > 1 && (
        <div role="radiogroup" aria-label={t("Send from")} className="flex flex-wrap gap-1 self-start rounded-[14px] bg-surface-sunken p-1">
          {wallets.map((option) => {
            const on = option.id === form.wallet;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange({ wallet: option.id })}
                className={cn("flex h-9.5 items-center gap-1.75 rounded-field px-4 text-[14px] font-semibold transition-colors", on ? "bg-surface text-ink shadow-button" : "text-ink-soft hover:text-ink")}
              >
                <span aria-hidden="true" className={cn("size-2 rounded-full", option.dot)} />
                {option.id === "BANK" ? t("Bank") : option.name}
              </button>
            );
          })}
        </div>
      )}

      {!stepsHidden && (
        <ol className="flex flex-col gap-2.5">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-3 rounded-[14px] bg-strip px-3.5 py-3">
              <span aria-hidden="true" className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-forest text-[13px] font-bold text-white">
                {formatCount(index + 1, fmt)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.75">
                <span className="text-[14px] leading-[1.45] whitespace-pre-line text-ink">{step.text}</span>
                {step.extra}
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13.5px] font-medium text-ink-2">{bank ? t("Your account name") : t("Number you sent from")}</span>
          <input
            type="text"
            value={form.from}
            onChange={(event) => onChange({ from: event.target.value })}
            inputMode={bank ? "text" : "tel"}
            autoComplete={bank ? "name" : "tel"}
            placeholder={bank ? namePlaceholder : "01XXX-XXXXXX"}
            maxLength={80}
            disabled={readOnly}
            aria-invalid={fromBad || undefined}
            className={cn(fieldClass, fromBad ? "border-expense-fill" : "border-input")}
          />
          {fromBad && <span className="text-[12.5px] text-expense">{bank ? t("Type the name on your bank account.") : t("Type the 11-digit number, like 01711-482915.")}</span>}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13.5px] font-medium text-ink-2">{bank ? t("Transfer reference") : t("Transaction ID (TrxID)")}</span>
          <input
            type="text"
            value={form.trx}
            onChange={(event) => onChange({ trx: event.target.value })}
            placeholder={wallet.trxPlaceholder}
            maxLength={60}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={readOnly}
            aria-invalid={trxBad || undefined}
            className={cn(fieldClass, "font-mono tracking-[0.04em] uppercase placeholder:normal-case", trxBad ? "border-expense-fill" : "border-input")}
          />
          <span className={cn("text-[12.5px]", trxBad ? "text-expense" : "text-ink-muted")}>{trxBad ? t("This looks too short. Copy it from the message.") : t(wallet.trxHint)}</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <input ref={fileRef} type="file" accept={SHOT_TYPES.join(",")} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(event) => {
          chooseShot(event.target.files?.[0]);
          event.target.value = "";
        }} />
        {form.shot || savedShot ? (
          <span className="flex h-10 items-center gap-2.5 rounded-xl border border-mint-200 bg-emerald-soft pr-1.5 pl-3 text-[13.5px] font-semibold text-brand-ink">
            <ImageIcon className="size-4" strokeWidth={2} aria-hidden="true" />
            <span className="max-w-55 truncate">{form.shot ? form.shot.name : t("Screenshot added")}</span>
            <button
              type="button"
              onClick={() => (form.shot ? onChange({ shot: null }) : savedShot?.onRemove())}
              disabled={readOnly}
              aria-label={t("Remove screenshot")}
              className="flex size-7 items-center justify-center rounded-lg hover:bg-mint-50"
            >
              <X className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
            </button>
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={readOnly}
              className="flex h-10 items-center gap-2 rounded-xl border border-dashed border-ink-faint bg-surface px-3.5 text-[13.5px] font-semibold text-ink-2 hover:bg-surface-sunken disabled:opacity-60"
            >
              <Upload className="size-4" strokeWidth={2} aria-hidden="true" />
              {t("Add a screenshot")}
            </button>
            <span className="text-[12.5px] text-ink-muted">{t("Optional, helps us check faster")}</span>
          </>
        )}
      </div>

      {!stepsHidden && (
        <div className="flex items-start gap-2.5 rounded-xl border border-warning-line bg-warning-50 px-3.5 py-3">
          <Info className="mt-px size-4.5 shrink-0 text-warning" strokeWidth={2} aria-hidden="true" />
          <span className="text-[13px] leading-normal text-warning-ink">
            {t("Send the exact amount, {amount}. If the amount is different, checking takes longer. We check payments from 9 am to 10 pm, usually within 2 hours.", { amount: amountText })}
          </span>
        </div>
      )}
    </div>
  );
}
