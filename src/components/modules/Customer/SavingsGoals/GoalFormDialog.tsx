"use client";

import { Mail, Target } from "lucide-react";
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
import Textarea from "@/components/smartly/form/Textarea";
import type { Account, SavingsGoal } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { createSavingsGoalAction, type SavingsGoalFormInput, updateSavingsGoalAction } from "@/lib/customer/savingsGoalActions";
import { monthsBetween, savingsError } from "@/lib/customer/savingsDisplay";
import { monthsToGo } from "@/lib/customer/savingsPlan";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { SavingsDialog } from "./SavingsDialog";

interface GoalFormDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  editing: SavingsGoal | null;
  currency: string;
  today: string;
  // Where the reminder email goes.
  email: string;
  // Active savings wallets: where money already saved can be kept.
  wallets: Account[];
  onAddWallet: () => void;
}

// New or edited savings goal (design: SavingsDashboard's New goal popup):
// what for, how much, what is already saved and where it sits, the end
// date and an optional reminder day -- with what is left and the monthly
// amount it works out to.
export function GoalFormDialog({ open, onClose, businessId, editing, currency, today, email, wallets, onAddWallet }: GoalFormDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [have, setHave] = useState("");
  const [haveIn, setHaveIn] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Fill the form the moment it opens, or switches to another goal.
  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setName(editing?.name ?? "");
      setTargetAmount(editing ? String(Number(editing.targetAmount)) : "");
      setHave("");
      setHaveIn(wallets[0]?.id ?? "");
      setEndDate(editing?.targetDate.slice(0, 10) ?? "");
      setReminderDate(editing?.reminderDate?.slice(0, 10) ?? "");
      setDescription(editing?.description ?? "");
      setError("");
    }
  }

  const target = Number(targetAmount) || 0;
  const saved = editing ? Number(editing.currentAmount) : Number(have) || 0;
  const leftToSave = Math.max(0, target - saved);
  const months = endDate && endDate > today ? monthsToGo(endDate, today) : 0;
  const perMonth = months > 0 ? Math.ceil(leftToSave / months) : 0;
  const wallet = wallets.find((item) => item.id === haveIn) ?? wallets[0];
  // An edited goal may keep a day that has gone by (an overdue goal, a
  // reminder that went out); a changed one must come after today.
  const keptEnd = !!editing && endDate === editing.targetDate.slice(0, 10);
  const keptReminder = !!editing && reminderDate === (editing.reminderDate?.slice(0, 10) ?? "");

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
    const reminder = reminderDate ? ` ${t("Reminder email on {date}.", { date: formatDate(reminderDate, "d MMM yyyy", fmt) })}` : "";
    startTransition(async () => {
      const result = editing ? await updateSavingsGoalAction(businessId, editing.id, editInput(editing)) : await createSavingsGoalAction(businessId, createInput());
      if (!result.success) {
        setError(savingsError(result.message, "Failed to save goal", t, currency, fmt));
        return;
      }
      if (editing) toast.success(`${t("{name} was updated.", { name: goalName })}${reminder}`);
      else
        toast.success(
          `${t("{name} was created.", { name: goalName })} ${leftToSave > 0 ? t("{left} left to save, about {amount} a month.", { left: money(leftToSave), amount: money(perMonth) }) : t("The full target is already saved.")}${reminder}`,
        );
      onClose();
      router.refresh();
    });
  }

  function createInput(): SavingsGoalFormInput {
    return {
      name: name.trim(),
      targetAmount: target,
      targetDate: endDate,
      durationMonths: monthsBetween(today, endDate),
      reminderDate: reminderDate || undefined,
      reminderChannel: reminderDate ? "EMAIL" : undefined,
      description: description.trim() || undefined,
      ...(saved > 0 && wallet && { startAmount: saved, startAccountId: wallet.id }),
    };
  }

  // Everything the form shows, so a cleared description or reminder is
  // cleared. The duration goes only with a new date, measured from the day
  // the goal began (the backend's monthly figure is paced from then).
  function editInput(goal: SavingsGoal): Partial<SavingsGoalFormInput> {
    return {
      name: name.trim(),
      targetAmount: target,
      ...(!keptEnd && { targetDate: endDate, durationMonths: monthsBetween(goal.startDate, endDate) }),
      reminderDate: reminderDate || null,
      reminderChannel: reminderDate ? "EMAIL" : null,
      description: description.trim(),
    };
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text} {optional && <span className="font-normal text-ink-muted">({t("optional")})</span>}
    </span>
  );
  const hint = !target
    ? { head: t("Add a target and an end date"), sub: t("We work out what is left and how much to put aside each month.") }
    : leftToSave === 0
      ? { head: t("Already saved the full target"), sub: t("It will be marked Completed.") }
      : months > 0
        ? {
            head: fillNodes(t("Save about {amount} a month"), { amount: <b className="font-bold">{money(perMonth)}</b> }),
            sub: t(months === 1 ? "{left} left, over {count} month, to reach {target} by {date}" : "{left} left, over {count} months, to reach {target} by {date}", {
              left: money(leftToSave),
              count: formatCount(months, fmt),
              target: money(target),
              date: formatDate(endDate, "d MMM yyyy", fmt),
            }),
          }
        : { head: t("{amount} left to save", { amount: money(leftToSave) }), sub: t("Pick an end date to see the monthly amount.") };
  const savedPercent = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;

  return (
    <SavingsDialog
      open={open}
      onClose={onClose}
      width={560}
      busy={isPending}
      onSubmit={submit}
      title={editing ? t("Edit {name}", { name: editing.name }) : t("New savings goal")}
      sub={t("A bank deposit, a phone, a trip: anything you want to save for.")}
      footer={
        <>
          <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending && <Loader size={16} onDark label={t("Loading...")} />}
            {editing ? t("Save changes") : t("Create goal")}
          </Button>
        </>
      }
    >
      <Field htmlFor="goal-name" label={label(t("Goal name"))}>
        <Input id="goal-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={80} placeholder={t("e.g. Family trip to Sylhet")} />
      </Field>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <Field htmlFor="goal-target" label={label(t("Target amount"))}>
          <AmountInput id="goal-target" value={targetAmount} onChange={setTargetAmount} currency={currency} size="lg" />
        </Field>
        {editing ? (
          <div className="flex min-w-0 flex-col gap-1.5">
            {label(t("Saved so far"))}
            <span className="flex h-12 items-center rounded-field bg-surface-sunken px-3.5 text-[18px] font-bold text-ink-2 tabular-nums">{money(saved)}</span>
          </div>
        ) : (
          <Field
            htmlFor="goal-have"
            label={
              <span className="text-body font-medium text-ink">
                {t("Already saved")} <span className="font-normal text-ink-muted">({t("if any")})</span>
              </span>
            }
          >
            <AmountInput id="goal-have" value={have} onChange={setHave} currency={currency} size="lg" />
          </Field>
        )}
      </div>

      {!editing && saved > 0 && wallets.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-md border border-line bg-strip px-3.5 py-3">
          <label htmlFor="goal-have-in" className="text-body font-medium text-ink">
            {t("Where is this {amount} now?", { amount: money(saved) })}
          </label>
          <NativeSelect id="goal-have-in" size="md" value={wallet?.id ?? ""} onChange={(event) => setHaveIn(event.target.value)}>
            {wallets.map((item) => (
              <option key={item.id} value={item.id}>{`${item.name} · ${money(item.currentBalance)}`}</option>
            ))}
          </NativeSelect>
          <span className="text-caption text-ink-muted">{t("Pick the savings account that holds this money today.")}</span>
        </div>
      )}
      {!editing && saved > 0 && wallets.length === 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-warning-soft px-3.5 py-3 text-small text-warning-ink">
          <span className="min-w-0 flex-1">{t("To record money you already have, add a savings account first. You can also leave Already saved empty for now.")}</span>
          <button type="button" onClick={onAddWallet} className="h-9 rounded-full border border-warning bg-surface px-3 text-[12.5px] font-semibold text-warning-ink pointer-coarse:h-11">
            {t("Add account")}
          </button>
        </div>
      )}

      <div className="grid gap-2.5 sm:grid-cols-2">
        <Field htmlFor="goal-end" label={label(t("End date"))}>
          <DayInput id="goal-end" size="md" value={endDate} onChange={setEndDate} min={keptEnd ? endDate : today} placeholder={t("Pick a day")} />
        </Field>
        <Field htmlFor="goal-remind" label={label(t("Reminder date"), true)}>
          <DayInput id="goal-remind" size="md" value={reminderDate} onChange={setReminderDate} min={keptReminder && reminderDate ? reminderDate : today} max={endDate || undefined} placeholder={t("Pick a day")} />
        </Field>
      </div>
      <p className="-mt-1.5 flex items-center gap-2 text-[12.5px] text-ink-2">
        <Mail className="size-3.5 shrink-0" aria-hidden="true" />
        <span>
          {fillNodes(t("Reminder goes by email to {email}, the email on your profile."), { email: <b className="font-semibold text-ink">{email}</b> })}
          {reminderDate && (
            <button type="button" onClick={() => setReminderDate("")} className="ml-2 font-semibold text-emerald hover:underline">
              {t("Remove reminder")}
            </button>
          )}
        </span>
      </p>

      <div className="flex flex-col gap-2.5 rounded-md bg-mint-50 px-4 py-3.5">
        <div className="flex items-center gap-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-field bg-surface text-emerald">
            <Target className="size-4.5" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-body text-ink">{hint.head}</span>
            <span className="text-caption text-ink-2">{hint.sub}</span>
          </span>
        </div>
        {target > 0 && (
          <div className="flex flex-col gap-1.5">
            <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-surface">
              <span className="block h-full rounded-full bg-emerald" style={{ width: `${savedPercent}%` }} />
            </span>
            <span className="flex flex-wrap justify-between gap-x-3 text-caption text-ink-2 tabular-nums">
              <span>{fillNodes(t("Saved {amount}"), { amount: <b>{money(saved)}</b> })}</span>
              <span>{fillNodes(t("Left to save {amount}"), { amount: <b>{money(leftToSave)}</b> })}</span>
              <span>{fillNodes(t("Target {amount}"), { amount: <b>{money(target)}</b> })}</span>
            </span>
          </div>
        )}
      </div>

      <Field htmlFor="goal-desc" label={label(t("Description"), true)}>
        <Textarea id="goal-desc" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder={t("e.g. Train tickets, hotel for 3 nights")} className="resize-none px-3" />
      </Field>

      {error && (
        <p role="alert" className="text-small text-expense">
          {error}
        </p>
      )}
    </SavingsDialog>
  );
}
