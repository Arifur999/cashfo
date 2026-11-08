"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import type { HabitMonthTracker } from "@/lib/customer/api";
import { actionError, latinDigits } from "@/lib/customer/habitDisplay";
import { createHabitTrackerAction } from "@/lib/customer/habitsActions";
import { monthName } from "@/lib/customer/insights";
import { MONTH_NAMES } from "@/lib/customer/namazDisplay";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface EarlierMonthDialogProps {
  open: boolean;
  onClose: () => void;
  existing: HabitMonthTracker[];
  // "YYYY-MM" of the current month.
  currentMonth: string;
  // Which month it starts on: the latest earlier one without a sheet (Namaz
  // Home's "Add earlier month"), or the next one (the dashboard).
  start?: "earlier" | "later";
  // Where to go once it is made; the new sheet by default.
  onCreated?: (tracker: HabitMonthTracker, key: string) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");
const LABEL = "text-[13px] font-semibold text-ink-2";

// The NamazDashboard board's "Create month": a month and a year (the year
// before this one to the year after), and an optional goal -- the share of
// its prayers to aim for. A month that already has a sheet says so.
export function EarlierMonthDialog({ open, onClose, existing, currentMonth, start = "later", onCreated }: EarlierMonthDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [thisYear, thisMonth] = currentMonth.split("-").map(Number);
  const years = [thisYear - 1, thisYear, thisYear + 1];
  const taken = (key: string) => existing.some((tracker) => `${tracker.year}-${pad(tracker.month ?? 0)}` === key);
  // The first month without a sheet, walking back (or on) from this one.
  const firstFree = () => {
    for (let i = 1; i <= 24; i++) {
      const d = new Date(Date.UTC(thisYear, thisMonth - 1 + (start === "earlier" ? -i : i), 1));
      const key = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
      if (!taken(key) && years.includes(d.getUTCFullYear())) return key;
    }
    return currentMonth;
  };
  const [key, setKey] = useState(currentMonth);
  const [goal, setGoal] = useState("");
  const [goalError, setGoalError] = useState(false);

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setKey(firstFree());
      setGoal("");
      setGoalError(false);
    }
  }

  const [year, month] = key.split("-").map(Number);
  const name = monthName(key, fmt, "long", true);
  const exists = taken(key);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (exists || isPending) return;
    const typed = latinDigits(goal.trim());
    const goalPct = typed ? Number(typed) : null;
    if (goalPct !== null && (!Number.isInteger(goalPct) || goalPct < 1 || goalPct > 100)) {
      setGoalError(true);
      return;
    }
    startTransition(async () => {
      const result = await createHabitTrackerAction({ category: "Namaz", month, year, goalPct });
      if (result.success && result.data) {
        toast.success(t("{month} created", { month: name }));
        onClose();
        if (onCreated) onCreated(result.data, key);
        else router.push(`/habit-tracker/habits/namaz/${result.data.id}`);
      } else {
        toast.error(actionError(result.message, "Failed to add the month", t, fmt));
      }
    });
  }

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      onSubmit={submit}
      plain
      width={420}
      className="rounded-[14px]"
      bodyClassName="gap-3.5 p-5.5"
      titleClassName="text-[17px] font-semibold"
      title={t("Create month")}
      sub={<span className="text-small text-ink-muted">{t("Make a sheet for a month you want to track or fill in later.")}</span>}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="rounded-sm">
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={exists || isPending} className="rounded-sm">
            {isPending && <Loader />}
            {t("Create {month}", { month: name })}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2.5">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t("Month")}</span>
          <NativeSelect size="md" value={pad(month)} onChange={(event) => setKey(`${year}-${event.target.value}`)} frameClassName="w-full rounded-sm">
            {MONTH_NAMES.map((word, index) => (
              <option key={word} value={pad(index + 1)}>
                {t(word)}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t("Year")}</span>
          <NativeSelect size="md" value={String(year)} onChange={(event) => setKey(`${event.target.value}-${pad(month)}`)} frameClassName="w-full rounded-sm">
            {years.map((each) => (
              <option key={each} value={each}>
                {toLocaleDigits(String(each), fmt)}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>
          {t("Goal")} <span className="font-normal text-ink-muted">{t("(optional, % of prayers)")}</span>
        </span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={3}
          value={goal}
          onChange={(event) => {
            setGoal(event.target.value);
            setGoalError(false);
          }}
          placeholder={t("e.g. 90")}
          aria-invalid={goalError || undefined}
          className={cn("h-10.5 rounded-sm border bg-surface px-3 text-body text-ink outline-none focus:border-emerald", goalError ? "border-expense-fill" : "border-input")}
        />
        {goalError && (
          <span role="alert" className="text-caption text-expense-fill">
            {t("A goal is a whole number from 1 to 100.")}
          </span>
        )}
      </label>
      {exists && <span className="text-small font-semibold text-expense">{t("{month} already exists. Pick it from the month picker.", { month: name })}</span>}
    </PopupDialog>
  );
}
