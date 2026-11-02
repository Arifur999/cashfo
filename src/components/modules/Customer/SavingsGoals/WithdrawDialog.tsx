"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import AmountInput from "@/components/modules/Customer/Shared/AmountInput";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account, SavingsGoal } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { withdrawToBalanceAction } from "@/lib/customer/savingsGoalActions";
import { savingsError } from "@/lib/customer/savingsDisplay";
import { splitLargestFirst } from "@/lib/customer/savingsPlan";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";

interface WithdrawDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  goal: SavingsGoal | null;
  currency: string;
  today: string;
  // The main balance accounts the money can go to.
  moneyAccounts: Account[];
}

// Take money out of a goal (design: SavingsDashboard's Withdraw popup): any
// amount up to what is saved, to a main balance account. It comes out of
// the savings accounts holding the goal's money, largest first; taking all
// of it closes the goal. Spending is then recorded as an ordinary expense.
export function WithdrawDialog({ open, onClose, businessId, goal, currency, today, moneyAccounts }: WithdrawDialogProps) {
  const { t, fmt, locale } = useLocale();
  const router = useRouter();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const lang = displayLanguage(locale);
  const [amount, setAmount] = useState("");
  const [toId, setToId] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open && goal ? goal.id : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open && goal) {
      setAmount(String(Number(goal.currentAmount)));
      setToId(moneyAccounts[0]?.id ?? "");
      setDate(today);
      setNote("");
      setError("");
    }
  }

  if (!goal) return null;
  const saved = Number(goal.currentAmount);
  const value = Number(amount) || 0;
  const to = moneyAccounts.find((account) => account.id === toId);
  const completed = goal.status === "COMPLETED";
  const full = value > 0 && value === saved;
  const parts = value > 0 && value <= saved ? splitLargestFirst(goal.holdings, value) : [];
  const info = !value
    ? t("Enter how much to take out.")
    : value > saved
      ? t("{name} has only {amount}.", { name: goal.name, amount: money(saved) })
      : full
        ? completed
          ? t("{name} will be marked Achieved and closed.", { name: goal.name })
          : t("This takes everything out and closes {name} before it reaches the target.", { name: goal.name })
        : t("{name} stays open with {amount} saved.", { name: goal.name, amount: money(saved - value) });
  const warn = full && !completed;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending || !goal) return;
    if (!value) return setError(t("Enter an amount."));
    if (value > saved) return setError(t("{name} has only {amount}.", { name: goal.name, amount: money(saved) }));
    if (!to) return setError(t("Pick the account to send it to."));
    startTransition(async () => {
      const result = await withdrawToBalanceAction(businessId, goal.id, { amount: value, toAccountId: to.id, date, notes: note.trim() || undefined });
      if (!result.success) {
        setError(savingsError(result.message, "Failed to withdraw", t, currency, fmt));
        return;
      }
      const toName = accountDisplayName(to, lang);
      const after = full ? (completed ? t("{name} is marked Achieved.", { name: goal.name }) : t("{name} is closed.", { name: goal.name })) : t("{name} keeps {amount}.", { name: goal.name, amount: money(saved - value) });
      toast.success(`${t("{amount} moved to {account}.", { amount: money(value), account: toName })} ${after} ${t("Record your spending as an expense from {account}.", { account: toName })}`);
      onClose();
      router.refresh();
    });
  }

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      width={540}
      busy={isPending}
      onSubmit={submit}
      title={t("Withdraw from {name}", { name: goal.name })}
      sub={t("The money goes to your main balance. Record what you buy as an expense from there.")}
      footer={
        <>
          <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending && <Loader size={16} onDark label={t("Loading...")} />}
            {value > 0 ? t("Withdraw {amount}", { amount: money(value) }) : t("Withdraw")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="wd-amount" className="text-body font-medium text-ink">
          {t("Amount")}
        </label>
        <AmountInput id="wd-amount" value={amount} onChange={setAmount} currency={currency} autoFocus />
        <div className="flex gap-1.5">
          <button type="button" onClick={() => setAmount(String(saved))} className="h-8 rounded-full border border-line bg-surface px-3 text-caption font-semibold text-ink-2 tabular-nums hover:border-line-strong pointer-coarse:h-11">
            {t("All · {amount}", { amount: money(saved) })}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-line bg-strip px-3.5 py-3 text-small tabular-nums">
        <span className="text-caption font-semibold tracking-[0.04em] text-ink-muted uppercase">{t("Comes out of")}</span>
        {parts.length === 0 ? (
          <span className="text-ink-muted">{t("Enter an amount to see which savings accounts it comes from.")}</span>
        ) : (
          parts.map((part, index) => (
            <div key={`${part.name}-${index}`} className="flex justify-between gap-3">
              <span className="min-w-0 truncate text-ink-2">{part.name ?? t("Savings account")}</span>
              <span className="font-semibold">{money(part.amount)}</span>
            </div>
          ))
        )}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_170px]">
        <Field htmlFor="wd-to" label={<span className="text-body font-medium text-ink">{t("Send to")}</span>}>
          <NativeSelect id="wd-to" size="md" value={toId} onChange={(event) => setToId(event.target.value)}>
            {moneyAccounts.length === 0 && <option value="">{t("No wallet yet")}</option>}
            {moneyAccounts.map((account) => (
              <option key={account.id} value={account.id}>{`${accountDisplayName(account, lang)} · ${money(account.currentBalance)}`}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field htmlFor="wd-date" label={<span className="text-body font-medium text-ink">{t("Date")}</span>}>
          <DayInput id="wd-date" size="md" value={date} onChange={(day) => setDate(day || today)} max={today} />
        </Field>
      </div>

      <Field
        htmlFor="wd-note"
        label={
          <span className="text-body font-medium text-ink">
            {t("Note")} <span className="font-normal text-ink-muted">({t("optional")})</span>
          </span>
        }
      >
        <Input id="wd-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t("e.g. Buying the phone this week")} />
      </Field>

      <p className={cn("rounded-field px-3 py-2.5 text-small leading-normal", warn ? "bg-warning-soft text-warning-ink" : "bg-mint-50 text-brand-ink")}>{info}</p>

      {error && (
        <p role="alert" className="text-small text-expense">
          {error}
        </p>
      )}
    </PopupDialog>
  );
}
