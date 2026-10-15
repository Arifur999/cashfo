"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { createElement, useId, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Account } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { walletIcon } from "@/lib/customer/walletVisuals";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export interface WalletPickerProps {
  label: string;
  // 56px in the transaction drawer, 52px in the loan one.
  size?: "lg" | "xl";
  wallets: Account[];
  value: string;
  onChange: (id: string) => void;
  // The wallet's balance once this entry is saved.
  after: number | null;
  currency: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

// The wallet to pay from or into: its icon, name, balance now and after.
export function WalletPicker({ label, size = "xl", wallets, value, onChange, after, currency, loading, error, onClose }: WalletPickerProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const selected = wallets.find((w) => w.id === value);
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      <label id={`${id}-label`} className="text-body font-medium text-ink">
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-labelledby={`${id}-label`}
            aria-haspopup="listbox"
            disabled={loading || wallets.length === 0}
            className={cn("flex items-center gap-3 rounded-md border border-line-strong bg-surface px-4 text-left disabled:opacity-60 data-open:border-emerald data-open:shadow-[0_0_0_3px_rgba(31,122,90,0.18)]", size === "xl" ? "h-14" : "h-13")}
          >
            {selected ? (
              <>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-mint-50 text-emerald">{createElement(walletIcon(selected), { className: "size-4", "aria-hidden": true })}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-body font-semibold text-ink">{selected.name}</span>
                  <span className="truncate text-caption font-normal text-ink-muted tabular-nums">
                    {t("Balance")} {formatCurrency(selected.currentBalance, currency)}
                    {after !== null && ` · ${formatCurrency(after, currency)} ${t("after this")}`}
                  </span>
                </span>
              </>
            ) : (
              <span className="flex-1 text-body text-ink-muted">{loading ? t("Loading...") : t("No wallet yet")}</span>
            )}
            <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) gap-0 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
          <ul role="listbox" aria-labelledby={`${id}-label`} className="flex max-h-72 flex-col overflow-y-auto">
            {wallets.map((wallet) => {
              const on = wallet.id === value;
              return (
                <li key={wallet.id} role="option" aria-selected={on}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(wallet.id);
                      setOpen(false);
                    }}
                    className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-cream", on && "bg-mint-50")}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-mint-50 text-emerald">{createElement(walletIcon(wallet), { className: "size-4", "aria-hidden": true })}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-body font-semibold text-ink">{wallet.name}</span>
                      <span className="text-caption font-normal text-ink-muted tabular-nums">{formatCurrency(wallet.currentBalance, currency)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>
      {!loading && error && (
        <p role="alert" className="text-caption text-expense">
          {t(error)}
        </p>
      )}
      {!loading && !error && wallets.length === 0 && (
        <p className="text-caption text-ink-muted">
          {t("No wallet yet.")}{" "}
          <Link href="/balance/wallet" onNavigate={onClose} className="font-semibold text-emerald hover:underline">
            {t("Add a wallet")}
          </Link>
        </p>
      )}
    </div>
  );
}
