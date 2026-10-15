"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { createElement, useId, useState } from "react";
import Chip from "@/components/smartly/Chip";
import Input from "@/components/smartly/form/Input";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ACCOUNT_TYPE_LABELS, accountDisplayName } from "@/lib/customer/accountDisplay";
import type { Account, LanguagePreference } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { walletIcon, walletPalette, walletType } from "@/lib/customer/walletVisuals";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface AccountPickerProps {
  // The money accounts, first in the list and coloured as on My wallets.
  wallets: Account[];
  // Everything else in the chart of accounts, grouped by type.
  others: Account[];
  value: string;
  onChange: (id: string) => void;
  preferredLanguage: LanguagePreference;
  currency: string;
}

const OPTION = "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-cream";

// The Statement's account field: a wallet with its tile and type, or any
// other account found by typing. Clearing it goes back to the wallet picks.
export function AccountPicker({ wallets, others, value, onChange, preferredLanguage, currency }: AccountPickerProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const id = useId();
  const nameOf = (account: Account) => accountDisplayName(account, preferredLanguage);
  const selectedWallet = wallets.findIndex((wallet) => wallet.id === value);
  const selected = selectedWallet >= 0 ? wallets[selectedWallet] : others.find((account) => account.id === value);

  const q = query.trim().toLowerCase();
  const matches = (account: Account) => !q || account.name.toLowerCase().includes(q) || (account.nameBn ?? "").toLowerCase().includes(q);
  const walletHits = wallets.filter(matches);
  const otherHits = others.filter(matches);

  function pick(accountId: string) {
    onChange(accountId);
    setOpen(false);
    setQuery("");
  }

  function tileFor(account: Account) {
    const index = wallets.indexOf(account);
    return (
      <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md [&_svg]:size-3.5", index >= 0 ? walletPalette(index).tile : "bg-surface-sunken text-ink-2")}>
        {index >= 0 ? createElement(walletIcon(account), { "aria-hidden": true }) : <span className="text-caption font-bold">{ACCOUNT_TYPE_LABELS[account.accountType].charAt(0)}</span>}
      </span>
    );
  }

  const kindOf = (account: Account) => (wallets.includes(account) ? `${t("Wallet")} · ${t(walletType(account))}` : t(ACCOUNT_TYPE_LABELS[account.accountType]));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className={cn("flex h-11 items-center gap-2 rounded-md border bg-surface pr-2 pl-3 transition-[border-color,box-shadow]", open ? "border-emerald shadow-[0_0_0_0.5px_var(--emerald),0_0_0_4px_var(--mint-50)]" : "border-line-strong")}>
          <PopoverTrigger asChild>
            <button type="button" id={id} aria-haspopup="listbox" aria-expanded={open} className="flex h-full min-w-0 flex-1 items-center gap-3 text-left">
              {selected ? (
                <>
                  {tileFor(selected)}
                  <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink">{nameOf(selected)}</span>
                  <Chip tone="neutral" size="sm" className="font-medium">
                    {kindOf(selected)}
                  </Chip>
                </>
              ) : (
                <>
                  <Search className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-body text-ink-muted">{t("Search any account: wallets, income, expense…")}</span>
                </>
              )}
            </button>
          </PopoverTrigger>
          {selected && (
            <button type="button" onClick={() => onChange("")} aria-label={t("Clear account")} className="flex size-7 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken hover:text-ink">
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
          <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        </div>
      </PopoverAnchor>
      <PopoverContent align="start" sideOffset={6} className="w-(--radix-popover-trigger-width) gap-0 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
        <Input size="sm" type="search" value={query} onChange={(event) => setQuery(event.target.value)} autoFocus leading={<Search />} placeholder={t("Type to search")} aria-label={t("Search accounts")} frameClassName="mb-1" />
        <div role="listbox" aria-labelledby={id} className="flex max-h-80 flex-col overflow-y-auto">
          {walletHits.length > 0 && <span className="px-3 pt-2 pb-1 text-caption font-semibold text-ink-muted">{t("Wallets")}</span>}
          {walletHits.map((wallet) => (
            <button key={wallet.id} type="button" role="option" aria-selected={wallet.id === value} onClick={() => pick(wallet.id)} className={cn(OPTION, wallet.id === value && "bg-mint-50")}>
              {tileFor(wallet)}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn("truncate text-body font-semibold text-ink", wallet.status === "ARCHIVED" && "line-through")}>{nameOf(wallet)}</span>
                <span className="text-caption font-normal text-ink-muted tabular-nums">{formatCurrency(wallet.currentBalance, currency)}</span>
              </span>
            </button>
          ))}
          {otherHits.length > 0 && <span className="px-3 pt-2 pb-1 text-caption font-semibold text-ink-muted">{t("Other accounts")}</span>}
          {otherHits.map((account) => (
            <button key={account.id} type="button" role="option" aria-selected={account.id === value} onClick={() => pick(account.id)} className={cn(OPTION, account.id === value && "bg-mint-50")}>
              {tileFor(account)}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-semibold text-ink">{nameOf(account)}</span>
                <span className="text-caption font-normal text-ink-muted">{t(ACCOUNT_TYPE_LABELS[account.accountType])}</span>
              </span>
            </button>
          ))}
          {walletHits.length === 0 && otherHits.length === 0 && <p className="px-3 py-4 text-center text-small text-ink-muted">{t("No account matches")}</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
