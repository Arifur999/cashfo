"use client";

import { Check, ChevronDown, PiggyBank } from "lucide-react";
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
  // Money wallets, or the savings wallets a goal is kept in.
  variant?: "money" | "savings";
  wallets: Account[];
  // Savings wallets offered under the money wallets (buying or selling an
  // asset can use either).
  savingsWallets?: Account[];
  value: string;
  onChange: (id: string) => void;
  // The wallet's balance once this entry is saved.
  after: number | null;
  // Wallets holding less than this are greyed out ("not enough").
  minBalance?: number;
  currency: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

// The wallet to pay from or into: its icon, name, balance now and after.
export function WalletPicker({ label, size = "xl", variant = "money", wallets, savingsWallets = [], value, onChange, after, minBalance = 0, currency, loading, error, onClose }: WalletPickerProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const all = [...wallets, ...savingsWallets];
  const selected = all.find((w) => w.id === value);
  const id = useId();
  const isSavings = (wallet: Account) => variant === "savings" || savingsWallets.includes(wallet);
  const tile = (wallet: Account) => (
    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", isSavings(wallet) ? "bg-pillar-habits-soft text-pillar-habits" : "bg-mint-50 text-emerald")}>
      {isSavings(wallet) ? <PiggyBank className="size-4" aria-hidden="true" /> : createElement(walletIcon(wallet), { className: "size-4", "aria-hidden": true })}
    </span>
  );

  const option = (wallet: Account) => {
    const on = wallet.id === value;
    const short = Number(wallet.currentBalance) < minBalance;
    return (
      <li key={wallet.id} role="option" aria-selected={on} aria-disabled={short || undefined}>
        <button
          type="button"
          disabled={short}
          onClick={() => {
            onChange(wallet.id);
            setOpen(false);
          }}
          className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-cream disabled:opacity-55 disabled:hover:bg-transparent", on && "bg-mint-50")}
        >
          {tile(wallet)}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-body font-semibold text-ink">{wallet.name}</span>
            <span className={cn("text-caption font-normal tabular-nums", short ? "text-warning" : "text-ink-muted")}>
              {formatCurrency(wallet.currentBalance, currency)}
              {short && ` · ${t("not enough")}`}
            </span>
          </span>
          {on && <Check className="size-4 shrink-0 text-emerald" aria-hidden="true" />}
        </button>
      </li>
    );
  };

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
            disabled={loading || all.length === 0}
            className={cn("flex items-center gap-3 rounded-md border border-line-strong bg-surface px-4 text-left disabled:opacity-60 data-open:border-emerald data-open:shadow-[0_0_0_3px_rgba(31,122,90,0.18)]", size === "xl" ? "h-14" : "h-13")}
          >
            {selected ? (
              <>
                {tile(selected)}
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-body font-semibold text-ink">{selected.name}</span>
                  <span className="truncate text-caption font-normal text-ink-muted tabular-nums">
                    {isSavings(selected) ? `${t("Savings wallet")} · ` : `${t("Balance")} `}
                    {formatCurrency(selected.currentBalance, currency)}
                    {after !== null && ` → ${formatCurrency(after, currency)}`}
                  </span>
                </span>
              </>
            ) : (
              <span className="flex-1 text-body text-ink-muted">{loading ? t("Loading...") : variant === "savings" ? t("No savings wallet yet") : t("No wallet yet")}</span>
            )}
            <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) gap-0 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
          <ul role="listbox" aria-labelledby={`${id}-label`} className="flex max-h-72 flex-col overflow-y-auto">
            {savingsWallets.length > 0 && wallets.length > 0 && <li className="px-3 pt-1 pb-1 text-caption font-semibold text-ink-muted">{t("Wallets")}</li>}
            {wallets.map(option)}
            {savingsWallets.length > 0 && <li className={cn("px-3 pt-2 pb-1 text-caption font-semibold text-ink-muted", wallets.length > 0 && "mt-1 border-t border-surface-sunken")}>{t("Savings wallets")}</li>}
            {savingsWallets.map(option)}
          </ul>
        </PopoverContent>
      </Popover>
      {!loading && error && (
        <p role="alert" className="text-caption text-expense">
          {t(error)}
        </p>
      )}
      {!loading && !error && all.length === 0 && (
        <p className="text-caption text-ink-muted">
          {variant === "savings" ? t("No savings wallet yet.") : t("No wallet yet.")}{" "}
          <Link href={variant === "savings" ? "/savings-goals/wallet" : "/balance/wallet"} onNavigate={onClose} className="font-semibold text-emerald hover:underline">
            {variant === "savings" ? t("Add a savings wallet") : t("Add a wallet")}
          </Link>
        </p>
      )}
    </div>
  );
}
