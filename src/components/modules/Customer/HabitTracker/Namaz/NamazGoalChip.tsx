"use client";

import { Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { actionError, latinDigits } from "@/lib/customer/habitDisplay";
import { setTrackerGoalAction } from "@/lib/customer/habitsActions";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The dashboard header's "Goal: 90% prayed" (NamazDashboard), which opens to
// change or clear it; a month without one offers "Set a goal" in its place,
// since this month's sheet opens on its own, with no Create month to set it.
export function NamazGoalChip({ trackerId, goalPct }: { trackerId: string; goalPct: number | null }) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();

  const chip = goalPct !== null ? t("Goal: {pct}% prayed", { pct: formatCount(goalPct, fmt) }) : t("Set a goal");

  function save(next: number | null) {
    startTransition(async () => {
      const result = await setTrackerGoalAction(trackerId, next);
      if (result.success) {
        setOpen(false);
        router.refresh();
      } else {
        toast.error(actionError(result.message, "Failed to save the goal", t, fmt));
      }
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const typed = Number(latinDigits(value.trim()));
    if (!Number.isInteger(typed) || typed < 1 || typed > 100) return setError(true);
    save(typed);
  }

  const look = cn("inline-flex h-6.5 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold", goalPct !== null ? "bg-warning-soft text-warning" : "border border-dashed border-input text-ink-muted hover:border-ink-faint hover:text-ink");

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setValue(goalPct !== null ? String(goalPct) : "");
          setError(false);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" className={cn(look, "print:hidden")} aria-label={goalPct !== null ? `${chip} · ${t("Change the goal")}` : chip}>
          {goalPct === null && <Target className="size-3.5" strokeWidth={2} aria-hidden="true" />}
          {chip}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-68 p-3.5">
        <form onSubmit={submit} className="flex flex-col gap-2.5">
          <label htmlFor="namaz-goal" className="text-[13px] font-semibold text-ink-2">
            {t("Goal")} <span className="font-normal text-ink-muted">{t("(% of prayers)")}</span>
          </label>
          <input
            id="namaz-goal"
            autoFocus
            type="text"
            inputMode="numeric"
            maxLength={3}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(false);
            }}
            placeholder={t("e.g. 90")}
            aria-invalid={error || undefined}
            className={cn("h-10 rounded-sm border bg-surface px-3 text-body text-ink outline-none focus:border-emerald", error ? "border-expense-fill" : "border-input")}
          />
          {error && (
            <span role="alert" className="text-caption text-expense-fill">
              {t("A goal is a whole number from 1 to 100.")}
            </span>
          )}
          <span className="flex items-center justify-between gap-2">
            {goalPct !== null ? (
              <button type="button" onClick={() => save(null)} disabled={isPending} className="text-small font-semibold text-ink-muted hover:text-expense disabled:opacity-50">
                {t("Remove the goal")}
              </button>
            ) : (
              <span />
            )}
            <button type="submit" disabled={isPending} className="inline-flex h-8.5 items-center gap-1.5 rounded-sm bg-emerald px-3.5 text-small font-semibold text-on-action hover:bg-emerald-hover disabled:opacity-60">
              {isPending && <Loader />}
              {t("Save")}
            </button>
          </span>
        </form>
      </PopoverContent>
    </Popover>
  );
}
