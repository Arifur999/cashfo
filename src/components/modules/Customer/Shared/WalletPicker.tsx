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
  // 56px in the transaction drawer, 52px in the loan one, 64px with a 36px
  // tile in the transfer drawer; "compact" is the phone sheet's half-width
  // picker (52px, the icon and the name only, under a 13px label).
  size?: "lg" | "xl" | "2xl" | "compact";
  // The word before the balance: "Balance", or "Available" on the side the
  // money leaves.
  balanceLabel?: string;
  // The tile: mint, or sand on the side the money leaves.
  tone?: "mint" | "sand";
  // Money wallets, or the savings wallets a goal is kept in.
  variant?: "money" | "savings";
  wallets: Account[];
  // Savings wallets offered under the money wallets (buying or selling an
  // asset can use either).
  savingsWallets?: Account[];
  value: string;
  onChange: (id: string) => void;
  // The wallet's balance once this entry is saved: "→ ৳ 7,200", or in
  // words ("· ৳ 7,200 after this") where the board writes it so.
  after: number | null;
  afterInWords?: boolean;
  // Wallets holding less than this are greyed out ("not enough").
  minBalance?: number;
  currency: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

// The wallet to pay from or into: its icon, name, balance now and after.
export function WalletPicker({ label, size = "xl", balanceLabel = "Balance", tone = "mint", variant = "money", wallets, savingsWallets = [], value, onChange, after, afterInWords = false, minBalance = 0, currency, loading, error, onClose }: WalletPickerProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const all = [...wallets, ...savingsWallets];
  const selected = all.find((w) => w.id === value);
  const id = useId();
  const isSavings = (wallet: Account) => variant === "savings" || savingsWallets.includes(wallet);
  const tile = (wallet: Account, big = false) => (
    <span className={cn("flex shrink-0 items-center justify-center rounded-md", big ? "size-9" : "size-8", isSavings(wallet) ? "bg-pillar-habits-soft text-pillar-habits" : tone === "sand" ? "bg-surface-sunken text-ink-2" : "bg-mint-50 text-emerald")}>
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
          className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-hover disabled:opacity-55 disabled:hover:bg-transparent", on && "bg-mint-50")}
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
      <label id={`${id}-label`} className={cn(size === "compact" ? "text-small font-semibold text-ink-2" : "text-body font-medium text-ink", "leading-[normal]")}>
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-labelledby={`${id}-label`}
            aria-haspopup="listbox"
            disabled={loading || all.length === 0}
            className={cn("flex min-w-0 items-center gap-3 rounded-md border border-line-strong bg-surface px-4 text-left disabled:opacity-60 data-open:border-emerald data-open:shadow-[0_0_0_3px_rgba(31,122,90,0.18)]", size === "2xl" ? "h-16" : size === "xl" ? "h-14" : "h-13")}
          >
            {selected && size === "compact" ? (
              <>
                {createElement(isSavings(selected) ? PiggyBank : walletIcon(selected), { className: "size-4.5 shrink-0 text-ink-2", "aria-hidden": true })}
                <span className="min-w-0 flex-1 truncate text-body-lg text-ink">{selected.name}</span>
              </>
            ) : selected ? (
              <>
                {tile(selected, size === "2xl")}
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-body font-semibold text-ink">{selected.name}</span>
                  <span className="truncate text-caption font-normal text-ink-muted tabular-nums">
                    {isSavings(selected) ? `${t("Savings wallet")} · ` : `${t(balanceLabel)} `}
                    {formatCurrency(selected.currentBalance, currency)}
                    {after !== null && (afterInWords ? ` · ${t("{amount} after this", { amount: formatCurrency(after, currency) })}` : ` → ${formatCurrency(after, currency)}`)}
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
