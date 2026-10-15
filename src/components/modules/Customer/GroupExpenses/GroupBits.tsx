"use client";

import { createElement } from "react";
import Chip from "@/components/smartly/Chip";
import type { GroupExpenseCategoryOption } from "@/lib/customer/api";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The small pieces the group tabs share.

// "+ ৳ 578  Gets back" / "− ৳ 351  Has to pay" / "৳ 0  Settled".
export function BalanceCell({ value, currency, className }: { value: number; currency: string; className?: string }) {
  const { t } = useLocale();
  const even = Math.abs(value) < 0.005;
  const up = value > 0;
  return (
    <span className={cn("flex items-center justify-end gap-2", className)}>
      <span className={cn("font-bold tabular-nums", even ? "text-ink" : up ? "text-income" : "text-expense")}>{even ? formatCurrency(0, currency) : formatSignedCurrency(value, currency)}</span>
      <Chip tone={even ? "neutral" : up ? "income" : "expense"} size="sm">
        {t(even ? "Settled" : up ? "Gets back" : "Has to pay")}
      </Chip>
    </span>
  );
}

// One figure on a strip across the top of a tab.
export function Figure({ label, value, tone = "text-ink", divided = true }: { label: React.ReactNode; value: React.ReactNode; tone?: string; divided?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-0.5 pr-5", divided && "border-r border-line")}>
      <span className="text-caption font-normal text-ink-muted">{label}</span>
      <span className={cn("text-h3 tabular-nums md:text-[22px] md:leading-7", tone)}>{value}</span>
    </div>
  );
}

// A category's icon on its soft tile.
export function CategoryTile({ name, categories, size = 26 }: { name: string; categories: GroupExpenseCategoryOption[]; size?: 24 | 26 | 28 }) {
  const option = categories.find((c) => c.name === name);
  const tone = categoryTone(option?.color);
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-sm", size === 24 ? "size-6 [&_svg]:size-3.5" : size === 28 ? "size-7 [&_svg]:size-4" : "size-6.5 [&_svg]:size-3.5", tone.bg, tone.fg)}>
      {option?.icon ? createElement(budgetCategoryIcon(option.icon), {}) : <span className="size-2 rounded-full bg-current" />}
    </span>
  );
}

// The bar colour of a category, for the spend rows.
export function categoryBarClass(name: string, categories: GroupExpenseCategoryOption[]): string {
  return categoryTone(categories.find((c) => c.name === name)?.color).fg;
}
