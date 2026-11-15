"use client";

import { ArrowDown, Check, ChevronDown, ChevronUp } from "lucide-react";
import { createElement, useState, useTransition } from "react";
import { useDrawerWallets } from "@/components/modules/Customer/Assets/useDrawerWallets";
import AmountInput from "@/components/modules/Customer/Shared/AmountInput";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account } from "@/lib/customer/api";
import { walletIcon } from "@/lib/customer/walletVisuals";
import { recordZakatAction } from "@/lib/customer/zakatActions";
import { earliestGivenOn, GIVEN_TO_MAX, quickAmounts } from "@/lib/customer/zakatDisplay";
import type { ZakatSummary } from "@/lib/customer/zakatTypes";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ZAKAT_POPUP } from "./zakatPopup";

interface ZakatPayDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  summary: ZakatSummary;
  currency: string;
  money: (value: number | string) => string;
  onSaved: (summary: ZakatSummary, message: string) => void;
}

// An amount as the field holds it: whole taka plain, else to the paisa.
const amountText = (value: number) => (value > 0 ? (Number.isInteger(value) ? String(value) : value.toFixed(2)) : "");

// Record zakat given (board: ZakatPay): the day, the wallet it left (with
// its balance, too-small ones greyed out), how much (all that is left, this
// month's part, half), to whom (only the member sees it). It is saved as an
// expense under Zakat, taken from that wallet.
export function ZakatPayDialog({ open, onClose, businessId, summary, currency, money, onSaved }: ZakatPayDialogProps) {
  const { t, locale } = useLocale();
  const { wallets, loading, error: walletsError } = useDrawerWallets(open, businessId);
  const [date, setDate] = useState(summary.today);
  const [amount, setAmount] = useState("");
  const [pickedId, setPickedId] = useState("");
  const [givenTo, setGivenTo] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const left = Number(summary.totals.left);
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDate(summary.today);
      setAmount(amountText(left));
      setPickedId("");
      setGivenTo("");
      setListOpen(false);
      setTried(false);
      setError("");
    }
  }

  const value = Number(amount) || 0;
  // The wallet picked, else the fullest one that can pay it.
  const fullest = [...wallets].sort((a, b) => Number(b.currentBalance) - Number(a.currentBalance)).find((wallet) => Number(wallet.currentBalance) >= value);
  const wallet = wallets.find((each) => each.id === pickedId) ?? fullest ?? null;
  const balance = wallet ? Number(wallet.currentBalance) : 0;
  const short = Boolean(wallet) && value > balance;
  const nameOf = (each: Account) => accountDisplayName(each, displayLanguage(locale));
  const walletName = wallet ? nameOf(wallet) : "";
  // "Bank · •••• 7890" under a wallet in the list.
  const walletSub = (each: Account) => {
    const kind = t(SUBTYPE_SUB[each.accountSubtype ?? ""] ?? "Wallet");
    const digits = each.accountNumber?.replace(/\s/g, "").slice(-4);
    return digits ? `${kind} · •••• ${digits}` : kind;
  };
  const amountError = tried && !value ? t("Type how much you gave.") : short ? t("{wallet} has only {amount}. Pick another account or give less.", { wallet: walletName, amount: money(balance) }) : "";
  const walletError = tried && !wallet && !loading ? t("Pick the wallet it left.") : "";
  const earliest = earliestGivenOn(summary.dueDate);
  const dateBad = !date || date > summary.today || date < earliest;
  const chips = quickAmounts(left, summary.totals.parts, Number(summary.totals.perPart));

  function save() {
    if (isPending) return;
    if (!value || !wallet || short || dateBad) {
      setTried(true);
      return;
    }
    setError("");
    const first = summary.payments.length === 0;
    startTransition(async () => {
      const result = await recordZakatAction(businessId, { amount: value, paidOn: date, accountId: wallet.id, ...(givenTo.trim() && { givenTo: givenTo.trim() }) }).catch(() => null);
      if (result?.success && result.data) onSaved(result.data, first ? "Saved as an expense. Zakat category created." : "Saved as an expense under Zakat");
      else setError(t(result?.message ?? "Couldn't save the zakat you gave."));
    });
  }

  // A wallet's tile: cash in the brand's mint, a bank or mobile wallet in blue.
  const tile = (each: Account) => (
    <span className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-[9px]", each.accountSubtype === "cash" ? "bg-mint-50 text-emerald" : "bg-tint-blue text-tint-blue-ink")}>
      {createElement(walletIcon(each), { className: "size-3.75", strokeWidth: 2, "aria-hidden": true })}
    </span>
  );

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={500}
      title={<span className="block leading-[normal]">{t("Record zakat given")}</span>}
      sub={
        Number(summary.totals.zakat) > 0
          ? left > 0
            ? t("{amount} left to give this year", { amount: money(left) })
            : t("You have given all of this year's zakat.")
          : t("No zakat is due now, but you can still record what you give.")
      }
      {...ZAKAT_POPUP}
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={isPending} className="px-4.5">
            {isPending && <Loader size={16} onDark label={t("Saving...")} />}
            {t("Save as expense")}
          </Button>
        </>
      }
    >
      <div className="grid items-start gap-3 sm:grid-cols-[170px_minmax(0,1fr)]">
        <Field htmlFor="zk-pay-date" label={t("Date")} error={tried && dateBad ? t(date > summary.today ? "The date cannot be in the future" : "That date belongs to an earlier zakat year") : ""}>
          <DayInput id="zk-pay-date" size="lg" value={date} onChange={setDate} min={earliest} max={summary.today} invalid={tried && dateBad} />
        </Field>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span id="zk-from-l" className="text-[14px] font-medium">
            {t("Paid from@@zakat")}
          </span>
          <Popover open={listOpen} onOpenChange={setListOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-labelledby="zk-from-l zk-from-v"
                disabled={loading || wallets.length === 0}
                className={cn(
                  "flex h-12 min-w-0 items-center gap-2.5 rounded-[12px] bg-surface px-3 text-left text-ink disabled:opacity-60",
                  listOpen ? "border-[1.5px] border-emerald" : short || walletError ? "border border-expense-fill" : "border border-input",
                )}
              >
                {wallet ? (
                  <>
                    {tile(wallet)}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span id="zk-from-v" className="truncate text-[14px] font-semibold">
                        {walletName}
                      </span>
                      <span className="text-caption text-ink-muted tabular-nums">{`${t("Balance")} ${money(balance)}`}</span>
                    </span>
                  </>
                ) : (
                  <span id="zk-from-v" className="flex-1 text-[14px] text-ink-muted">
                    {loading ? t("Loading...") : t("No wallet yet")}
                  </span>
                )}
                {listOpen ? <ChevronUp className="size-4 shrink-0 text-ink-muted" aria-hidden="true" /> : <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={7} className="w-[330px] max-w-[calc(100vw-32px)] gap-0 rounded-[14px] border border-line bg-surface p-1.5 leading-[normal] shadow-[0_16px_36px_rgba(18,32,29,0.18)] ring-0">
              <span className="block px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-[0.06em] text-ink-faint uppercase">{t("Your accounts@@zakat")}</span>
              <ul role="listbox" aria-labelledby="zk-from-l" className="flex max-h-72 flex-col overflow-y-auto">
                {wallets.map((each) => {
                  const on = each.id === wallet?.id;
                  const low = value > Number(each.currentBalance);
                  return (
                    <li key={each.id} role="option" aria-selected={on} aria-disabled={low || undefined}>
                      <button
                        type="button"
                        disabled={low}
                        onClick={() => {
                          setPickedId(each.id);
                          setListOpen(false);
                        }}
                        className={cn("flex min-h-12 w-full items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 text-left text-ink hover:bg-hover disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent", on && "bg-pick-wash")}
                      >
                        {tile(each)}
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[14px] font-semibold">{nameOf(each)}</span>
                          <span className={cn("text-caption", low ? "text-loss-ink" : "text-ink-muted")}>{low ? t("Not enough for {amount}", { amount: money(value) }) : walletSub(each)}</span>
                        </span>
                        <span className="text-[13.5px] font-semibold whitespace-nowrap tabular-nums">{money(each.currentBalance)}</span>
                        {on && <Check className="size-4 shrink-0 text-emerald" strokeWidth={2.75} aria-hidden="true" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </PopoverContent>
          </Popover>
          {(walletError || walletsError) && (
            <p role="alert" className="text-caption text-expense">
              {walletError || t(walletsError ?? "")}
            </p>
          )}
        </div>
      </div>

      <Field htmlFor="zk-pay-amount" label={t("Amount")} error={amountError}>
        <div className="flex flex-col gap-1.5">
          <AmountInput id="zk-pay-amount" size="lg" value={amount} onChange={setAmount} currency={currency} invalid={Boolean(amountError)} frameClassName="[&_input]:font-semibold [&>span:first-child]:text-[16px]" />
          <div className="flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => setAmount(amountText(chip.amount))}
                className="h-7 rounded-full border border-line bg-surface px-2.5 text-caption font-semibold text-ink-2 hover:bg-pick-wash pointer-coarse:h-11"
              >
                {t(chip.label)}
              </button>
            ))}
            <span className="flex-1" />
            {wallet && value > 0 && !short && <span className="text-caption text-ink-muted">{t("{wallet} after this: {amount}", { wallet: walletName, amount: money(balance - value) })}</span>}
          </div>
        </div>
      </Field>

      <Field
        htmlFor="zk-pay-to"
        label={
          <span className="flex flex-col gap-1.5">
            {t("Given to@@zakat")}
            <span className="text-[12.5px] font-normal text-ink-muted">{t("(optional, only you see this)")}</span>
          </span>
        }
      >
        <Input id="zk-pay-to" size="md" value={givenTo} onChange={(event) => setGivenTo(event.target.value)} maxLength={GIVEN_TO_MAX} placeholder={t("Like: uncle's family, local madrasa")} />
      </Field>

      <div className="flex items-start gap-3 rounded-[12px] border border-mint-50 bg-pick-wash px-3.5 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-surface text-loss-ink">
          <ArrowDown className="size-4" strokeWidth={2.25} aria-hidden="true" />
        </span>
        <span className="flex flex-col gap-1 text-[13px] leading-[1.45] text-brand-ink">
          <span className="flex flex-wrap items-center gap-1.5">
            <b className="font-semibold">{t("Goes to expenses as")}</b>
            <span className="inline-flex items-center gap-1.25 rounded-full bg-surface px-2.25 py-px text-caption font-semibold text-ink">
              <span aria-hidden="true" className="size-2 rounded-full bg-tint-green-ink" />
              {t("Zakat")}
            </span>
          </span>
          <span className="text-ink-2">
            {summary.payments.length > 0
              ? t("Saved as an expense in Income & Expense and taken from {wallet}.", { wallet: walletName || t("the wallet you pick") })
              : t("Saved as an expense in Income & Expense and taken from {wallet}. The Zakat category is made for you the first time.", { wallet: walletName || t("the wallet you pick") })}
          </span>
        </span>
      </div>

      {error && (
        <p role="alert" className="rounded-field bg-expense-soft px-3.5 py-2.5 text-small text-expense">
          {error}
        </p>
      )}
    </PopupDialog>
  );
}

// The line under a wallet in the list.
const SUBTYPE_SUB: Record<string, string> = { cash: "Cash in hand", bank: "Bank", mfs: "Mobile banking" };
