"use client";

import { CalendarDays, Info, PiggyBank, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import Textarea from "@/components/smartly/form/Textarea";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { SavingsGoal, SavingsReminderChannel } from "@/lib/customer/api";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { normalizeMoneyInput } from "@/lib/customer/money";
import { createSavingsGoalAction, updateSavingsGoalAction } from "@/lib/customer/savingsGoalActions";
import { monthsLeft } from "@/lib/customer/savingsDisplay";
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

// New or edited savings goal: what for, how much, by when -- with the
// monthly amount that works out to -- plus an optional reminder and a note.
export function GoalDrawer({ open, onClose, businessId, editing, currency, today }: GoalDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
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
  // At least one month, so a target date this month still gives a figure.
  const months = targetDate ? Math.max(1, monthsLeft(targetDate, today)) : 0;
  const monthly = months > 0 ? target / months : 0;
  const valid = name.trim().length > 0 && target > 0 && targetDate.length > 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const input = {
        name: name.trim(),
        targetAmount: target,
        targetDate,
        durationMonths: months,
        reminderDate: reminderDate || undefined,
        reminderChannel: reminderDate ? reminderChannel : undefined,
        description: description.trim() || undefined,
      };
      const result = editing ? await updateSavingsGoalAction(businessId, editing.id, input) : await createSavingsGoalAction(businessId, input);
      if (result.success) {
        toast.success(editing ? t("Goal updated") : t("Goal created"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to save goal"));
      }
    });
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text} {optional && <span className="font-normal text-ink-muted">({t("optional")})</span>}
    </span>
  );

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-115 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] data-[side=right]:sm:max-w-115" : "h-[92vh] rounded-t-xl")}
      >
        <SheetHeader className={cn("flex-row items-start justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <div className="flex flex-col gap-1">
            <SheetTitle className="text-h3 text-ink">{editing ? t("Edit goal") : t("New savings goal")}</SheetTitle>
            <p className="text-small text-ink-muted">{t("What are you saving for, and by when?")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <Field htmlFor="goal-name" label={label(t("Goal name"))}>
              <Input id="goal-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={80} placeholder={t("Family trip to Sylhet")} />
            </Field>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_170px]">
              <Field htmlFor="goal-target" label={label(t("Target amount"))}>
                <Input
                  id="goal-target"
                  type="text"
                  inputMode="decimal"
                  size="lg"
                  value={targetAmount}
                  onChange={(event) => setTargetAmount(normalizeMoneyInput(event.target.value))}
                  placeholder="0"
                  leading={<span className="flex h-12 w-11 items-center justify-center border-r border-line bg-cream text-h3 font-semibold text-ink-2">{currencySymbol(currency)}</span>}
                  frameClassName="gap-0 overflow-hidden pl-0"
                  className="pl-3 text-h3 font-bold tabular-nums"
                />
              </Field>
              <Field htmlFor="goal-date" label={label(t("Reach it by"))}>
                <Input id="goal-date" type="date" size="lg" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} min={today} leading={<CalendarDays />} className="px-0" frameClassName="px-3" />
              </Field>
            </div>

            {target > 0 && months > 0 && (
              <div className="flex items-center gap-4 rounded-lg bg-mint-50 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface text-emerald">
                  <PiggyBank className="size-5" aria-hidden="true" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-body text-ink">
                    {t("Save about")} <b className="font-bold">{formatCurrency(Math.ceil(monthly), currency)} {t("a month")}</b>
                  </span>
                  <span className="text-caption font-normal text-ink-2">
                    {t("for")} {months} {t(months === 1 ? "month" : "months")} {t("to reach")} {formatCurrency(target, currency)} {t("by")} {formatDate(targetDate)}
                  </span>
                </span>
              </div>
            )}

            <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
              <legend className="mb-2 text-body font-medium text-ink">
                {t("Reminder")} <span className="font-normal text-ink-muted">({t("optional")})</span>
              </legend>
              <div className="grid gap-3 md:grid-cols-[170px_minmax(0,1fr)]">
                <Input type="date" size="md" value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} min={today} aria-label={t("Reminder date")} leading={<CalendarDays />} className="px-0" frameClassName="px-3" />
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
                />
              </div>
              <span className="flex items-center gap-2 text-caption font-normal text-ink-muted">
                <Info className="size-3.5 shrink-0" aria-hidden="true" />
                {t("Saved for later. The app doesn't send email or SMS reminders yet.")}
              </span>
            </fieldset>

            <Field htmlFor="goal-desc" label={label(t("Description"), true)}>
              <Textarea id="goal-desc" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder={t("e.g. Train tickets, hotel for 3 nights, tea garden visit")} className="resize-none px-3" />
            </Field>
          </div>

          <div className={cn("flex items-center justify-end gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 pt-3 pb-6")}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="action" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {editing ? t("Save changes") : t("Create goal")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
