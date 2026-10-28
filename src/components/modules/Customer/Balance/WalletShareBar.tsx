"use client";

import { formatCurrency } from "@/lib/customer/currency";
import { shareBarLabel, sharePercent, type WalletShare } from "@/lib/customer/walletShares";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface WalletShareBarProps {
  slices: WalletShare[];
  // What the bar shows, already translated; each wallet's share is added to
  // it for screen readers.
  label: string;
  size?: "sm" | "md";
  // The names, amounts and percentages under the bar.
  legend?: boolean;
  currency?: string;
  className?: string;
}

// How the balance is spread across the wallets: one slice per wallet, the
// biggest first. Grey when there is nothing to share out yet. Percentages
// are in the reader's digits.
export function WalletShareBar({ slices, label, size = "md", legend = false, currency = "BDT", className }: WalletShareBarProps) {
  const { fmt } = useLocale();
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div role="img" aria-label={shareBarLabel(label, slices, fmt)} className={cn("flex overflow-hidden rounded-full bg-surface-sunken", size === "md" ? "h-3 gap-0.75" : "h-2.5")}>
        {slices.map((slice) => (
          <span key={slice.id} className={cn("h-full", slice.bar)} style={{ width: `${slice.share}%` }} />
        ))}
      </div>
      {legend && slices.length > 0 && (
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {slices.map((slice) => (
            <li key={slice.id} className="flex items-center gap-2 text-small">
              <span aria-hidden="true" className={cn("size-2.5 rounded-[3px]", slice.bar)} />
              <span className="text-ink-2">{slice.name}</span>
              <span className="font-semibold text-ink tabular-nums">{formatCurrency(slice.amount, currency, fmt)}</span>
              <span className="text-ink-muted tabular-nums">{sharePercent(slice.share, fmt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
