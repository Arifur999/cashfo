"use client";

import { ArrowRight, Sparkles } from "lucide-react";
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
import { formatDate } from "@/lib/customer/date";
import { addContributionAction } from "@/lib/customer/savingsGoalActions";
import { LOOK_META, savingsError } from "@/lib/customer/savingsDisplay";
import { addMoneyChips, goalLook } from "@/lib/customer/savingsPlan";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GoalRing } from "./GoalRing";
import { SavingsDialog } from "./SavingsDialog";

interface AddMoneyDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  goal: SavingsGoal | null;
  color: string;
  currency: string;
  today: string;
  // The accounts money can come from, and the savings wallets it can sit in.
  moneyAccounts: Account[];
  savingsWallets: Account[];
  // An amount to start with (Catch up's "Add the gap now").
  startAmount?: number;
  // The money filled the goal: the page says so.
  onReached: (goalId: string) => void;
}

// Add money to a goal (design: SavingsDashboard's Add money popup): the
// day, how much (with this month's suggestion and what is left as quick
// picks), which account it leaves and which savings account keeps it, and
// where everything stands after.
export function AddMoneyDialog({ open, onClose, businessId, goal, color, currency, today, moneyAccounts, savingsWallets, startAmount, onReached }: AddMoneyDialogProps) {
  const { t, fmt, locale } = useLocale();
  const router = useRouter();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const lang = displayLanguage(locale);
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [fromId, setFromId] = useState("");
  const [intoId, setIntoId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open && goal ? goal.id : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setDate(today);
      setAmount(startAmount ? String(startAmount) : "");
      setFromId("");
      // The wallet holding most of the goal's money, else the first.
      setIntoId(savingsWallets.find((wallet) => wallet.id === goal?.holdings[0]?.accountId)?.id ?? (savingsWallets.length === 1 ? savingsWallets[0].id : ""));
      setNote("");
      setError("");
    }
  }

  if (!goal) return null;
  const saved = Number(goal.currentAmount);
  const target = Number(goal.targetAmount);
  const left = Math.max(0, target - saved);
  const value = Number(amount) || 0;
  const from = moneyAccounts.find((account) => account.id === fromId);
  const into = savingsWallets.find((wallet) => wallet.id === intoId);
  const percentNow = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
  const percentAfter = target > 0 ? Math.min(100, Math.round(((saved + value) / target) * 100)) : 0;
  const month = formatDate(today, "MMMM", fmt);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending || !goal) return;
    const problem = !value
      ? t("Enter an amount.")
      : !from
        ? t("Pick the account the money comes from.")
        : !into
          ? t("Pick the savings account to keep it in.")
          : value > Number(from.currentBalance)
            ? t("{name} has only {amount}.", { name: accountDisplayName(from, lang), amount: money(from.currentBalance) })
            : value > left
              ? t("Only {amount} is left to reach the target.", { amount: money(left) })
              : null;
    if (problem || !from || !into) {
      setError(problem ?? "");
      return;
    }
    const reached = saved + value >= target;
    startTransition(async () => {
      const result = await addContributionAction(businessId, goal.id, { date, moneyAccountId: from.id, toAccountId: into.id, amount: value, notes: note.trim() || undefined });
      if (!result.success) {
        setError(savingsError(result.message, "Failed to add money", t, currency, fmt));
        return;
      }
      toast.success(reached ? t("{name} is complete. You reached {amount}!", { name: goal.name, amount: money(target) }) : t("{amount} added to {name}. It is now {percent}% saved.", { amount: money(value), name: goal.name, percent: formatCount(percentAfter, fmt) }));
      onClose();
      if (reached) onReached(goal.id);
      router.refresh();
    });
  }

  const chips = addMoneyChips(goal, today).map((chip) => ({
    ...chip,
    label:
      chip.kind === "suggested"
        ? t("Suggested for {month} · {amount}", { month, amount: money(chip.amount) })
        : chip.kind === "covered"
          ? t("{month} is covered · next month {amount}", { month, amount: money(chip.amount) })
          : chip.kind === "rest"
            ? t("All that's left · {amount}", { amount: money(chip.amount) })
            : money(chip.amount),
  }));
  const fieldLabel = "text-small font-semibold text-ink-2";

  return (
    <SavingsDialog
      open={open}
      onClose={onClose}
      width={560}
      busy={isPending}
      onSubmit={submit}
      lead={
        <GoalRing percent={percentNow} color={color} size={52} label={t("{percent}% saved", { percent: formatCount(percentNow, fmt) })}>
          <span className="text-caption font-bold">{formatCount(percentNow, fmt)}%</span>
        </GoalRing>
      }
      title={t("Add money to {name}", { name: goal.name })}
      sub={<span className="tabular-nums">{`${t("{saved} of {target}", { saved: money(saved), target: money(target) })} · ${t(LOOK_META[goalLook(goal)].label)}`}</span>}
      footer={
        <>
          <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending && <Loader size={16} onDark label={t("Loading...")} />}
            {value > 0 ? t("Add {amount}", { amount: money(value) }) : t("Add money")}
          </Button>
        </>
      }
    >
      <Field htmlFor="add-date" label={<span className={fieldLabel}>{t("Date")}</span>}>
        <DayInput id="add-date" size="lg" value={date} onChange={(day) => setDate(day || today)} max={today} />
      </Field>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="add-amount" className={fieldLabel}>
            {t("Amount")}
          </label>
          <span className="text-caption text-ink-muted tabular-nums">{t("{amount} left to reach {target}", { amount: money(left), target: money(target) })}</span>
        </div>
        <AmountInput id="add-amount" value={amount} onChange={setAmount} currency={currency} size="lg" autoFocus={!startAmount} />
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => {
            const on = value === chip.amount;
            const strong = on || chip.kind === "suggested";
            return (
              <button
                key={`${chip.kind}-${chip.amount}`}
                type="button"
                aria-pressed={on}
                onClick={() => setAmount(String(chip.amount))}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold whitespace-nowrap tabular-nums pointer-coarse:h-11",
                  strong ? "border-emerald-line bg-mint-50 text-brand-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong",
                )}
              >
                {chip.kind === "suggested" && <Sparkles className="size-3.25" aria-hidden="true" />}
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)]">
        <Field htmlFor="add-from" label={<span className={fieldLabel}>{t("Take it from")}</span>}>
          <NativeSelect id="add-from" size="lg" value={fromId} onChange={(event) => setFromId(event.target.value)} className={cn(!from && "text-ink-muted")}>
            <option value="" disabled>
              {moneyAccounts.length ? t("Select an account") : t("No wallet yet")}
            </option>
            {moneyAccounts.map((account) => (
              <option key={account.id} value={account.id}>{`${accountDisplayName(account, lang)} · ${money(account.currentBalance)}`}</option>
            ))}
          </NativeSelect>
        </Field>
        <span aria-hidden="true" className="hidden h-12 items-center justify-center sm:flex">
          <span className="flex size-8 items-center justify-center rounded-full bg-mint-50 text-emerald">
            <ArrowRight className="size-4" strokeWidth={2.5} />
          </span>
        </span>
        <Field htmlFor="add-into" label={<span className={fieldLabel}>{t("Keep it in")}</span>}>
          <NativeSelect id="add-into" size="lg" value={intoId} onChange={(event) => setIntoId(event.target.value)} className={cn(!into && "text-ink-muted")}>
            <option value="" disabled>
              {t("Select a savings account")}
            </option>
            {savingsWallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>{`${accountDisplayName(wallet, lang)} · ${money(wallet.currentBalance)}`}</option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <Field
        htmlFor="add-note"
        label={
          <span className={fieldLabel}>
            {t("Note")} <span className="font-normal text-ink-muted">({t("optional")})</span>
          </span>
        }
      >
        <Input id="add-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t("e.g. October deposit")} />
      </Field>

      <div className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-strip px-4 py-3.5 text-small tabular-nums">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-caption font-semibold tracking-[0.04em] text-ink-muted uppercase">{t("After this")}</span>
          <span>
            <span className="text-ink-muted">{formatCount(percentNow, fmt)}% → </span>
            <b className="text-emerald">{formatCount(percentAfter, fmt)}%</b>
          </span>
        </div>
        <div role="img" aria-label={t("{name} goes from {from}% to {to}%", { name: goal.name, from: formatCount(percentNow, fmt), to: formatCount(percentAfter, fmt) })} className="flex h-2.5 overflow-hidden rounded-full bg-line">
          <span style={{ width: `${percentNow}%`, background: color }} />
          <span style={{ width: `${Math.max(0, percentAfter - percentNow)}%`, background: color }} className="opacity-45" />
        </div>
        <div className="flex justify-between gap-3 text-[12.5px] text-ink-2">
          <span className="min-w-0 truncate">
            {goal.name} {money(saved)} →
          </span>
          <b className="shrink-0 text-ink">{t("{saved} of {target}", { saved: money(saved + value), target: money(target) })}</b>
        </div>
        <AfterRow label={from ? accountDisplayName(from, lang) : t("Take it from")} from={from ? money(from.currentBalance) : ""} to={from ? money(Number(from.currentBalance) - value) : t("pick an account")} tone={!from ? "muted" : Number(from.currentBalance) - value < 0 ? "bad" : "ink"} />
        <AfterRow label={into ? accountDisplayName(into, lang) : t("Keep it in")} from={into ? money(into.currentBalance) : ""} to={into ? money(Number(into.currentBalance) + value) : t("pick a savings account")} tone={into ? "ink" : "muted"} />
      </div>

      {error && (
        <p role="alert" className="text-small text-expense">
          {error}
        </p>
      )}
    </SavingsDialog>
  );
}

function AfterRow({ label, from, to, tone }: { label: string; from: string; to: string; tone: "ink" | "bad" | "muted" }) {
  return (
    <div className="flex justify-between gap-3 border-t border-divider pt-2">
      <span className="min-w-0 truncate text-ink-2">{label}</span>
      <span className="shrink-0">
        {from && <span className="text-ink-muted">{from} → </span>}
        <span className={cn("font-semibold", tone === "bad" ? "text-expense" : tone === "muted" ? "text-ink-faint" : "text-ink")}>{to}</span>
      </span>
    </div>
  );
}
