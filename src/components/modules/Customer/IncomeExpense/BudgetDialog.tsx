"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { monthOnlyLabel } from "@/components/modules/Customer/Budget/MonthSwitcher";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { useAmountField } from "@/hooks/useAmountField";
import { saveMonthlyPlanAction } from "@/lib/customer/budgetActions";
import { currencySymbol, formatSignedCurrency } from "@/lib/customer/currency";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { IEDialog } from "./IEDialog";

export interface BudgetDialogState {
  month: number;
  year: number;
  incomeTarget: string;
  expenseBudget: string;
}

interface BudgetDialogProps {
  businessId: string;
  currency: string;
  editing: BudgetDialogState | null;
  // The years the year list offers.
  years: number[];
  onClose: () => void;
  onSaved: (month: number, year: number) => void;
}

const SELECT =
  "h-12 w-full rounded-field border border-input bg-surface px-3 text-body text-ink outline-none transition-[border-color,box-shadow] focus:border-focus-ring focus:focus-halo";

// One money box: the currency sign and the typed amount (Bangla digits and
// grouping accepted, as everywhere money is typed).
function MoneyInput({ id, value, onChange, currency }: { id: string; value: string; onChange: (value: string) => void; currency: string }) {
  const { fmt } = useLocale();
  const field = useAmountField(value, onChange, currency);
  return (
    <Input
      id={id}
      size="md"
      inputMode="decimal"
      placeholder="0"
      {...field}
      leading={<span className="text-title font-semibold text-ink-2">{currencySymbol(currency, fmt)}</span>}
      className="text-title font-semibold tabular-nums"
    />
  );
}

// Budget Planning's "Set monthly budget" popup: the month, its income target
// and expense budget, and the savings the two plan for.
export function BudgetDialog({ businessId, currency, editing, years, onClose, onSaved }: BudgetDialogProps) {
  const { t, fmt } = useLocale();
  const [month, setMonth] = useState(1);
  const [year, setYear] = useState(2026);
  const [target, setTarget] = useState("");
  const [budget, setBudget] = useState("");
  const [isPending, startTransition] = useTransition();

  const [seen, setSeen] = useState<BudgetDialogState | null>(null);
  if (editing !== seen) {
    setSeen(editing);
    if (editing) {
      setMonth(editing.month);
      setYear(editing.year);
      setTarget(editing.incomeTarget);
      setBudget(editing.expenseBudget);
    }
  }

  const targetValue = Number(target) || 0;
  const budgetValue = Number(budget) || 0;
  const planned = targetValue - budgetValue;

  function save() {
    startTransition(async () => {
      const result = await saveMonthlyPlanAction(businessId, { month, year, incomeTarget: targetValue, expenseBudget: budgetValue });
      if (result.success) {
        toast.success(t("Budget saved"));
        onSaved(month, year);
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
      title={t("Set monthly budget")}
      busy={isPending}
      saveLabel="Save budget"
      saveDisabled={targetValue <= 0 || budgetValue <= 0}
      onSubmit={save}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field htmlFor="bud-month" label={<span className="text-body font-medium text-ink">{t("Month")}</span>}>
          <select id="bud-month" value={month} onChange={(event) => setMonth(Number(event.target.value))} className={SELECT}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {monthOnlyLabel(m, fmt)}
              </option>
            ))}
          </select>
        </Field>
        <Field htmlFor="bud-year" label={<span className="text-body font-medium text-ink">{t("Year")}</span>}>
          <select id="bud-year" value={year} onChange={(event) => setYear(Number(event.target.value))} className={SELECT}>
            {years.map((y) => (
              <option key={y} value={y}>
                {toLocaleDigits(String(y), fmt)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field htmlFor="bud-target" label={<span className="text-body font-medium text-ink">{t("Income target ({symbol})", { symbol: currencySymbol(currency, fmt) })}</span>}>
        <MoneyInput id="bud-target" value={target} onChange={setTarget} currency={currency} />
      </Field>
      <Field htmlFor="bud-budget" label={<span className="text-body font-medium text-ink">{t("Expense budget ({symbol})", { symbol: currencySymbol(currency, fmt) })}</span>}>
        <MoneyInput id="bud-budget" value={budget} onChange={setBudget} currency={currency} />
      </Field>
      <div aria-live="polite" className={cn("flex items-center justify-between gap-3 rounded-[12px] px-4 py-3.5", planned < 0 ? "bg-expense-soft" : "bg-income-soft")}>
        <span className="flex flex-col gap-0.5">
          <span className="text-body font-semibold text-ink">{t("Planned savings")}</span>
          <span className="text-caption text-ink-2">{t("Income target − Expense budget")}</span>
        </span>
        <span className={cn("text-[20px] font-bold tabular-nums", planned < 0 ? "text-expense" : "text-income")}>{formatSignedCurrency(planned, currency, fmt)}</span>
      </div>
    </IEDialog>
  );
}
