"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { GroupMonthlyBudget } from "@/lib/customer/api";
import { currencySymbol } from "@/lib/customer/currency";
import { monthRangeOf, shiftMonth } from "@/lib/customer/groupDisplay";
import { createGroupMonthBudgetAction, deleteGroupMonthBudgetAction, updateGroupMonthBudgetAction } from "@/lib/customer/groupExpensesActions";
import { monthName } from "@/lib/customer/insights";
import { normalizeMoneyInput } from "@/lib/customer/money";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface MonthBudgetDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
  budgets: GroupMonthlyBudget[];
  // The month being viewed: the default for a new budget.
  monthKey: string;
  editing: GroupMonthlyBudget | null;
}

const pad = (n: number) => String(n).padStart(2, "0");

// A month's budget: the month and the amount, with the warning at 90%.
export function MonthBudgetDialog({ open, onClose, businessId, currency, budgets, monthKey, editing }: MonthBudgetDialogProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [month, setMonth] = useState(monthKey);
  const [amount, setAmount] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? `create:${monthKey}`) : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setMonth(editing ? `${editing.year}-${pad(editing.month)}` : monthKey);
      setAmount(editing ? String(Number(editing.budgetAmount)) : "");
    }
  }

  // Next month, this one and the ten before it.
  const choices = Array.from({ length: 12 }, (_, i) => shiftMonth(monthKey, 1 - i));
  const taken = !editing && budgets.some((b) => `${b.year}-${pad(b.month)}` === month);
  const value = Number(amount) || 0;
  const valid = value > 0 && !taken;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    const range = monthRangeOf(month);
    startTransition(async () => {
      const result = editing ? await updateGroupMonthBudgetAction(businessId, editing.id, { budgetAmount: String(value) }) : await createGroupMonthBudgetAction(businessId, { month: range.month, year: range.year, budgetAmount: String(value) });
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
    if (!editing || isPending) return;
    startTransition(async () => {
      const result = await deleteGroupMonthBudgetAction(businessId, editing.id);
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
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-110 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
            <AlertDialogTitle className="text-h3 text-ink">{editing ? t("Edit budget") : t("Set a monthly budget")}</AlertDialogTitle>
            <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
          <AlertDialogDescription className="px-6 pt-4 text-small text-ink-muted">{t("The group is warned at 90% used and shown in red once over.")}</AlertDialogDescription>

          <div className="flex flex-col gap-4 px-6 py-4">
            <Field htmlFor="bud-month" label={<span className="text-body font-medium text-ink">{t("Month")}</span>} error={taken ? t("That month already has a budget. Edit it instead.") : undefined}>
              <NativeSelect id="bud-month" size="md" value={month} onChange={(event) => setMonth(event.target.value)} disabled={!!editing} frameClassName="w-full" invalid={taken}>
                {choices.map((keyChoice) => (
                  <option key={keyChoice} value={keyChoice}>
                    {monthName(keyChoice, locale, "long", true)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field htmlFor="bud-amount" label={<span className="text-body font-medium text-ink">{t("Budget")}</span>}>
              <Input
                id="bud-amount"
                size="lg"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(normalizeMoneyInput(event.target.value))}
                autoFocus
                placeholder="65,000"
                className="text-h3 font-bold tabular-nums"
                leading={<span className="flex h-12 w-10 items-center justify-center border-r border-line bg-cream text-title font-semibold text-ink-2">{currencySymbol(currency)}</span>}
                frameClassName="overflow-hidden pl-0"
              />
            </Field>
          </div>

          <div className="flex items-center gap-3 border-t border-line bg-cream px-6 py-4">
            {editing && (
              <Button type="button" variant="ghost" onClick={remove} disabled={isPending} className="text-expense hover:bg-expense-soft hover:text-expense">
                {t("Remove")}
              </Button>
            )}
            <span className="flex-1" />
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader />}
              {editing ? t("Save changes") : t("Set budget")}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
