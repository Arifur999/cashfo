"use client";

import { Command } from "cmdk";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { createElement, useState } from "react";
import Chip from "@/components/smartly/Chip";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ACCOUNT_TYPE_LABELS, accountDisplayName } from "@/lib/customer/accountDisplay";
import type { Account, LanguagePreference } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { accountIcon, WALLET_TYPE_META, walletIcon, walletPalette, walletType } from "@/lib/customer/walletVisuals";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface AccountPickerProps {
  // The trigger's id, for the page's <label htmlFor>.
  id: string;
  // That label's id: the trigger reads as the label and its account
  // ("Account, Cash"), not the account alone.
  labelId?: string;
  // The money accounts, first in the list and coloured as on My wallets.
  wallets: Account[];
  // Everything else in the chart of accounts, grouped by type.
  others: Account[];
  value: string;
  onChange: (id: string) => void;
  preferredLanguage: LanguagePreference;
  currency: string;
}

// The highlighted row (arrow keys or the pointer) on the menu ground; the
// chosen account keeps its mint and a check.
const OPTION = "flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left outline-none data-[selected=true]:bg-surface-sunken";
const GROUP = "**:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:pt-2 **:[[cmdk-group-heading]]:pb-1 **:[[cmdk-group-heading]]:text-caption **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:text-ink-muted";

// The Statement's account field: a wallet with its tile and kind, or any
// other account found by typing. The list is a combobox: type to narrow it,
// arrow keys to move, Enter to pick. Clearing it goes back to the wallet
// picks.
export function AccountPicker({ id, labelId, wallets, others, value, onChange, preferredLanguage, currency }: AccountPickerProps) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const nameOf = (account: Account) => accountDisplayName(account, preferredLanguage);
  const isWallet = (account: Account) => wallets.some((wallet) => wallet.id === account.id);
  const selected = wallets.find((wallet) => wallet.id === value) ?? others.find((account) => account.id === value);

  const q = query.trim().toLowerCase();
  const matches = (account: Account) => !q || account.name.toLowerCase().includes(q) || (account.nameBn ?? "").toLowerCase().includes(q);
  const walletHits = wallets.filter(matches);
  const otherHits = others.filter(matches);

  function openChange(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  function pick(accountId: string) {
    onChange(accountId);
    openChange(false);
  }

  function tileFor(account: Account) {
    const index = wallets.findIndex((wallet) => wallet.id === account.id);
    return (
      <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md [&_svg]:size-3.5", index >= 0 ? walletPalette(index).tile : "bg-surface-sunken text-ink-2")}>
        {createElement(index >= 0 ? walletIcon(account) : accountIcon(account), { "aria-hidden": true })}
      </span>
    );
  }

  // "Mobile wallet", "Savings wallet", "Expenses": the kind as every other
  // page names it.
  const kindOf = (account: Account) => t(isWallet(account) ? WALLET_TYPE_META[walletType(account)].label : account.accountSubtype === "savings" ? "Savings wallet" : ACCOUNT_TYPE_LABELS[account.accountType]);

  const option = (account: Account, detail: React.ReactNode) => {
    const chosen = account.id === value;
    return (
      <Command.Item key={account.id} value={account.id} onSelect={() => pick(account.id)} className={cn(OPTION, chosen && "bg-mint-50")}>
        {tileFor(account)}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={cn("truncate text-body font-semibold text-ink", account.status === "ARCHIVED" && "line-through")}>{nameOf(account)}</span>
          <span className="text-caption font-normal text-ink-muted tabular-nums">{detail}</span>
        </span>
        {chosen && <Check className="size-4 shrink-0 text-brand-ink" aria-hidden="true" />}
      </Command.Item>
    );
  };

  return (
    <Popover open={open} onOpenChange={openChange}>
      <PopoverAnchor asChild>
        <div className={cn("flex h-11 items-center gap-2 rounded-md border bg-surface pr-2 pl-3 transition-[border-color,box-shadow]", open ? "border-emerald shadow-[0_0_0_0.5px_var(--emerald),0_0_0_4px_var(--mint-50)]" : "border-line-strong")}>
          <PopoverTrigger asChild>
            <button type="button" id={id} aria-labelledby={labelId ? `${labelId} ${id}` : undefined} className="flex h-full min-w-0 flex-1 items-center gap-3 text-left">
              {selected ? (
                <>
                  {tileFor(selected)}
                  <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink">{nameOf(selected)}</span>
                  <Chip tone="neutral" size="sm" className="font-medium max-sm:hidden">
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
            <button type="button" onClick={() => onChange("")} aria-label={t("Clear account")} className="flex size-7 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11">
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
          <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        </div>
      </PopoverAnchor>
      <PopoverContent align="start" sideOffset={6} className="w-(--radix-popover-trigger-width) gap-0 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
        {/* Our own matching (Bangla names too), so cmdk only drives the keys. */}
        <Command shouldFilter={false} loop label={t("Search accounts")} defaultValue={value || undefined}>
          <div className="mb-1 flex h-9.5 items-center gap-2 rounded-md border border-line-strong bg-surface px-3 text-ink-muted transition-[border-color,box-shadow] focus-within:border-emerald focus-within:shadow-[0_0_0_0.5px_var(--emerald),0_0_0_4px_var(--mint-50)]">
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <Command.Input value={query} onValueChange={setQuery} placeholder={t("Type to search")} className="h-full min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-faint" />
          </div>
          <Command.List className="max-h-80 overflow-y-auto">
            <Command.Empty className="px-3 py-4 text-center text-small text-ink-muted">{t("No account matches")}</Command.Empty>
            {walletHits.length > 0 && (
              <Command.Group heading={t("Wallets")} className={GROUP}>
                {walletHits.map((wallet) => option(wallet, formatCurrency(wallet.currentBalance, currency, locale)))}
              </Command.Group>
            )}
            {otherHits.length > 0 && (
              <Command.Group heading={t("Other accounts")} className={GROUP}>
                {otherHits.map((account) => option(account, kindOf(account)))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
