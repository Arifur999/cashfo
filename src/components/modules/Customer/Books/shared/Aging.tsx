"use client";

import { TONE_BG } from "@/components/smartly/tones";
import type { AgingShare } from "@/lib/customer/booksDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface AgingBarProps {
  shares: AgingShare[];
  className?: string;
}

// The age buckets as one stacked bar; empty when nothing is owed.
export function AgingBar({ shares, className }: AgingBarProps) {
  const { t, locale } = useLocale();
  return (
    <div className={cn("flex h-3.5 overflow-hidden rounded-full bg-surface-sunken", className)} role="img" aria-label={shares.map((share) => `${t(share.label)} ${toLocaleDigits(`${share.pct}%`, locale)}`).join(", ")}>
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
  // Rows with a square dot, or small tiles.
  variant?: "rows" | "tiles";
}

// Each bucket with its amount, under the bar. The tiles sit two by two and
// go four across only where the legend itself is wide enough (a container
// query, so a half-width card keeps two); a long figure wraps, never cut.
export function AgingLegend({ shares, currency, variant = "rows" }: AgingLegendProps) {
  const { t, locale } = useLocale();
  if (variant === "tiles") {
    return (
      <div className="@container">
        <div className="grid grid-cols-2 gap-2 @[40rem]:grid-cols-4">
          {shares.map((share) => (
            <div key={share.key} className="flex min-w-0 flex-col gap-0.5 rounded-md bg-strip px-3 py-2.5 sm:px-4 sm:py-3">
              <span className="flex items-center gap-2 text-caption text-ink-muted">
                <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-xs", TONE_BG[share.tone])} />
                {t(share.label)}
              </span>
              <b className="text-body font-bold text-ink tabular-nums wrap-anywhere @[40rem]:text-body-lg">{formatCurrency(share.amount, currency, locale)}</b>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {shares.map((share) => (
        <div key={share.key} className="flex items-center gap-3 text-small">
          <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-[3px]", TONE_BG[share.tone])} />
          <span className="flex-1 text-ink-2">{t(share.label)}</span>
          <b className="text-ink tabular-nums">{formatCurrency(share.amount, currency, locale)}</b>
        </div>
      ))}
    </div>
  );
}
