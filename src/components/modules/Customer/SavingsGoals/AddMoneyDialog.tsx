"use client";

import { ArrowRight, Landmark, Lock, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { MoneyField } from "./MoneyField";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";

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
// picks), which account it leaves -- it goes into the goal's own savings
// account, picked only for a goal that has none open -- and where
// everything stands after.
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
      // A goal without an open account of its own: the wallet holding
      // most of its money, else the only one.
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
  // Every deposit goes into the goal's account while it is open.
  const fixed = savingsWallets.find((wallet) => wallet.id === goal.accountId);
  const into = fixed ?? savingsWallets.find((wallet) => wallet.id === intoId);
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
  const intoName = into ? accountDisplayName(into, lang) : "";
  const guide = !into
    ? null
    : {
        head: value && from ? t("Send {amount} from {from} to {to}", { amount: money(value), from: accountDisplayName(from, lang), to: intoName }) : value ? t("Deposit {amount} into {to}", { amount: money(value), to: intoName }) : t("This money goes into {to}", { to: intoName }),
        sub: into.accountNumber ? t("Account no. {number}", { number: into.accountNumber }) : t("Set for this goal"),
      };

  return (
    <PopupDialog
      className="leading-[normal]"
      open={open}
      onClose={onClose}
      width={560}
      busy={isPending}
      onSubmit={submit}
      headClassName="items-center gap-3.5"
      titleClassName="text-[17px]"
      bodyClassName="gap-4.5 py-5"
      lead={
        <GoalRing percent={percentNow} color={color} size={52} label={t("{percent}% saved", { percent: formatCount(percentNow, fmt) })}>
          <span className="text-caption font-bold">{formatCount(percentNow, fmt)}%</span>
        </GoalRing>
      }
      title={t("Add money to {name}", { name: goal.name })}
      sub={<span className="tabular-nums">{`${t("{saved} of {target}", { saved: money(saved), target: money(target) })} · ${t(LOOK_META[goalLook(goal)].label)}`}</span>}
      footer={
        <>
          <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={isPending} className="px-4.5">
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
        <DayInput id="add-date" size="lg" value={date} onChange={(day) => setDate(day || today)} max={today} className="rounded-[12px] px-3.5 text-[15px] font-semibold" />
      </Field>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="add-amount" className={fieldLabel}>
            {t("Amount")}
          </label>
          <span className="text-caption text-ink-muted tabular-nums">{t("{amount} left to reach {target}", { amount: money(left), target: money(target) })}</span>
        </div>
        <MoneyField id="add-amount" value={amount} onChange={setAmount} currency={currency} look="plain" autoFocus={!startAmount} />
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
                  strong ? "border-emerald-line bg-emerald-soft text-emerald" : "border-line bg-surface text-ink-2 hover:border-line-strong",
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
          <NativeSelect id="add-from" size="lg" value={fromId} onChange={(event) => setFromId(event.target.value)} className={cn("rounded-[12px]", !from && "text-ink-muted")}>
            <option value="" disabled>
              {moneyAccounts.length ? t("Select an account") : t("No wallet yet")}
            </option>
            {moneyAccounts.map((account) => (
              <option key={account.id} value={account.id}>{`${accountDisplayName(account, lang)} · ${money(account.currentBalance)}`}</option>
            ))}
          </NativeSelect>
        </Field>
        <span aria-hidden="true" className="hidden h-12 items-center justify-center sm:flex">
          <span className="flex size-8 items-center justify-center rounded-full bg-emerald-soft text-emerald">
            <ArrowRight className="size-4" strokeWidth={2.5} />
          </span>
        </span>
        {fixed ? (
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className={fieldLabel}>{t("Goes into")}</span>
            <span title={t("Set for this goal. Change it from Edit goal.")} className="flex h-12 items-center gap-2 rounded-[12px] border border-emerald bg-emerald-soft px-2.5">
              <Landmark className="size-4 shrink-0 text-emerald" strokeWidth={2} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{intoName}</span>
              <Lock className="size-3.25 shrink-0 text-ink-muted" strokeWidth={2.25} aria-hidden="true" />
              <span className="sr-only">{t("Set for this goal. Change it from Edit goal.")}</span>
            </span>
          </div>
        ) : (
          <Field htmlFor="add-into" label={<span className={fieldLabel}>{t("Keep it in")}</span>}>
            <NativeSelect id="add-into" size="lg" value={intoId} onChange={(event) => setIntoId(event.target.value)} className={cn("rounded-[12px]", !into && "text-ink-muted")}>
              <option value="" disabled>
                {t("Select a savings account")}
              </option>
              {savingsWallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>{`${accountDisplayName(wallet, lang)} · ${money(wallet.currentBalance)}`}</option>
              ))}
            </NativeSelect>
          </Field>
          )}
      </div>

      {guide && (
        <div aria-live="polite" className="-mt-1.5 flex items-center gap-3 rounded-[14px] bg-wallet-forest px-3.5 py-3 text-white">
          <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white/16">
            <Landmark className="size-4.5" strokeWidth={2} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[14px] font-bold tabular-nums">{guide.head}</span>
            <span className="text-[12.5px] text-white/80 tabular-nums">{guide.sub}</span>
          </span>
        </div>
      )}

      <Field
        htmlFor="add-note"
        label={
          <span className={fieldLabel}>
            {t("Note")} <span className="font-normal text-ink-muted">({t("optional")})</span>
          </span>
        }
      >
        <Input id="add-note" size="md" frameClassName="rounded-[12px] px-3.5" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t("e.g. October deposit")} />
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
    </PopupDialog>
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
