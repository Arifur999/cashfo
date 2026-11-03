"use client";

import { ArrowRight, Check, CircleAlert, Landmark, Minus, Plus, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Input from "@/components/smartly/form/Input";
import Textarea from "@/components/smartly/form/Textarea";
import type { Account, SavingsGoal } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { createSavingsGoalAction, type SavingsGoalFormInput, updateSavingsGoalAction } from "@/lib/customer/savingsGoalActions";
import { monthsAhead, monthsBetween, savingsError } from "@/lib/customer/savingsDisplay";
import { monthsToGo } from "@/lib/customer/savingsPlan";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { MoneyField } from "./MoneyField";

interface GoalFormDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  editing: SavingsGoal | null;
  currency: string;
  today: string;
  // Where the reminder email goes.
  email: string;
  // Active savings wallets: where the goal keeps its money.
  wallets: Account[];
  onAddWallet: () => void;
}

// A new goal's name in one tap.
const IDEAS = [
  { emoji: "✈️", label: "Trip", name: "Family trip" },
  { emoji: "📱", label: "Phone", name: "New phone" },
  { emoji: "🛟", label: "Emergency fund", name: "Emergency fund" },
  { emoji: "🕋", label: "Umrah", name: "Umrah trip" },
  { emoji: "💻", label: "Laptop", name: "New laptop" },
  { emoji: "🎓", label: "Education", name: "Education fund" },
] as const;

const SPANS = [
  { months: 6, label: "6 months" },
  { months: 12, label: "1 year" },
  { months: 24, label: "2 years" },
] as const;

const LABEL = "text-[13px] font-semibold text-ink-2";
// The board's fields: a 1.5px edge and 12px corners.
const FRAME = "rounded-[12px] border-[1.5px]";
const choice = (on: boolean) => (on ? "border-emerald bg-emerald-soft text-emerald" : "border-line bg-surface text-ink-2 hover:border-input");

