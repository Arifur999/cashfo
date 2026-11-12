"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { formatCurrency } from "@/lib/customer/currency";
import { updateGroupSettingsAction } from "@/lib/customer/groupExpensesActions";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GroupDialog } from "./GroupDialog";

interface BudgetWarnDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
  // The warning now (null: never), and this month's budget for the example.
  current: number | null;
  budget: number | null;
}

const CHOICES = [80, 90, 100] as const;

// When the budget bar turns amber (the v16 GroupBudget board's popup): 80,
// 90 or 100 percent, never, or a number of one's own from 50 to 100.
export function BudgetWarnDialog({ open, onClose, businessId, currency, current, budget }: BudgetWarnDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [never, setNever] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setNever(current === null);
      setValue(current === null ? "" : String(current));
    }
  }

  const number = Number(value);
  const valid = never || (/^\d{2,3}$/.test(value) && number >= 50 && number <= 100);

  function save() {
    if (!valid || isPending) return;
    const next = never ? null : number;
    if (next === current) return onClose();
    startTransition(async () => {
      const result = await attempt(() => updateGroupSettingsAction(businessId, { budgetWarnPercent: next }), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (!result.success) return void toast.error(result.message ?? t("Failed to save the settings"));
      toast.success(next === null ? t("No budget warning") : t("Warns at {percent}%", { percent: formatCount(next, fmt) }));
      onClose();
      router.refresh();
    });
  }

  const chip = (on: boolean) => cn("h-10.5 rounded-[10px] text-body font-semibold", on ? "border-[1.5px] border-emerald bg-emerald-wash text-emerald" : "border border-line bg-surface text-ink-2 hover:border-mint-200");

  return (
    <GroupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={420}
      title={t("Warn me when spending reaches")}
      bodyClassName="gap-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      footer={
        <>
          <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={isPending} className="px-4.5">
            {t("Cancel")}
          </Button>
          <Button type="submit" size="lg" disabled={!valid || isPending}>
            {isPending && <Loader />}
            {t("Save")}
          </Button>
        </>
      }
    >
      <span className="text-[13px] leading-normal text-ink-soft">{t("The budget bar turns amber on every page once spending reaches this share of the budget.")}</span>
      <div role="radiogroup" aria-label={t("Warn me when spending reaches")} className="grid grid-cols-4 gap-2">
        {CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            role="radio"
            aria-checked={!never && number === choice}
            onClick={() => {
              setNever(false);
              setValue(String(choice));
            }}
            className={chip(!never && number === choice)}
          >
            {formatCount(choice, fmt)}%
          </button>
        ))}
        <button type="button" role="radio" aria-checked={never} onClick={() => setNever(true)} className={chip(never)}>
          {t("Never")}
        </button>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-ink-2">{t("Or type your own (50 to 100)")}</span>
        <span className="relative flex items-center">
          <input
            value={never ? "" : value}
            onChange={(event) => {
              setNever(false);
              setValue(event.target.value.replace(/\D/g, "").slice(0, 3));
            }}
            inputMode="numeric"
            maxLength={3}
            aria-invalid={(!never && !valid) || undefined}
            className={cn("h-11.5 w-full rounded-[12px] border bg-surface pr-9 pl-3.5 text-body text-ink outline-none focus:border-focus-ring focus:focus-halo", !never && !valid ? "border-expense" : "border-input")}
          />
          <span className="pointer-events-none absolute right-3.5 text-body text-ink-muted">%</span>
        </span>
        {!never && !valid && value && (
          <span role="alert" className="text-[12.5px] text-expense">
            {t("Use a number from 50 to 100.")}
          </span>
        )}
      </label>
      {!never && valid && budget !== null && (
        <span className="text-[12.5px] text-ink-2">{t("With a {budget} budget, the warning shows at {amount}.", { budget: formatCurrency(budget, currency, fmt), amount: formatCurrency(Math.round((budget * number) / 100), currency, fmt) })}</span>
      )}
    </GroupDialog>
  );
}
