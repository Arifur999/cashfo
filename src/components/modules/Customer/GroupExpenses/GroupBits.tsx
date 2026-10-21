"use client";

import { X } from "lucide-react";
import { createElement } from "react";
import Chip from "@/components/smartly/Chip";
import type { GroupExpenseCategoryOption } from "@/lib/customer/api";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The small pieces the group tabs share.

// "+ ৳ 578  Gets back" / "− ৳ 351  Has to pay" / "৳ 0  Settled". Stacked,
// the chip goes under the figure, so a narrow column still fits it.
export function BalanceCell({ value, currency, stacked = false, className }: { value: number; currency: string; stacked?: boolean; className?: string }) {
  const { t } = useLocale();
  const even = Math.abs(value) < 0.005;
  const up = value > 0;
  return (
    <span className={cn("flex justify-end", stacked ? "flex-col items-end gap-1" : "items-center gap-2", className)}>
      <span className={cn("font-bold whitespace-nowrap tabular-nums", even ? "text-ink" : up ? "text-income" : "text-expense")}>{even ? formatCurrency(0, currency) : formatSignedCurrency(value, currency)}</span>
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
      <span className={cn("text-h3 tabular-nums md:text-h2", tone)}>{value}</span>
    </div>
  );
}

// The X in a drawer's or a dialog's head: 44px under a finger. Disabled
// while a save runs, as Cancel and Escape are, so a save that fails still
// finds its drawer open (below md the X is the only way out).
export function CloseX({ onClick, disabled = false, className }: { onClick: () => void; disabled?: boolean; className?: string }) {
  const { t } = useLocale();
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={t("Close")} className={cn("flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken disabled:pointer-events-none disabled:opacity-50 pointer-coarse:size-11", className)}>
      <X className="size-4.5" aria-hidden="true" />
    </button>
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

// The Settlement tab's "Settle up" heading: the close dialog's "Record
// payments first" brings focus there.
export const SETTLE_UP_ID = "group-settle-up";

// The focus ring of a card that wraps a visually hidden radio or checkbox:
// the card shows it, since the input itself can't be seen.
export const FOCUS_WITHIN = "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus-ring)";