// New or edited savings goal (SavingsDashboard board's goal form): what for,
// the target and what is already saved, the savings account every deposit
// goes into, the end date -- with the plan it works out to -- and, folded
// away, a reminder day and a note.
export function GoalFormDialog({ open, onClose, businessId, editing, currency, today, email, wallets, onAddWallet }: GoalFormDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const day = (value: string) => formatDate(value, "d MMM yyyy", fmt);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [have, setHave] = useState("");
  const [accountId, setAccountId] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [description, setDescription] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // The account an edited goal keeps its money in now (a goal from before
  // goals had one: where its money sits).
  const homeId = editing ? (editing.accountId ?? editing.holdings.find((holding) => holding.accountId)?.accountId ?? null) : null;

  // Fill the form the moment it opens, or switches to another goal.
  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setName(editing?.name ?? "");
      setTargetAmount(editing ? String(Number(editing.targetAmount)) : "");
      setHave("");
      setAccountId(homeId ?? wallets[0]?.id ?? "");
      setEndDate(editing?.targetDate.slice(0, 10) ?? "");
      setReminderDate(editing?.reminderDate?.slice(0, 10) ?? "");
      setDescription(editing?.description ?? "");
      setShowMore(!!(editing?.reminderDate || editing?.description));
      setError("");
    }
  }

  const target = Number(targetAmount) || 0;
  const saved = editing ? Number(editing.currentAmount) : Number(have) || 0;
  const leftToSave = Math.max(0, target - saved);
  const months = endDate && endDate > today ? monthsToGo(endDate, today) : 0;
  const perMonth = months > 0 ? Math.ceil(leftToSave / months) : 0;
  // No account to pick when the form opened: the first one added since.
  const wallet = wallets.find((item) => item.id === accountId) ?? (accountId ? null : (wallets[0] ?? null));
  // An edited goal may keep a day that has gone by (an overdue goal, a
  // reminder that went out); a changed one must come after today.
  const keptEnd = !!editing && endDate === editing.targetDate.slice(0, 10);
  const keptReminder = !!editing && reminderDate === (editing.reminderDate?.slice(0, 10) ?? "");
  // Money already saved moves to the new account with the goal; the
  // customer moves it in the bank too.
  const movedFrom = editing && saved > 0 && wallet && homeId && wallet.id !== homeId ? (editing.account?.name ?? editing.holdings.find((holding) => holding.accountId === homeId)?.name ?? null) : null;
  const hasExtra = !!reminderDate || !!description;

  function check(): string | null {
    if (!name.trim()) return t("Give the goal a name.");
    if (!target) return t("Enter a target amount.");
    if (editing && target < saved) return t("The target can't be less than what's already saved ({amount}).", { amount: money(saved) });
    if (!editing && saved > target) return t("Already saved can't be more than the target.");
    if (!editing && saved > 0 && !wallet) return t("Add a savings account to record the money you already have.");
    if (!endDate || (endDate <= today && !keptEnd)) return t("Pick an end date after today.");
    if (reminderDate && !keptReminder && (reminderDate <= today || reminderDate > endDate)) return t("The reminder date has to be between tomorrow and the end date.");
    return null;
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending) return;
    const problem = check();
    if (problem) {
      setError(problem);
      return;
    }
    const goalName = name.trim();
    const reminder = reminderDate ? ` ${t("Reminder email on {date}.", { date: day(reminderDate) })}` : "";
    startTransition(async () => {
      const result = editing ? await updateSavingsGoalAction(businessId, editing.id, editInput(editing)) : await createSavingsGoalAction(businessId, createInput());
      if (!result.success) {
        setError(savingsError(result.message, "Failed to save goal", t, currency, fmt));
        return;
      }
      if (editing && movedFrom && wallet) toast.success(`${t("{name} now keeps its money in {account}. Move {amount} there from {from}.", { name: goalName, account: wallet.name, amount: money(saved), from: movedFrom })}${reminder}`);
      else if (editing) toast.success(`${t("{name} was updated.", { name: goalName })}${reminder}`);
      else
        toast.success(
          `${t("{name} was created.", { name: goalName })} ${leftToSave > 0 ? t("{left} left to save, about {amount} a month.", { left: money(leftToSave), amount: money(perMonth) }) : t("The full target is already saved.")}${reminder}`,
        );
      onClose();
      router.refresh();
    });
  }

  // The money already saved goes into the goal's account.
  function createInput(): SavingsGoalFormInput {
    return {
      name: name.trim(),
      targetAmount: target,
      targetDate: endDate,
      durationMonths: monthsBetween(today, endDate),
      reminderDate: reminderDate || undefined,
      reminderChannel: reminderDate ? "EMAIL" : undefined,
      description: description.trim() || undefined,
      ...(wallet && { accountId: wallet.id }),
      ...(saved > 0 && { startAmount: saved }),
    };
  }

  // Everything the form shows, so a cleared description or reminder is
  // cleared. The duration goes only with a new date, measured from the day
  // the goal began (the backend's monthly figure is paced from then), and
  // the account only when it changed.
  function editInput(goal: SavingsGoal): Partial<SavingsGoalFormInput> {
    return {
      name: name.trim(),
      targetAmount: target,
      ...(!keptEnd && { targetDate: endDate, durationMonths: monthsBetween(goal.startDate, endDate) }),
      reminderDate: reminderDate || null,
      reminderChannel: reminderDate ? "EMAIL" : null,
      description: description.trim(),
      ...(wallet && wallet.id !== goal.accountId && { accountId: wallet.id }),
    };
  }

  const plan = !target
    ? { label: t("Your plan@@savings"), big: t("Add a target"), side: t("We work out the monthly amount.") }
    : leftToSave === 0
      ? { label: t("All set"), big: t("Target reached"), side: t("It will be marked Completed.") }
      : months > 0
        ? {
            label: t("Save each month"),
            big: money(perMonth),
            side: t(months === 1 ? "{left} left · {count} month · by {date}" : "{left} left · {count} months · by {date}", { left: money(leftToSave), count: formatCount(months, fmt), date: day(endDate) }),
          }
        : { label: t("Left to save"), big: money(leftToSave), side: t("Pick a date to see the monthly amount.") };
  const savedPercent = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      width={540}
      busy={isPending}
      onSubmit={submit}
      className="rounded-[22px]"
      headClassName="items-center gap-3.5 border-b-0 pt-4.5 pr-4.5 pb-3.5 pl-5.5"
      titleClassName="text-[19px] font-bold tracking-[-0.01em]"
      bodyClassName="gap-4.5 px-5.5 pt-1 pb-5"
      footerClassName="bg-surface px-5.5 py-3.5"
      lead={
        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-emerald-soft text-emerald">
          <Target className="size-5.5" strokeWidth={2} />
        </span>
      }
      title={editing ? t("Edit {name}", { name: editing.name }) : t("New savings goal")}
      sub={editing ? t("Change the name, target or date.") : t("A name, a target and a date. That is all.")}
      footer={
        <>
          <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={isPending} className="h-11.5">
            {t("Cancel")}
          </Button>
          <Button type="submit" size="lg" disabled={isPending} className="h-11.5 gap-2 px-6 shadow-button">
            {isPending && <Loader size={16} onDark label={t("Loading...")} />}
            {editing ? t("Save changes") : t("Create goal")}
            {!isPending && <ArrowRight className="size-3.75" strokeWidth={2.5} aria-hidden="true" />}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="goal-name" className={LABEL}>
          {t("What are you saving for?")}
        </label>
        <Input id="goal-name" size="lg" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={40} placeholder={t("e.g. Family trip to Sylhet")} frameClassName={cn(FRAME, "px-3.5")} className="text-[15px] font-medium" />
        {!editing && (
          <div className="flex flex-wrap gap-1.5">
            {IDEAS.map((idea) => {
              const value = t(idea.name);
              const on = name === value;
              return (
                <button
                  key={idea.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setName(value)}
                  className={cn("flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold pointer-coarse:h-10", choice(on))}
                >
                  <span aria-hidden="true">{idea.emoji}</span>
                  {t(idea.label)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor="goal-target" className={LABEL}>
            {t("Target")}
          </label>
          <MoneyField id="goal-target" value={targetAmount} onChange={setTargetAmount} currency={currency} look="target" />
        </div>
        {editing ? (
          <div className="flex min-w-0 flex-col gap-2">
            <span className={LABEL}>{t("Saved so far")}</span>
            <span className="flex h-14 items-center rounded-[12px] bg-surface-sunken px-3.5 text-[18px] font-bold text-ink-soft tabular-nums">{money(saved)}</span>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="goal-have" className={LABEL}>
              {t("Saved already")} <span className="font-medium text-ink-faint">· {t("optional")}</span>
            </label>
            <MoneyField id="goal-have" value={have} onChange={setHave} currency={currency} look="saved" />
          </div>
        )}
      </div>

      {wallets.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="flex items-baseline justify-between gap-2">
            <span id="goal-account-label" className={LABEL}>
              {t("Keep the money in")}
            </span>
            <span className="text-[12px] text-ink-muted">{t("Every deposit goes here")}</span>
          </span>
          <AccountChoice wallets={wallets} value={wallet?.id ?? ""} onChange={setAccountId} labelledBy="goal-account-label" />
          {movedFrom && wallet && (
            <span className="rounded-[10px] bg-warning-soft px-3 py-2 text-[12.5px] text-warning-ink">{t("Move {amount} from {from} to {to} in your bank too.", { amount: money(saved), from: movedFrom, to: wallet.name })}</span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-[12px] bg-warning-soft px-3 py-2.5 text-[12.5px] text-warning-ink">
          <span className="min-w-0 flex-1">{t("Add a savings account first. This goal keeps its money there.")}</span>
          <button type="button" onClick={onAddWallet} className="h-8 shrink-0 rounded-full border border-warning bg-surface px-3 text-[12.5px] font-semibold whitespace-nowrap text-warning-ink pointer-coarse:h-10">
            {t("Add account")}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="goal-end" className={LABEL}>
          {t("By when?")}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {SPANS.map((span) => {
            const date = monthsAhead(today, span.months);
            return (
              <button key={span.months} type="button" aria-pressed={endDate === date} onClick={() => setEndDate(date)} className={cn("h-11 rounded-[12px] border-[1.5px] px-3.5 text-[13.5px] font-semibold whitespace-nowrap", choice(endDate === date))}>
                {t(span.label)}
              </button>
            );
          })}
          <DayInput id="goal-end" size="md" value={endDate} onChange={setEndDate} min={keptEnd ? endDate : today} placeholder={t("Pick a day")} aria-label={t("End date")} className={cn(FRAME, "min-w-40 flex-1")} />
        </div>
      </div>

      <div aria-live="polite" className="relative flex flex-col gap-3 overflow-hidden rounded-[16px] bg-wallet-forest px-4.5 py-4 text-white">
        <svg viewBox="0 0 140 140" aria-hidden="true" className="absolute -top-10 -right-9 size-35 opacity-16">
          <circle cx="70" cy="70" r="56" fill="none" stroke="currentColor" strokeWidth="18" />
        </svg>
        <div className="relative flex items-end justify-between gap-3">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[12px] font-semibold tracking-[0.04em] text-white/75 uppercase">{plan.label}</span>
            <span className="text-[26px] leading-[1.25] font-bold tracking-[-0.02em] tabular-nums">{plan.big}</span>
          </span>
          <span className="text-right text-[12.5px] text-white/80">{plan.side}</span>
        </div>
        {target > 0 && (
          <div className="relative flex flex-col gap-1.5">
            <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-white/22">
              <span className="block h-full rounded-full bg-white" style={{ width: `${savedPercent}%` }} />
            </span>
            <span className="flex justify-between gap-3 text-[12px] text-white/85 tabular-nums">
              <span>{t("Saved {amount}", { amount: money(saved) })}</span>
              <span>{t("Target {amount}", { amount: money(target) })}</span>
            </span>
          </div>
        )}
      </div>

      {/* Can't fold away what is filled in: clear it to drop it. */}
      {!(showMore && hasExtra) && (
        <button type="button" onClick={() => setShowMore(!showMore)} aria-expanded={showMore} aria-controls="goal-more" className="flex h-8.5 items-center gap-1.5 self-start px-1 text-[13.5px] font-semibold text-emerald hover:text-emerald-hover">
          {showMore ? <Minus className="size-3.75" strokeWidth={2.5} aria-hidden="true" /> : <Plus className="size-3.75" strokeWidth={2.5} aria-hidden="true" />}
          {showMore ? t("Hide reminder and note") : t("Add a reminder or a note")}
        </button>
      )}
      {showMore && (
        <div id="goal-more" className={cn("flex flex-col gap-3.5 rounded-[14px] bg-strip p-3.5", !hasExtra && "-mt-2")}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="goal-remind" className={LABEL}>
              {t("Email me a reminder on")}
            </label>
            <DayInput id="goal-remind" size="md" value={reminderDate} onChange={setReminderDate} min={keptReminder && reminderDate ? reminderDate : today} max={endDate || undefined} placeholder={t("Pick a day")} className={FRAME} />
            <span className="flex flex-wrap items-center gap-x-2 text-[12px] text-ink-muted">
              <span className="min-w-0 break-all">{t("Sent to {email}", { email })}</span>
              {reminderDate && (
                <button type="button" onClick={() => setReminderDate("")} className="font-semibold text-emerald hover:underline">
                  {t("Remove reminder")}
                </button>
              )}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="goal-desc" className={LABEL}>
              {t("Note")}
            </label>
            <Textarea id="goal-desc" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder={t("e.g. Train tickets, hotel for 3 nights")} className={cn(FRAME, "min-h-16 resize-y px-3 py-2.5 leading-normal")} />
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-[10px] bg-expense-soft px-3 py-2.5 text-[13px] text-expense">
          <CircleAlert className="size-3.75 shrink-0" strokeWidth={2.25} aria-hidden="true" />
          {error}
        </p>
      )}
    </PopupDialog>
  );
}

// The savings accounts as cards to pick from, with the arrow keys moving
// between them as in any radio group.
function AccountChoice({ wallets, value, onChange, labelledBy }: { wallets: Account[]; value: string; onChange: (id: string) => void; labelledBy: string }) {
  const { t } = useLocale();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const chosen = wallets.findIndex((item) => item.id === value);

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + wallets.length) % wallets.length;
    onChange(wallets[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid gap-2 sm:grid-cols-2">
      {wallets.map((item, index) => {
        const on = index === chosen;
        return (
          <button
            key={item.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on || (chosen === -1 && index === 0) ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn("flex min-h-14.5 min-w-0 items-center gap-2.5 rounded-[12px] border-[1.5px] px-3 py-2 text-left", on ? "border-emerald bg-emerald-soft" : "border-line bg-surface hover:border-input")}
          >
            <span className={cn("flex size-8.5 shrink-0 items-center justify-center rounded-[10px]", on ? "bg-emerald text-white" : "bg-surface-sunken text-ink-soft")}>
              <Landmark className="size-4.25" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-px">
              <span className="truncate text-[13.5px] font-semibold text-ink">{item.name}</span>
              <span className="truncate text-[11.5px] text-ink-muted tabular-nums">{item.accountNumber || t("Savings account")}</span>
            </span>
            {on && <Check className="size-4 shrink-0 text-emerald" strokeWidth={3} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
