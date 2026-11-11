"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { monthLabel, monthOnlyLabel } from "@/components/modules/Customer/Budget/MonthSwitcher";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { useAmountField } from "@/hooks/useAmountField";
import type { MonthlyPlan } from "@/lib/customer/api";
import { deleteMonthlyPlanAction, saveMonthlyPlanAction } from "@/lib/customer/budgetActions";
import { currencySymbol, formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import type { YearMonth } from "@/lib/customer/period";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { IEDialog } from "./IEDialog";

export interface BudgetDialogState {
  month: number;
  year: number;
  incomeTarget: string;
  expenseBudget: string;
  // Editing that month's plan (its month stays), not setting a new one.
  existing: boolean;
}

interface BudgetDialogProps {
  businessId: string;
  currency: string;
  editing: BudgetDialogState | null;
  // Every month planned, newest first: a month that has one, and the last
  // plan's amounts to copy.
  plans: MonthlyPlan[];
  current: YearMonth;
  onClose: () => void;
  onSaved: (month: YearMonth) => void;
}

const SELECT =
  "h-12 w-full cursor-pointer rounded-field border bg-surface px-3 text-body text-ink outline-none transition-[border-color,box-shadow] focus:border-focus-ring focus:focus-halo";

const same = (a: YearMonth, b: YearMonth) => a.month === b.month && a.year === b.year;

// One money box: the currency sign and the typed amount (Bangla digits and
// grouping accepted, as everywhere money is typed).
function MoneyInput({ id, value, onChange, currency, invalid }: { id: string; value: string; onChange: (value: string) => void; currency: string; invalid: boolean }) {
  const { fmt } = useLocale();
  const field = useAmountField(value, onChange, currency);
  return (
    <Input
      id={id}
      size="lg"
      inputMode="decimal"
      placeholder="0"
      invalid={invalid}
      {...field}
      leading={<span className="text-title font-semibold text-ink-soft">{currencySymbol(currency, fmt)}</span>}
      className="text-title font-semibold tabular-nums"
    />
  );
}

// Budget Planning's "Set monthly budget" popup (design: BudgetDialog): the
// month, its income target and expense budget, and the savings the two plan
// for. A month that has a plan already is said, with a way to edit that one;
// an empty form can take the last plan's amounts. An edit may pick another
// month: the plan moves there.
export function BudgetDialog({ businessId, currency, editing, plans, current, onClose, onSaved }: BudgetDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [month, setMonth] = useState(current.month);
  const [year, setYear] = useState(current.year);
  const [target, setTarget] = useState("");
  const [budget, setBudget] = useState("");
  // The plan being edited, when it is one.
  const [editingPlan, setEditingPlan] = useState<YearMonth | null>(null);
  const [errors, setErrors] = useState<{ target?: boolean; budget?: boolean }>({});
  const [isPending, startTransition] = useTransition();

  const [seen, setSeen] = useState<BudgetDialogState | null>(null);
  if (editing !== seen) {
    setSeen(editing);
    if (editing) {
      setMonth(editing.month);
      setYear(editing.year);
      setTarget(editing.incomeTarget);
      setBudget(editing.expenseBudget);
      setEditingPlan(editing.existing ? { month: editing.month, year: editing.year } : null);
      setErrors({});
    }
  }

  const picked = { month, year };
  const pickedLabel = monthLabel(month, year, fmt);
  // Another month's plan already standing where this one would go.
  const clash = plans.find((plan) => same(plan, picked) && !(editingPlan && same(editingPlan, plan)));
  // The newest plan other than this one, for "Use October 2026's amounts".
  const last = plans.find((plan) => !editingPlan || !same(plan, editingPlan));
  const years = [...new Set([current.year - 1, current.year, current.year + 1, ...plans.map((plan) => plan.year)])].sort();

  const targetValue = Number(target) || 0;
  const budgetValue = Number(budget) || 0;
  const planned = targetValue - budgetValue;
  const atLeast = t("Enter an amount of at least {amount}.", { amount: formatCurrency(1, currency, fmt) });

  // "Edit that plan": the form becomes that month's plan.
  function editClash() {
    if (!clash) return;
    setTarget(clash.incomeTarget ? String(Number(clash.incomeTarget)) : "");
    setBudget(clash.expenseBudget ? String(Number(clash.expenseBudget)) : "");
    setEditingPlan({ month: clash.month, year: clash.year });
    setErrors({});
  }

  function save() {
    if (isPending || clash) return;
    const missing = { target: targetValue < 1, budget: budgetValue < 1 };
    if (missing.target || missing.budget) {
      setErrors(missing);
      return;
    }
    const wasPlan = editingPlan !== null;
    const moved = editingPlan && !same(editingPlan, picked) ? { fromMonth: editingPlan.month, fromYear: editingPlan.year } : {};
    // What the toast's Undo puts back: the plan as it was (in its own month),
    // or no plan at all.
    const before = editingPlan ? plans.find((plan) => same(plan, editingPlan)) : undefined;
    startTransition(async () => {
      const result = await saveMonthlyPlanAction(businessId, { month, year, incomeTarget: targetValue, expenseBudget: budgetValue, ...moved });
      if (result.success) {
        const savedId = result.data?.id ?? null;
        const undo = before
          ? () =>
              saveMonthlyPlanAction(businessId, {
                month: before.month,
                year: before.year,
                incomeTarget: Number(before.incomeTarget ?? 0),
                expenseBudget: Number(before.expenseBudget ?? 0),
                ...(!same(before, picked) && { fromMonth: month, fromYear: year }),
              })
          : savedId
            ? () => deleteMonthlyPlanAction(businessId, savedId)
            : null;
        toast.success(wasPlan ? t("Plan updated") : t("Budget saved for {month}", { month: pickedLabel }), {
          ...(undo && {
            action: {
              label: t("Undo"),
              onClick: async () => {
                const back = await undo();
                if (back.success) {
                  toast.success(t("Change undone"));
                  router.refresh();
                } else {
                  toast.error(t(back.message ?? "Couldn't undo the change"));
                }
              },
            },
          }),
        });
        onSaved(picked);
        onClose();
      } else {
        toast.error(t(result.message ?? "Failed to save the budget"));
      }
    });
  }

  return (
    <IEDialog
      open={editing !== null}
      onClose={onClose}
      title={editingPlan ? t("Edit {month} plan", { month: monthLabel(editingPlan.month, editingPlan.year, fmt) }) : t("Set monthly budget")}
      busy={isPending}
      saveLabel={editingPlan ? "Save changes" : "Save budget"}
      onSubmit={save}
      bodyClassName="gap-4"
    >
      <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-3">
          <Field htmlFor="bud-month" label={<span className="text-body font-medium text-ink">{t("Month")}</span>}>
            <select
              id="bud-month"
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              aria-invalid={clash ? true : undefined}
              aria-describedby={clash ? "bud-clash" : undefined}
              className={cn(SELECT, clash ? "border-expense" : "border-input")}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {monthOnlyLabel(m, fmt)}
                </option>
              ))}
            </select>
          </Field>
          <Field htmlFor="bud-year" label={<span className="text-body font-medium text-ink">{t("Year")}</span>}>
            <select
              id="bud-year"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              aria-invalid={clash ? true : undefined}
              aria-describedby={clash ? "bud-clash" : undefined}
              className={cn(SELECT, clash ? "border-expense" : "border-input")}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {toLocaleDigits(String(y), fmt)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {clash && (
          <div id="bud-clash" role="alert" className="flex items-center justify-between gap-2.5 rounded-field bg-expense-soft/50 px-3 py-2.5 text-small text-expense">
            <span>{t("{month} already has a plan.", { month: pickedLabel })}</span>
            <button type="button" onClick={editClash} className="h-7.5 shrink-0 rounded-full border border-expense-line bg-surface px-3 text-[12.5px] font-semibold whitespace-nowrap text-expense hover:bg-expense-soft">
              {t("Edit that plan")}
            </button>
          </div>
        )}
      </div>
      {last && !target && !budget && (
        <button
          type="button"
          onClick={() => {
            setTarget(last.incomeTarget ? String(Number(last.incomeTarget)) : "");
            setBudget(last.expenseBudget ? String(Number(last.expenseBudget)) : "");
            setErrors({});
          }}
          className="-mt-1.5 self-start rounded-sm text-small font-semibold text-emerald hover:underline"
        >
          {t("Use {month}'s amounts", { month: monthLabel(last.month, last.year, fmt) })}
        </button>
      )}
      <Field
        htmlFor="bud-target"
        label={<span className="text-body font-medium text-ink">{t("Income target ({symbol})", { symbol: currencySymbol(currency, fmt) })}</span>}
        error={errors.target ? atLeast : undefined}
      >
        <MoneyInput
          id="bud-target"
          value={target}
          onChange={(value) => {
            setTarget(value);
            setErrors((current) => ({ ...current, target: false }));
          }}
          currency={currency}
          invalid={!!errors.target}
        />
      </Field>
      <Field
        htmlFor="bud-budget"
        label={<span className="text-body font-medium text-ink">{t("Expense budget ({symbol})", { symbol: currencySymbol(currency, fmt) })}</span>}
        error={errors.budget ? atLeast : undefined}
      >
        <MoneyInput
          id="bud-budget"
          value={budget}
          onChange={(value) => {
            setBudget(value);
            setErrors((current) => ({ ...current, budget: false }));
          }}
          currency={currency}
          invalid={!!errors.budget}
        />
      </Field>
      <div aria-live="polite" className={cn("flex items-center justify-between gap-3 rounded-[12px] px-4 py-3.5", planned < 0 ? "bg-expense-soft/50" : "bg-success-soft/50")}>
        <span className="flex flex-col gap-0.5">
          <span className="text-body font-semibold text-ink">{t("Planned savings")}</span>
          <span className={cn("text-caption", planned < 0 ? "text-expense" : "text-ink-soft")}>{t(planned < 0 ? "Your budget is more than your income target" : "Income target − Expense budget")}</span>
        </span>
        <span className={cn("text-[20px] font-bold whitespace-nowrap tabular-nums", planned < 0 ? "text-expense" : "text-tint-green-ink")}>{planned < 0 ? formatSignedCurrency(planned, currency, fmt) : formatCurrency(planned, currency, fmt)}</span>
      </div>
    </IEDialog>
  );
}
