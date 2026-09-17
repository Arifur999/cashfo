"use client";

import type { CategoryBreakdown } from "@/lib/api";
import { budgetCategoryColorClass, budgetCategoryHex } from "@/lib/budgetCategoryVisuals";
import { formatCurrency } from "@/lib/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface CategoryDonutCardProps {
  title: string;
  breakdown: CategoryBreakdown;
  currency: string;
  totalLabel: string;
}

// A donut ring via conic-gradient (same technique as Savings Goals'
// ProgressRing), extended to one wedge per category instead of just a
// two-tone progress/track split. The top-10 list's own percents are
// against the TRUE total (see CategoryBreakdown's comment), so they don't
// necessarily sum to 100 -- the leftover ring space renders as a neutral
// "Other" wedge (uncategorized + everything past the top 10) rather than
// silently stopping short.
export function CategoryDonutCard({ title, breakdown, currency, totalLabel }: CategoryDonutCardProps) {
  const { t } = useLocale();
  const OTHER_COLOR = "#d4d4d4";
  let cumulative = 0;
  const stops = breakdown.categories.map((c) => {
    const from = cumulative;
    cumulative = Math.min(100, cumulative + c.percent);
    return `${budgetCategoryHex(c.color)} ${from}% ${cumulative}%`;
  });
  if (cumulative < 100) stops.push(`${OTHER_COLOR} ${cumulative}% 100%`);
  const gradient = breakdown.categories.length > 0 ? `conic-gradient(${stops.join(", ")})` : `conic-gradient(${OTHER_COLOR} 0% 100%)`;

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
      <h2 className="mb-4 text-sm font-semibold text-neutral-900">{t(title)}</h2>

      <div className="flex justify-center">
        <div className="relative flex h-40 w-40 items-center justify-center rounded-full" style={{ background: gradient }}>
          <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-surface text-center">
            <span className="text-xl font-bold tabular-nums text-neutral-900">{formatCurrency(breakdown.total, currency)}</span>
            <span className="text-xs text-neutral-400">{t(totalLabel)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {breakdown.categories.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-400">{t("No activity in this range.")}</p>
        ) : (
          breakdown.categories.map((c) => (
            <div key={c.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-neutral-700">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${budgetCategoryColorClass(c.color)}`} />
                {c.name}
              </span>
              <span className="tabular-nums text-neutral-600">
                {formatCurrency(c.amount, currency)} <span className="text-neutral-400">({c.percent}%)</span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
