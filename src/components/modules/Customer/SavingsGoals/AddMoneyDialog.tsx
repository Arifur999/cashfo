"use client";

import { ArrowRight, Check, ChevronDown, CircleAlert, Info, Landmark, Lock, Plus, Sparkles, Tag, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Textarea from "@/components/smartly/form/Textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account, SavingsGoal } from "@/lib/customer/api";
import { listBudgetCategoryNamesAction } from "@/lib/customer/budgetActions";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { addContributionAction, addProfitAction } from "@/lib/customer/savingsGoalActions";
import { LOOK_META, savingsError } from "@/lib/customer/savingsDisplay";
import { addMoneyChips, goalLook } from "@/lib/customer/savingsPlan";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { DayButton } from "./DayButton";
import { GoalRing } from "./GoalRing";
import { MoneyField } from "./MoneyField";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";

export type AddKind = "deposit" | "profit";

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
  // What it opens on: a deposit, or profit the bank paid (the menu's Add profit).
  kind?: AddKind;
  // An amount to start with (Catch up's "Add the gap now").
  startAmount?: number;
  // The money filled the goal: the page says so.
  onReached: (goalId: string) => void;
}

// Profit on savings is counted under this income category unless another is
// picked; it is offered first even before the customer has made it.
const BANK_PROFIT = "Bank profit";

