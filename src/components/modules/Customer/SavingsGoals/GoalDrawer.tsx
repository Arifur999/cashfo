"use client";

import { Bell, Info, Target, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/modules/Customer/Books/shared/Drawer";
import AmountInput from "@/components/modules/Customer/Shared/AmountInput";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import Textarea from "@/components/smartly/form/Textarea";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { SavingsGoal, SavingsReminderChannel } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { createSavingsGoalAction, type SavingsGoalFormInput, updateSavingsGoalAction } from "@/lib/customer/savingsGoalActions";
import { monthsBetween, monthsLeft, savingsError } from "@/lib/customer/savingsDisplay";
import { toDateInputValue } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface GoalDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  editing: SavingsGoal | null;
  currency: string;
  today: string;
}

// New or edited savings goal, in the design's 460px drawer (the shared
// frame): what for, how much, by when -- with the monthly amount that works
// out to -- plus an optional reminder and a note.
export function GoalDrawer({ open, onClose, businessId, editing, currency, today }: GoalDrawerProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderChannel, setReminderChannel] = useState<SavingsReminderChannel>("EMAIL");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  // Populate the instant the drawer opens, or switches to another goal.
  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setName(editing?.name ?? "");
      setTargetAmount(editing ? String(Number(editing.targetAmount)) : "");
      setTargetDate(editing?.targetDate.slice(0, 10) ?? "");
      setReminderDate(editing?.reminderDate?.slice(0, 10) ?? "");
      setReminderChannel(editing?.reminderChannel ?? "EMAIL");
      setDescription(editing?.description ?? "");
    }
  }

  const target = Number(targetAmount) || 0;
  const saved = editing ? Number(editing.currentAmount) : 0;
  // A new goal saves the whole target; an edited one only what is left of it.
  const toSave = Math.max(0, target - saved);
  // At least one month, so a target date this month still gives a figure.
  const months = targetDate ? Math.max(1, monthsLeft(targetDate, today)) : 0;
  const monthly = months > 0 ? toSave / months : 0;
  const valid = name.trim().length > 0 && target > 0 && targetDate.length > 0;
  // The earliest day each date field takes: today, or the day an edited goal
  // already has when that has gone by (an overdue goal, a reminder day that
  // passed). Under its min the date input would block the submit, so such a
  // goal couldn't be renamed or given a new target without a new date too.
  const minDay = (kept?: string | null) => (kept && kept.slice(0, 10) < today ? kept.slice(0, 10) : today);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const result = editing ? await updateSavingsGoalAction(businessId, editing.id, editInput(editing)) : await createSavingsGoalAction(businessId, createInput());
      if (!result.success) {
        toast.error(savingsError(result.message, "Failed to save goal", t, currency, fmt));
        return;
      }
      toast.success(editing ? t("Goal updated") : t("Goal created"));
      onClose();
      router.refresh();
    });
  }

  function createInput(): SavingsGoalFormInput {
    return {
      name: name.trim(),
      targetAmount: target,
      targetDate,
      durationMonths: monthsBetween(today, targetDate),
      reminderDate: reminderDate || undefined,
      reminderChannel: reminderDate ? reminderChannel : undefined,
      description: description.trim() || undefined,
    };
  }

  // Everything the form shows, so a cleared description or reminder is
  // cleared (left out, the backend would keep the old one). The target always
  // goes: on it the backend opens a Completed goal again when the new target
  // is more than is saved, and completes one it now reaches. The duration
  // goes only with a new date, measured from the day the goal began: the
  // backend paces the goal from then, so counting from today would raise
  // the monthly target and flip an on-track goal to At risk.
  function editInput(goal: SavingsGoal): Partial<SavingsGoalFormInput> {
    const dateChanged = targetDate !== goal.targetDate.slice(0, 10);
    return {
      name: name.trim(),
      targetAmount: target,
      ...(dateChanged && { targetDate, durationMonths: monthsBetween(toDateInputValue(goal.createdAt) || today, targetDate) }),
      reminderDate: reminderDate || null,
      reminderChannel: reminderDate ? reminderChannel : null,
      description: description.trim(),
    };
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text} {optional && <span className="font-normal text-ink-muted">({t("optional")})</span>}
    </span>
  );

  // The preview's second line: how many months, to save how much, by when.
  const monthsText = (forms: { one: string; many: string }, amount: number) => t(months === 1 ? forms.one : forms.many, { count: formatCount(months, fmt), amount: formatCurrency(amount, currency, fmt), date: formatDate(targetDate, undefined, fmt) });

  return (
    <Drawer
      open={open}
      width={460}
      title={editing ? t("Edit goal") : t("New savings goal")}
      description={t("What are you saving for, and by when?")}
      busy={isPending}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={!valid || isPending} className="px-4.5">
            {isPending && <Loader size={16} onDark label={t("Loading...")} />}
            {editing ? t("Save changes") : t("Create goal")}
          </Button>
        </>
      }
    >
      {/* The board's 18px between fields. */}
      <div className="flex flex-col gap-4.5">
        <Field htmlFor="goal-name" label={label(t("Goal name"))}>
          <Input id="goal-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={80} placeholder={t("Family trip to Sylhet")} />
        </Field>

        <div className="grid items-start gap-2.5 md:grid-cols-[minmax(0,1fr)_170px]">
          <Field htmlFor="goal-target" label={label(t("Target amount"))}>
            <AmountInput id="goal-target" value={targetAmount} onChange={setTargetAmount} currency={currency} size="lg" />
          </Field>
          <Field htmlFor="goal-date" label={label(t("Reach it by"))}>
            <DayInput id="goal-date" size="lg" value={targetDate} onChange={setTargetDate} min={minDay(editing?.targetDate)} placeholder={t("Pick a day")} />
          </Field>
        </div>

        {target > 0 && months > 0 && (
          <div className="flex items-center gap-3.5 rounded-md bg-mint-50 px-4 py-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-field bg-surface text-emerald">
              <Target className="size-4.5" aria-hidden="true" />
            </span>
            {toSave > 0 ? (
              <span className="flex flex-col gap-0.5">
                <span className="text-body text-ink">{fillNodes(t("Save about {amount} a month"), { amount: <b className="font-bold">{formatCurrency(Math.ceil(monthly), currency, fmt)}</b> })}</span>
                <span className="text-caption font-normal text-ink-2">
                  {editing
                    ? monthsText({ one: "for {count} month to save the {amount} left by {date}", many: "for {count} months to save the {amount} left by {date}" }, toSave)
                    : monthsText({ one: "for {count} month to reach {amount} by {date}", many: "for {count} months to reach {amount} by {date}" }, target)}
                </span>
              </span>
            ) : (
              <span className="text-body text-ink">{fillNodes(t("Already reached with {amount} saved"), { amount: <b className="font-bold">{formatCurrency(saved, currency, fmt)}</b> })}</span>
            )}
          </div>
        )}

        <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
          <legend className="mb-2 text-body leading-[normal] font-medium text-ink">
            {t("Reminder")} <span className="font-normal text-ink-muted">({t("optional")})</span>
          </legend>
          <div className="grid gap-2.5 md:grid-cols-[170px_minmax(0,1fr)]">
            {/* The board's pill with a bell; once a day is set, an x in it
                takes the reminder off (the date field can't be emptied by itself). */}
            <div className="relative flex min-w-0">
              <DayInput
                size="md"
                value={reminderDate}
                onChange={setReminderDate}
                min={minDay(editing?.reminderDate)}
                aria-label={t("Reminder date")}
                placeholder={t("Pick a day")}
                icon={<Bell className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />}
                className={cn("min-w-0 flex-1 rounded-full", reminderDate && "pr-9")}
              />
              {reminderDate && (
                <button type="button" onClick={() => setReminderDate("")} aria-label={t("Remove reminder")} title={t("Remove reminder")} className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink">
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
            {/* A channel means nothing until there is a day to remind on. */}
            <SegmentedControl
              options={[
                { value: "EMAIL", label: t("Email") },
                { value: "PHONE", label: t("SMS") },
              ]}
              value={reminderChannel}
              onChange={setReminderChannel}
              label={t("Remind me by")}
              size="lg"
              stretch
              disabled={!reminderDate}
              className="min-w-0"
            />
          </div>
          <span className="flex items-center gap-1.5 text-caption font-normal text-ink-muted">
            <Info className="size-3.25 shrink-0" aria-hidden="true" />
            {t("Saved for later. The app doesn't send email or SMS reminders yet.")}
          </span>
        </fieldset>

        <Field htmlFor="goal-desc" label={label(t("Description"), true)}>
          <Textarea id="goal-desc" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder={t("e.g. Train tickets, hotel for 3 nights, tea garden visit")} className="resize-none px-3" />
        </Field>
      </div>
    </Drawer>
  );
}
