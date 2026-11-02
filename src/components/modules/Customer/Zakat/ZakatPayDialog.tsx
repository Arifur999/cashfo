"use client";

import { ArrowDown } from "lucide-react";
import { useState, useTransition } from "react";
import { useDrawerWallets } from "@/components/modules/Customer/Assets/useDrawerWallets";
import AmountInput from "@/components/modules/Customer/Shared/AmountInput";
import { WalletPicker } from "@/components/modules/Customer/Shared/WalletPicker";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import { recordZakatAction } from "@/lib/customer/zakatActions";
import { earliestGivenOn, GIVEN_TO_MAX, quickAmounts } from "@/lib/customer/zakatDisplay";
import type { ZakatSummary } from "@/lib/customer/zakatTypes";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface ZakatPayDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  summary: ZakatSummary;
  currency: string;
  money: (value: number | string) => string;
  onSaved: (summary: ZakatSummary, message: string) => void;
}

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
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const left = Number(summary.totals.left);
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDate(summary.today);
      setAmount(left > 0 ? String(left) : "");
      setPickedId("");
      setGivenTo("");
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
  const walletName = wallet ? accountDisplayName(wallet, displayLanguage(locale)) : "";
  const amountError = tried && !value ? t("Type how much you gave.") : short ? t("{wallet} has only {amount}. Pick another wallet or give less.", { wallet: walletName, amount: money(balance) }) : "";
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

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={520}
      title={t("Record zakat given")}
      sub={
        Number(summary.totals.zakat) > 0
          ? left > 0
            ? t("{amount} left to give this year", { amount: money(left) })
            : t("You have given all of this year's zakat.")
          : t("No zakat is due now, but you can still record what you give.")
      }
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
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
          <WalletPicker
            label={t("Paid from")}
            size="lg"
            balanceLabel="Balance"
            tone="sand"
            wallets={wallets}
            value={wallet?.id ?? ""}
            onChange={setPickedId}
            after={wallet && value > 0 && !short ? balance - value : null}
            afterInWords
            minBalance={value}
            currency={currency}
            loading={loading}
            error={walletsError}
            onClose={onClose}
          />
          {walletError && (
            <p role="alert" className="text-caption text-expense">
              {walletError}
            </p>
          )}
        </div>
      </div>

      <Field htmlFor="zk-pay-amount" label={t("Amount")} error={amountError}>
        <div className="flex flex-col gap-2">
          <AmountInput id="zk-pay-amount" size="lg" value={amount} onChange={setAmount} currency={currency} invalid={Boolean(amountError)} />
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {chips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setAmount(String(chip.amount))}
                  className="h-7 rounded-full border border-line bg-surface px-2.5 text-caption font-semibold text-ink-2 hover:border-line-strong hover:bg-surface-sunken pointer-coarse:h-11"
                >
                  {t(chip.label)}
                </button>
              ))}
            </div>
          )}
        </div>
      </Field>

      <Field htmlFor="zk-pay-to" label={<>{t("Given to")} <span className="text-small font-normal text-ink-muted">{t("(optional, only you see this)")}</span></>}>
        <Input id="zk-pay-to" size="md" value={givenTo} onChange={(event) => setGivenTo(event.target.value)} maxLength={GIVEN_TO_MAX} placeholder={t("Like: uncle's family, local madrasa")} />
      </Field>

      <div className="flex items-start gap-3 rounded-xl border border-mint-50 bg-mint-50/60 px-3.5 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-surface text-expense">
          <ArrowDown className="size-4" strokeWidth={2.25} aria-hidden="true" />
        </span>
        <span className="flex flex-col gap-1 text-[13px] leading-[1.45] text-brand-ink">
          <span className="flex flex-wrap items-center gap-1.5">
            <b className="font-semibold">{t("Goes to expenses as")}</b>
            <span className="inline-flex items-center gap-1.25 rounded-full bg-surface px-2.25 py-px text-caption font-semibold text-ink">
              <span aria-hidden="true" className="size-2 rounded-full bg-income" />
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