// Add money to a goal (SavingsDashboard board's Add money popup, and Add
// profit): a deposit from one of your own accounts, or profit the bank paid
// into the goal's savings account, counted as income. The day, how much
// (a deposit with this month's suggestion and what is left as quick picks),
// where it comes from -- an account, or the income category -- where it
// goes, and where everything stands after.
export function AddMoneyDialog({ open, onClose, businessId, goal, color, currency, today, moneyAccounts, savingsWallets, kind: startKind = "deposit", startAmount, onReached }: AddMoneyDialogProps) {
  const { t, fmt, locale } = useLocale();
  const router = useRouter();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const lang = displayLanguage(locale);
  const [kind, setKind] = useState<AddKind>(startKind);
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [fromId, setFromId] = useState("");
  const [intoId, setIntoId] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[] | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open && goal ? `${goal.id}|${startKind}` : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setKind(startKind);
      setDate(today);
      setAmount(startAmount ? String(startAmount) : "");
      setFromId("");
      // A goal without an open account of its own: the wallet holding
      // most of its money, else the only one.
      setIntoId(savingsWallets.find((wallet) => wallet.id === goal?.holdings[0]?.accountId)?.id ?? (savingsWallets.length === 1 ? savingsWallets[0].id : ""));
      setCategory("");
      setNote("");
      setError("");
    }
  }

  // The income categories, once the profit side is shown.
  useEffect(() => {
    if (!open || kind !== "profit" || categories) return;
    let current = true;
    listBudgetCategoryNamesAction(businessId, "INCOME")
      .then((result) => current && setCategories((result.data ?? []).map((item) => item.name)))
      .catch(() => current && setCategories([]));
    return () => {
      current = false;
    };
  }, [open, kind, categories, businessId]);

  if (!goal) return null;
  const profit = kind === "profit";
  const saved = Number(goal.currentAmount);
  const target = Number(goal.targetAmount);
  const left = Math.max(0, target - saved);
  const profitSoFar = Number(goal.profitTotal ?? 0);
  const value = Number(amount) || 0;
  const from = moneyAccounts.find((account) => account.id === fromId);
  // Every deposit goes into the goal's account while it is open; profit is
  // paid into it, so it needs one.
  const fixed = savingsWallets.find((wallet) => wallet.id === goal.accountId);
  const into = fixed ?? (profit ? undefined : savingsWallets.find((wallet) => wallet.id === intoId));
  const percentNow = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
  const percentAfter = target > 0 ? Math.min(100, Math.round(((saved + value) / target) * 100)) : 0;
  const month = formatDate(today, "MMMM", fmt);
  const categoryOptions = [BANK_PROFIT, ...(categories ?? []).filter((name) => name.toLowerCase() !== BANK_PROFIT.toLowerCase())];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending || !goal) return;
    const problem = !value
      ? profit
        ? t("Enter the profit amount.")
        : t("Enter an amount.")
      : profit
        ? !category
          ? t("Pick the income category.")
          : !fixed
            ? t("Pick the savings account this goal keeps its money in first.")
            : null
        : !from
          ? t("Pick the account the money comes from.")
          : !into
            ? t("Pick the savings account to keep it in.")
            : value > Number(from.currentBalance)
              ? t("{name} has only {amount}.", { name: accountDisplayName(from, lang), amount: money(from.currentBalance) })
              : value > left
                ? t("Only {amount} is left to reach the target.", { amount: money(left) })
                : null;
    if (problem) {
      setError(problem);
      return;
    }
    const reached = goal.status !== "COMPLETED" && saved + value >= target;
    const intoName = into ? accountDisplayName(into, lang) : "";
    startTransition(async () => {
      const result = profit
        ? await addProfitAction(businessId, goal.id, { date, amount: value, category: t(category), notes: note.trim() || undefined })
        : await addContributionAction(businessId, goal.id, { date, moneyAccountId: from!.id, toAccountId: into!.id, amount: value, notes: note.trim() || undefined });
      if (!result.success) {
        setError(savingsError(result.message, profit ? "Failed to add profit" : "Failed to add money", t, currency, fmt));
        return;
      }
      toast.success(
        reached
          ? t("{name} is complete. You reached {amount}!", { name: goal.name, amount: money(target) })
          : profit
            ? t("{amount} profit added to {name} in {account}. It is now {percent}% saved.", { amount: money(value), name: goal.name, account: intoName, percent: formatCount(percentAfter, fmt) })
            : t("{amount} added to {name} in {account}. It is now {percent}% saved.", { amount: money(value), name: goal.name, account: intoName, percent: formatCount(percentAfter, fmt) }),
      );
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
  const fieldLabel = "text-[13px] font-semibold text-ink-2";
  const pickTone = (on: boolean) => (on ? "border-emerald bg-emerald-soft" : "border-line bg-surface hover:border-input");

  const after: { label: string; from: string; to: string; tone: "ink" | "bad" | "muted" | "good" | "warm" }[] = profit
    ? [
        fixed ? { label: accountDisplayName(fixed, lang), from: money(fixed.currentBalance), to: money(Number(fixed.currentBalance) + value), tone: "ink" } : { label: t("Keep it in"), from: "", to: t("pick a savings account"), tone: "muted" },
        { label: category ? t("Counted as income · {name}", { name: t(category) }) : t("Counted as income"), from: "", to: category ? `+ ${money(value)}` : t("pick a category"), tone: category ? "good" : "muted" },
        { label: t("Profit in this goal"), from: money(profitSoFar), to: money(profitSoFar + value), tone: "warm" },
      ]
    : [
        from
          ? { label: accountDisplayName(from, lang), from: money(from.currentBalance), to: money(Number(from.currentBalance) - value), tone: Number(from.currentBalance) - value < 0 ? "bad" : "ink" }
          : { label: t("Take it from"), from: "", to: t("pick an account"), tone: "muted" },
        into ? { label: accountDisplayName(into, lang), from: money(into.currentBalance), to: money(Number(into.currentBalance) + value), tone: "ink" } : { label: t("Keep it in"), from: "", to: t("pick a savings account"), tone: "muted" },
      ];

  return (
    <PopupDialog
      className="rounded-[20px] leading-[normal]"
      open={open}
      onClose={onClose}
      width={640}
      busy={isPending}
      onSubmit={submit}
      headClassName="items-center gap-3.5 px-6 py-4"
      titleClassName="text-[17px]"
      bodyClassName="gap-4 px-6 pt-4.5 pb-5"
      footerClassName="px-6"
      lead={
        <GoalRing percent={percentNow} color={color} size={52} label={t("{percent}% saved", { percent: formatCount(percentNow, fmt) })}>
          <span className="text-caption font-bold">{formatCount(percentNow, fmt)}%</span>
        </GoalRing>
      }
      title={profit ? t("Add profit to {name}", { name: goal.name }) : t("Add money to {name}", { name: goal.name })}
      sub={
        <span className="tabular-nums">
          {`${t("{saved} of {target}", { saved: money(saved), target: money(target) })} · ${t(LOOK_META[goalLook(goal)].label)}${profitSoFar > 0 ? ` · ${t("Profit {amount}", { amount: money(profitSoFar) })}` : ""}`}
        </span>
      }
      footer={
        <>
          <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={isPending} className="px-4.5">
            {t("Cancel")}
          </Button>
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending && <Loader size={16} onDark label={t("Loading...")} />}
            {profit ? (value > 0 ? t("Add profit {amount}", { amount: money(value) }) : t("Add profit")) : value > 0 ? t("Add {amount}", { amount: money(value) }) : t("Add money")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <span id="add-kind-label" className={fieldLabel}>
          {t("What are you adding?")}
        </span>
        <div role="radiogroup" aria-labelledby="add-kind-label" className="grid grid-cols-2 gap-2.5">
          {(
            [
              { value: "deposit", title: t("Deposit"), sub: t("From your own account"), icon: Plus, on: "bg-emerald text-white", off: "bg-emerald-soft text-emerald" },
              { value: "profit", title: t("Profit"), sub: t("Paid by the bank"), icon: TrendingUp, on: "bg-tint-yellow-ink text-white", off: "bg-tint-yellow text-tint-yellow-ink" },
            ] as const
          ).map((option) => {
            const on = kind === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setKind(option.value);
                  setError("");
                }}
                className={cn("flex min-w-0 items-center gap-3 rounded-[14px] border-[1.5px] px-3.5 py-3 text-left", pickTone(on))}
              >
                <span aria-hidden="true" className={cn("flex size-9.5 shrink-0 items-center justify-center rounded-[11px]", on ? option.on : option.off)}>
                  <option.icon className="size-4.5" strokeWidth={2.25} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[14.5px] font-bold text-ink">{option.title}</span>
                  <span className="truncate text-[12px] text-ink-muted">{option.sub}</span>
                </span>
                <span aria-hidden="true" className={cn("flex size-4.5 shrink-0 items-center justify-center rounded-full border-2", on ? "border-emerald" : "border-input")}>
                  {on && <span className="size-2 rounded-full bg-emerald" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span id="add-date-label" className={fieldLabel}>
            {t("Date")}
          </span>
          <DayButton value={date} onChange={setDate} today={today} max={today} quick labelledBy="add-date-label" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="add-amount" className={fieldLabel}>
              {profit ? t("Profit amount") : t("Amount")}
            </label>
            <span className="truncate text-[12px] text-ink-muted tabular-nums">
              {profit ? (profitSoFar > 0 ? t("{amount} profit so far", { amount: money(profitSoFar) }) : t("First profit for this goal")) : t("{amount} left to reach {target}", { amount: money(left), target: money(target) })}
            </span>
          </div>
          <MoneyField id="add-amount" value={amount} onChange={setAmount} currency={currency} look="tall" autoFocus={!startAmount} />
        </div>
      </div>

      {!profit && chips.length > 0 && (
        <div className="-mt-1.5 flex flex-wrap gap-1.5">
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
                  "inline-flex h-7.5 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold whitespace-nowrap tabular-nums pointer-coarse:h-11",
                  strong ? "border-emerald-line bg-emerald-soft text-brand-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong",
                )}
              >
                {chip.kind === "suggested" && <Sparkles className="size-3.25" aria-hidden="true" />}
                {chip.label}
              </button>
            );
          })}
        </div>
      )}
      {profit && (
        <p className="-mt-1.5 flex items-start gap-2 rounded-[10px] border border-tint-yellow-line bg-note-yellow px-3 py-2.25 text-[12.5px] leading-[1.45] text-tint-yellow-deep">
          <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
          {t("Write it exactly as the bank’s message or statement shows. No money is taken from your other accounts.")}
        </p>
      )}

      <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_32px_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span id="add-pick-label" className={fieldLabel}>
            {profit ? t("Income category") : t("Take it from")}
          </span>
          {profit ? (
            <PickList
              labelledBy="add-pick-label"
              value={category}
              onChange={setCategory}
              placeholder={categories === null ? t("Loading...") : t("Pick a category")}
              icon={Tag}
              tone="bg-tint-yellow-ink text-white"
              options={categoryOptions.map((name) => ({ value: name, name: t(name), sub: name === BANK_PROFIT ? t("For profit on savings") : "" }))}
              footer={{ href: "/category-set", label: t("New income category") }}
            />
          ) : (
            <PickList
              labelledBy="add-pick-label"
              value={fromId}
              onChange={setFromId}
              placeholder={moneyAccounts.length ? t("Select an account") : t("No wallet yet")}
              icon={Wallet}
              tone="bg-emerald text-white"
              options={moneyAccounts.map((account) => ({
                value: account.id,
                name: accountDisplayName(account, lang),
                sub: t("Main balance"),
                right: money(account.currentBalance),
                low: value > 0 && Number(account.currentBalance) < value,
                current: t("Balance {amount}", { amount: money(account.currentBalance) }),
              }))}
            />
          )}
        </div>
        <span aria-hidden="true" className="hidden h-14 items-center justify-center sm:flex">
          <span className={cn("flex size-7.5 items-center justify-center rounded-full", profit ? "bg-tint-yellow text-tint-yellow-ink" : "bg-emerald-soft text-emerald")}>
            <ArrowRight className="size-3.75" strokeWidth={2.5} />
          </span>
        </span>
        {fixed || profit ? (
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className={fieldLabel}>{profit ? t("Paid into") : t("Goes into")}</span>
            <span title={t("Set for this goal. Change it from Edit goal.")} className="flex h-14 items-center gap-2.5 rounded-[12px] border-[1.5px] border-mint-200 bg-emerald-soft px-3">
              <span aria-hidden="true" className="flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-emerald text-white">
                <Landmark className="size-4.25" strokeWidth={2} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="truncate text-[14px] font-semibold text-ink">{fixed ? accountDisplayName(fixed, lang) : t("No savings account yet")}</span>
                <span className="truncate text-[12px] text-ink-muted tabular-nums">{fixed?.accountNumber ? t("A/c {number}", { number: fixed.accountNumber }) : t("Savings account")}</span>
              </span>
              <Lock className="size-3.5 shrink-0 text-ink-muted" strokeWidth={2.25} aria-hidden="true" />
              <span className="sr-only">{t("Set for this goal. Change it from Edit goal.")}</span>
            </span>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-1.5">
            <span id="add-into-label" className={fieldLabel}>
              {t("Keep it in")}
            </span>
            <PickList
              labelledBy="add-into-label"
              value={intoId}
              onChange={setIntoId}
              placeholder={t("Select a savings account")}
              icon={Landmark}
              tone="bg-emerald text-white"
              options={savingsWallets.map((wallet) => ({ value: wallet.id, name: accountDisplayName(wallet, lang), sub: wallet.accountNumber ?? t("Savings account"), right: money(wallet.currentBalance) }))}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="add-note" className={fieldLabel}>
          {t("Note")} <span className="font-normal text-ink-muted">({t("optional")})</span>
        </label>
        <Textarea
          id="add-note"
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={200}
          placeholder={profit ? t("e.g. Profit for January to June") : t("e.g. October deposit")}
          className="h-13 min-h-12 resize-y rounded-[12px] border-[1.5px] border-line px-3.5 py-3 text-[14px] leading-[1.45]"
        />
      </div>

      <div className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-strip px-4 py-3.5 text-[13px] tabular-nums">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[12px] font-semibold tracking-[0.04em] text-ink-muted uppercase">{t("After this")}</span>
          <span>
            <span className="text-ink-muted">{formatCount(percentNow, fmt)}% →</span> <b className="text-brand-ink">{formatCount(percentAfter, fmt)}%</b>
          </span>
        </div>
        <div role="img" aria-label={t("{name} goes from {from}% to {to}%", { name: goal.name, from: formatCount(percentNow, fmt), to: formatCount(percentAfter, fmt) })} className="flex h-2.5 overflow-hidden rounded-full bg-line">
          <span style={{ width: `${percentNow}%`, background: color }} />
          <span style={{ width: `${Math.max(0, percentAfter - percentNow)}%`, background: profit ? "var(--ie-yellow)" : color }} className={cn("shadow-[inset_2px_0_0_var(--surface)]", !profit && "opacity-45")} />
        </div>
        <div className="flex justify-between gap-3 text-[12.5px] text-ink-soft">
          <span className="min-w-0 truncate">{goal.name}</span>
          <span className="shrink-0">
            <span className="text-ink-muted">{money(saved)} →</span> <b className="text-ink">{t("{saved} of {target}", { saved: money(saved + value), target: money(target) })}</b>
          </span>
        </div>
        {after.map((row) => (
          <div key={row.label} className="flex justify-between gap-3 border-t border-line-card pt-2">
            <span className="min-w-0 truncate text-ink-2">{row.label}</span>
            <span className="shrink-0">
              {row.from && <span className="text-ink-muted">{row.from} → </span>}
              <span
                className={cn(
                  "font-semibold",
                  row.tone === "bad" ? "text-expense" : row.tone === "muted" ? "text-ink-faint" : row.tone === "good" ? "text-tint-green-ink" : row.tone === "warm" ? "text-tint-yellow-ink" : "text-ink",
                )}
              >
                {row.to}
              </span>
            </span>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-2 text-small text-expense">
          <CircleAlert className="size-3.75 shrink-0" strokeWidth={2.25} aria-hidden="true" />
          {error}
        </p>
      )}
    </PopupDialog>
  );
}

interface PickOption {
  value: string;
  name: string;
  sub?: string;
  // The balance, on the right of the list.
  right?: string;
  // Less than the amount: the balance goes red.
  low?: boolean;
  // The second line once picked (an account's balance).
  current?: string;
}

// The board's dropdown (the account money comes from, the income category,
// the savings account): a tile, the name with a second line, and a list that
// the arrow keys walk.
function PickList({
  labelledBy,
  value,
  onChange,
  placeholder,
  icon: Icon,
  tone,
  options,
  footer,
}: {
  labelledBy: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: typeof Tag;
  tone: string;
  options: PickOption[];
  footer?: { href: string; label: string };
}) {
  const [open, setOpen] = useState(false);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const chosen = options.findIndex((option) => option.value === value);
  const current = chosen === -1 ? null : options[chosen];

  function step(event: React.KeyboardEvent) {
    if ((event.key !== "ArrowDown" && event.key !== "ArrowUp") || options.length === 0) return;
    event.preventDefault();
    const next = event.key === "ArrowDown" ? Math.min(options.length - 1, chosen + 1) : Math.max(0, chosen - 1);
    onChange(options[next].value);
    if (open) refs.current[next]?.focus();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-labelledby={`${labelledBy} ${labelledBy}-value`}
          onKeyDown={step}
          className={cn("flex h-14 w-full min-w-0 items-center gap-2.5 rounded-[12px] border-[1.5px] bg-surface px-3 text-left", open || current ? "border-emerald" : "border-line hover:border-input")}
        >
          <span aria-hidden="true" className={cn("flex size-8.5 shrink-0 items-center justify-center rounded-[10px]", current ? tone : "bg-surface-sunken text-ink-soft")}>
            <Icon className="size-4.25" strokeWidth={2} />
          </span>
          <span id={`${labelledBy}-value`} className="flex min-w-0 flex-1 flex-col gap-px">
            {current ? (
              <>
                <span className="truncate text-[14px] font-semibold text-ink">{current.name}</span>
                {(current.current ?? current.sub) && <span className="truncate text-[12px] text-ink-muted tabular-nums">{current.current ?? current.sub}</span>}
              </>
            ) : (
              <span className="truncate text-[14px] text-ink-muted">{placeholder}</span>
            )}
          </span>
          <ChevronDown className={cn("size-4.5 shrink-0 text-ink-muted transition-transform duration-150", open && "rotate-180")} strokeWidth={2} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          refs.current[Math.max(0, chosen)]?.focus();
        }}
        className="w-[max(var(--radix-popover-trigger-width),300px)] gap-0 rounded-[12px] border border-line bg-surface p-1.5 leading-[normal] shadow-float ring-0"
      >
        <div role="listbox" aria-labelledby={labelledBy} className="flex max-h-81 flex-col overflow-y-auto">
          {options.map((option, index) => {
            const on = index === chosen;
            return (
              <button
                key={option.value}
                ref={(node) => {
                  refs.current[index] = node;
                }}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                onKeyDown={step}
                className={cn("flex w-full min-w-0 items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-focus-ring", on ? "bg-emerald-soft" : "bg-surface hover:bg-surface-sunken")}
              >
                <span aria-hidden="true" className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-[9px]", on ? tone : "bg-surface-sunken text-ink-soft")}>
                  <Icon className="size-3.75" strokeWidth={2} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-[13.5px] font-semibold text-ink">{option.name}</span>
                  {option.sub && <span className="truncate text-[11.5px] text-ink-muted">{option.sub}</span>}
                </span>
                {option.right && <span className={cn("shrink-0 text-[12.5px] font-semibold tabular-nums", option.low ? "text-expense" : "text-ink-soft")}>{option.right}</span>}
                <span className="flex w-4 shrink-0">{on && <Check className="size-4 text-emerald" strokeWidth={3} aria-hidden="true" />}</span>
              </button>
            );
          })}
        </div>
        {footer && (
          <Link href={footer.href} className="mt-1 flex items-center gap-2 border-t border-card-rule p-2.5 text-[13px] font-semibold text-brand-ink">
            <Plus className="size-3.75" strokeWidth={2.4} aria-hidden="true" />
            {footer.label}
          </Link>
        )}
      </PopoverContent>
    </Popover>
  );
}
