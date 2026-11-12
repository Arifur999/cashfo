"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import type { GroupExpenseCategoryOption } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { updateGroupExpenseCategoryAction } from "@/lib/customer/groupExpensesActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CategoryTile } from "./GroupBits";
import { GroupDialog } from "./GroupDialog";

interface CategoryLimitDialogProps {
  businessId: string;
  currency: string;
  categories: GroupExpenseCategoryOption[];
  // The category being limited, and what it spent in the month on show.
  category: GroupExpenseCategoryOption | null;
  spent: number;
  onClose: () => void;
}

// A category's monthly limit (the v16 GroupBudget board): the same every
// month, empty for none, with what the month spent and has left.
export function CategoryLimitDialog({ businessId, currency, categories, category, spent, onClose }: CategoryLimitDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const money = (value: number) => formatCurrency(Math.abs(value), currency, fmt);

  // Each time it opens, the category's own limit.
  const [prevId, setPrevId] = useState<string | null>(null);
  if ((category?.id ?? null) !== prevId) {
    setPrevId(category?.id ?? null);
    setAmount(category?.monthlyLimit ? String(Number(category.monthlyLimit)) : "");
    setError("");
  }

  const text = amount.replace(/,/g, "").trim();
  const value = text ? Number(text) : 0;
  const bad = !!text && (!/^\d{1,12}(\.\d{1,2})?$/.test(text) || value <= 0);
  const left = value - spent;

  function save(limit: number | null) {
    if (!category || isPending) return;
    if (limit !== null && bad) return setError(t("Enter an amount above 0, with at most two decimals."));
    const current = category.monthlyLimit ? Number(category.monthlyLimit) : null;
    if (limit === current) return onClose();
    const target = category;
    startTransition(async () => {
      const result = await attempt(() => updateGroupExpenseCategoryAction(businessId, target.id, { monthlyLimit: limit }), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (!result.success) {
        toast.error(result.message ?? t("Failed to save the limit"));
        return;
      }
      toast.success(limit === null ? t("Limit removed from {name}", { name: target.name }) : t("{name} limited to {amount} a month", { name: target.name, amount: money(limit) }));
      onClose();
      router.refresh();
    });
  }

  return (
    <GroupDialog
      open={category !== null}
      onClose={onClose}
      busy={isPending}
      width={440}
      lead={category ? <CategoryTile name={category.name} categories={categories} size={36} /> : null}
      title={
        <span className="block truncate">
          {t("Monthly limit · ")}
          {category?.name}
        </span>
      }
      bodyClassName="gap-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        save(text ? value : null);
      }}
      footer={
        <>
          {category?.monthlyLimit && (
            <button type="button" onClick={() => save(null)} disabled={isPending} className="mr-auto h-11 rounded-full px-3 text-[13.5px] font-semibold text-expense hover:bg-expense-soft">
              {t("Remove limit")}
            </button>
          )}
          <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={isPending} className="px-4.5">
            {t("Cancel")}
          </Button>
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending && <Loader />}
            {t("Save limit")}
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-ink-2">{t("Monthly limit")}</span>
        <span className="relative flex items-center">
          <span className="pointer-events-none absolute left-3.5 text-body text-ink-muted">{currencySymbol(currency, fmt)}</span>
          <input
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setError("");
            }}
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            placeholder={t("No limit")}
            aria-invalid={bad || !!error || undefined}
            className={cn("h-11.5 w-full rounded-[12px] border bg-surface pr-3 pl-9 text-[15px] font-semibold text-ink tabular-nums outline-none focus:border-focus-ring focus:focus-halo", bad || error ? "border-expense" : "border-input")}
          />
        </span>
        <span className="text-caption text-ink-muted">{t("Same limit every month. Leave it empty for no limit.")}</span>
        {error && (
          <span role="alert" className="text-[12.5px] text-expense">
            {error}
          </span>
        )}
      </label>
      <div className="flex flex-col gap-1.5 rounded-[12px] bg-hover px-3.5 py-3 text-[13px] tabular-nums">
        <span className="flex justify-between">
          <span className="text-ink-muted">{t("Spent this month")}</span>
          <span className="font-semibold text-ink">{money(spent)}</span>
        </span>
        <span className="flex justify-between">
          <span className="text-ink-muted">{value > 0 && left < 0 ? t("Over the limit") : t("Left")}</span>
          <span className={cn("font-bold", value <= 0 ? "text-ink-faint" : left < 0 ? "text-expense" : "text-tint-green-ink")}>{value > 0 ? money(left) : "–"}</span>
        </span>
      </div>
    </GroupDialog>
  );
}
