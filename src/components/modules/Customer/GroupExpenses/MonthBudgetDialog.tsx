"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Input from "@/components/smartly/form/Input";
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
  // Apply to the months after it too (up to next month).
  const [alsoLater, setAlsoLater] = useState(false);
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
      setAlsoLater(false);
    }
  }

  const existing = existingFor(month);
  const value = Number(amount) || 0;
  const monthSpent = spent[month] ?? 0;
  const previous = budgetOf(budgets, shiftMonth(month, -1));
  const money = (number: number) => formatCurrency(Math.abs(number), currency, fmt);
  // The months after this one the page offers (next month at most).
  const later = choices.filter((key) => key > month).sort();
  const laterSpan = later.length === 0 ? "" : later.length === 1 ? monthName(later[0], fmt, "long", true) : t("{from} to {to}", { from: monthName(later[0], fmt, "long", true), to: monthName(later[later.length - 1], fmt, "long", true) });
  const monthLong = monthName(month, fmt, "long", true);

  function save() {
    setTried(true);
    if (!(value > 0) || isPending) return;
    // This month, and the later ones when asked: each one set or changed.
    const targets = [month, ...(alsoLater ? later : [])];
    startTransition(async () => {
      let result: { success: boolean; message?: string } = { success: true };
      for (const target of targets) {
        const found = existingFor(target);
        const parts = monthRangeOf(target);
        result = await attempt(
          () => (found ? updateGroupMonthBudgetAction(businessId, found.id, { budgetAmount: String(value) }) : createGroupMonthBudgetAction(businessId, { month: parts.month, year: parts.year, budgetAmount: String(value) })),
          t(OFFLINE_MESSAGE),
          t(STALE_MESSAGE),
        );
        if (!result.success) break;
      }
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
      width={480}
      title={t("Budget for {month}", { month: monthLong })}
      bodyClassName="gap-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      footer={
        <>
          {existing && (
            <button type="button" onClick={remove} disabled={isPending} className="mr-auto h-11 rounded-full px-3 text-[13.5px] font-semibold text-expense hover:bg-expense-soft">
              {t("Remove budget")}
            </button>
          )}
          <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={isPending} className="px-4.5">
            {t("Cancel")}
          </Button>
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending && <Loader />}
            {t("Save budget")}
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-ink-2">{t("Total budget for {month}", { month: monthLong })}</span>
        <Input id="bud-amount" size="md" inputMode="decimal" {...amountField} autoFocus placeholder={t("e.g. 65000")} invalid={tried && !(value > 0)} className="text-[15px] font-semibold tabular-nums" leading={<span className="text-body text-ink-muted">{currencySymbol(currency, fmt)}</span>} frameClassName="h-11.5 rounded-[12px]" />
        {tried && !(value > 0) && (
          <span role="alert" className="text-[12.5px] text-expense">
            {t("Enter a budget amount.")}
          </span>
        )}
      </label>
      {previous !== null && Number(previous) !== value && (
        <button type="button" onClick={() => setAmount(String(previous))} className="h-9 self-start rounded-full border border-input bg-surface px-3.5 text-[13px] font-semibold text-ink hover:bg-hover">
          {t("Same as last month · {amount}", { amount: money(previous) })}
        </button>
      )}
      {later.length > 0 && (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-[12px] border border-line px-3.5 py-3">
          <input type="checkbox" checked={alsoLater} onChange={(event) => setAlsoLater(event.target.checked)} className="mt-px size-4.5 accent-emerald" />
          <span className="flex flex-col gap-0.5">
            <span className="text-[13.5px] font-semibold text-ink">{t("Apply to next months too")}</span>
            <span className="text-caption text-ink-muted">{t("Also sets it for {months}.", { months: laterSpan })}</span>
          </span>
        </label>
      )}
      <div className="flex flex-col gap-1.5 rounded-[12px] bg-hover px-3.5 py-3 text-[13px] tabular-nums">
        <span className="flex justify-between">
          <span className="text-ink-muted">{t("Spent in {month}", { month: monthLong })}</span>
          <span className="font-semibold text-ink">{money(monthSpent)}</span>
        </span>
        <span className="flex justify-between">
          <span className="text-ink-muted">{value > 0 && monthSpent > value ? t("Over budget") : t("Left")}</span>
          <span className={cn("font-bold", value <= 0 ? "text-ink-faint" : monthSpent > value ? "text-expense" : "text-tint-green-ink")}>{value > 0 ? money(value - monthSpent) : "–"}</span>
        </span>
      </div>
    </GroupDialog>
  );
}
