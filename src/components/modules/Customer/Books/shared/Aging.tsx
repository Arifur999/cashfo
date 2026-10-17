"use client";

import { TONE_BG } from "@/components/smartly/tones";
import type { AgingShare } from "@/lib/customer/booksDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface AgingBarProps {
  shares: AgingShare[];
  className?: string;
}

// The four age buckets as one stacked bar; empty when nothing is owed.
export function AgingBar({ shares, className }: AgingBarProps) {
  const { t } = useLocale();
  return (
    <div className={cn("flex h-3.5 overflow-hidden rounded-full bg-surface-sunken", className)} role="img" aria-label={shares.map((share) => `${t(share.label)} ${share.pct}%`).join(", ")}>
      {shares
        .filter((share) => share.pct > 0)
        .map((share) => (
          <div key={share.key} title={t(share.label)} className={cn("h-full", TONE_BG[share.tone])} style={{ width: `${share.pct}%` }} />
        ))}
    </div>
  );
}

interface AgingLegendProps {
  shares: AgingShare[];
  currency: string;
  // Rows with a square dot, or four small tiles.
  variant?: "rows" | "tiles";
}

// Each bucket with its amount, under the bar.
export function AgingLegend({ shares, currency, variant = "rows" }: AgingLegendProps) {
  const { t } = useLocale();
  if (variant === "tiles") {
    return (
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {shares.map((share) => (
          <div key={share.key} className="flex flex-col gap-0.5 rounded-md bg-cream px-4 py-3">
            <span className="flex items-center gap-2 text-caption text-ink-muted">
              <span aria-hidden="true" className={cn("size-2 rounded-[2px]", TONE_BG[share.tone])} />
              {t(share.label)}
            </span>
            <b className="text-body-lg font-bold text-ink tabular-nums">{formatCurrency(share.amount, currency)}</b>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {shares.map((share) => (
        <div key={share.key} className="flex items-center gap-3 text-small">
          <span aria-hidden="true" className={cn("size-2.5 rounded-[3px]", TONE_BG[share.tone])} />
          <span className="flex-1 text-ink-2">{t(share.label)}</span>
          <b className="text-ink tabular-nums">{formatCurrency(share.amount, currency)}</b>
        </div>
      ))}
    </div>
  );
}
