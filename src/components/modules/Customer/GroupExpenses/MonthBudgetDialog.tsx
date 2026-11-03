"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { useAmountField } from "@/hooks/useAmountField";
import type { GroupMonthlyBudget } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { monthRangeOf, shiftMonth } from "@/lib/customer/groupDisplay";
import { createGroupMonthBudgetAction, deleteGroupMonthBudgetAction, updateGroupMonthBudgetAction } from "@/lib/customer/groupExpensesActions";
import { budgetOf } from "@/lib/customer/groupFamily";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GroupDialog } from "./GroupDialog";

interface MonthBudgetDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
  budgets: GroupMonthlyBudget[];
  // The month it opens on.
  monthKey: string;
  // The months it offers, newest first (next month included).
  choices: string[];
  // What each month has spent, by key.
  spent: Record<string, number>;
}

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (budget: GroupMonthlyBudget) => `${budget.year}-${pad(budget.month)}`;

// A month's budget (the v7 GroupBudget board's dialog): the month, the
// amount -- or last month's in one tap -- and what the month has spent
// against it. Picking a month that has one edits it.
export function MonthBudgetDialog({ open, onClose, businessId, currency, budgets, monthKey, choices, spent }: MonthBudgetDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [month, setMonth] = useState(monthKey);
  const [amount, setAmount] = useState("");
  const amountField = useAmountField(amount, setAmount, currency);
  const [tried, setTried] = useState(false);
  const [isPending, startTransition] = useTransition();

  const existingFor = (key: string) => budgets.find((budget) => keyOf(budget) === key) ?? null;
  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? `open:${monthKey}` : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setMonth(monthKey);
      const found = existingFor(monthKey);
      setAmount(found ? String(Number(found.budgetAmount)) : "");
      setTried(false);
    }
  }

  const existing = existingFor(month);
  const value = Number(amount) || 0;
  const monthSpent = spent[month] ?? 0;
  const previous = budgetOf(budgets, shiftMonth(month, -1));
  const money = (number: number) => formatCurrency(Math.abs(number), currency, fmt);
  const offered = [...new Set([...choices, month])].sort().reverse();

  function pick(next: string) {
    setMonth(next);
    const found = existingFor(next);
    setAmount(found ? String(Number(found.budgetAmount)) : "");
  }

  function save() {
    setTried(true);
    if (!(value > 0) || isPending) return;
    const range = monthRangeOf(month);
    startTransition(async () => {
      const result = await attempt(
        () => (existing ? updateGroupMonthBudgetAction(businessId, existing.id, { budgetAmount: String(value) }) : createGroupMonthBudgetAction(businessId, { month: range.month, year: range.year, budgetAmount: String(value) })),
        t(OFFLINE_MESSAGE),
        t(STALE_MESSAGE),
      );
      if (result.success) {
        toast.success(t("Budget saved"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to save the budget"));
      }
    });
  }

  function remove() {
    if (!existing || isPending) return;
    startTransition(async () => {
      const result = await attempt(() => deleteGroupMonthBudgetAction(businessId, existing.id), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (result.success) {
        toast.success(t("Budget removed"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to remove the budget"));
      }
    });
  }

  return (
    <GroupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={460}
      title={existing ? t("Edit budget") : t("Set budget")}
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      footer={
        <>
          {existing && (
            <Button type="button" variant="ghost" onClick={remove} disabled={isPending} className="mr-auto text-expense hover:bg-expense-soft hover:text-expense">
              {t("Remove")}
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={isPending} className="px-5">
            {isPending && <Loader />}
            {t("Save budget")}
          </Button>
        </>
      }
    >
      <Field htmlFor="bud-month" label={<span className="text-body font-medium text-ink">{t("Month")}</span>}>
        <NativeSelect id="bud-month" size="md" value={month} onChange={(event) => pick(event.target.value)} frameClassName="w-full">
          {offered.map((choice) => {
            const set = budgetOf(budgets, choice);
            return (
              <option key={choice} value={choice}>
                {set !== null ? `${monthName(choice, fmt, "long", true)} · ${money(set)}` : monthName(choice, fmt, "long", true)}
              </option>
            );
          })}
        </NativeSelect>
      </Field>
      <Field htmlFor="bud-amount" label={<span className="text-body font-medium text-ink">{t("Total budget for the month ({symbol})", { symbol: currencySymbol(currency, fmt) })}</span>}>
        <Input
          id="bud-amount"
          size="lg"
          inputMode="decimal"
          {...amountField}
          autoFocus
          placeholder={t("e.g. 65000")}
          invalid={tried && !(value > 0)}
          className="text-h3 font-bold tabular-nums"
          leading={<span className="flex h-12 w-10 items-center justify-center border-r border-line bg-strip text-title font-semibold text-ink-2">{currencySymbol(currency, fmt)}</span>}
          frameClassName="overflow-hidden pl-0"
        />
        {previous !== null && Number(previous) !== value && (
          <button type="button" onClick={() => setAmount(String(previous))} className="mt-2 inline-flex h-6.5 items-center self-start rounded-full border border-mint-200 bg-mint-50 px-3 text-caption font-semibold text-brand-ink hover:bg-mint-200">
            {t("Use last month's budget · {amount}", { amount: money(previous) })}
          </button>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3 rounded-field border border-line bg-strip px-3.5 py-3 text-small tabular-nums">
        <span className="flex flex-col">
          <span className="text-caption text-ink-muted">{t("Spent in this month")}</span>
          <b className="font-bold text-ink">{money(monthSpent)}</b>
        </span>
        <span className="flex flex-col">
          <span className="text-caption text-ink-muted">{value > 0 && monthSpent > value ? t("Over budget") : t("Left")}</span>
          <b className={cn("font-bold", value > 0 && monthSpent > value ? "text-expense" : "text-income")}>{value > 0 ? money(value - monthSpent) : "—"}</b>
        </span>
      </div>
      {tried && !(value > 0) && (
        <p role="alert" className="text-small font-semibold text-expense">
          {t("Enter a budget amount.")}
        </p>
      )}
    </GroupDialog>
  );
}
