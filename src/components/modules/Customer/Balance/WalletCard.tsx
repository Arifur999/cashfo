"use client";

import { Archive, ArchiveRestore, ArrowRight, ChevronRight, Ellipsis, Pencil, PiggyBank, ScrollText, Trash2 } from "lucide-react";
import Link from "next/link";
import { createElement } from "react";
import Loader from "@/components/shared/Loader";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { accountDisplayName, balanceText, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { savingsPalette } from "@/lib/customer/savingsDisplay";
import { maskAccountNumber, WALLET_TYPE_META, walletPalette, walletType } from "@/lib/customer/walletVisuals";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface WalletCardProps {
  wallet: Account;
  // Its place in the list, which picks the card colour.
  index: number;
  currency: string;
  canManage: boolean;
  onEdit: () => void;
  onToggleArchive: () => void;
  onRemove: () => void;
  // A savings wallet: the violet / teal cards, no kind chip.
  savings?: boolean;
  // An archive, unarchive or remove is on its way: the card dims and its
  // menu waits.
  busy?: boolean;
  // No connection: Archive, Unarchive and Remove wait for it instead of
  // failing on send (Edit and the statement stay open).
  offline?: boolean;
}

const MENU_ITEM = "flex h-9 cursor-pointer items-center gap-3 rounded-sm px-3 text-small font-medium text-ink focus:bg-surface-sunken [&_svg]:size-3.75";

// One wallet as a bank card: its kind, name and number, what it holds now
// and held at the start, a link to its statement, and the actions menu.
// Phones get the shorter card from the phone board: the whole card opens
// the statement, a chevron (or the actions menu, for a manager) on the
// right, and the board's natural line heights.
export function WalletCard({ wallet, index, currency, canManage, onEdit, onToggleArchive, onRemove, savings = false, busy = false, offline = false }: WalletCardProps) {
  const { t, locale } = useLocale();
  // The name in the reader's language ("নগদ" for Cash), as Balance and the
  // Statement show it.
  const name = accountDisplayName(wallet, displayLanguage(locale));
  const palette = savings ? savingsPalette(index) : walletPalette(index);
  const meta = savings ? { label: "Savings wallet", icon: PiggyBank } : WALLET_TYPE_META[walletType(wallet)];
  const archived = wallet.status === "ARCHIVED";
  const statementHref = `/balance/ledger?accountId=${wallet.id}`;

  return (
    <div
      aria-busy={busy || undefined}
      className={cn(
        "relative flex flex-col gap-3 overflow-hidden rounded-lg p-4 text-white transition-opacity md:min-h-50 md:justify-between md:gap-0 md:rounded-xl md:p-5 md:shadow-float",
        palette.gradient,
        archived && "saturate-50",
        busy && "opacity-70",
      )}
    >
      <span aria-hidden="true" className="absolute -top-12.5 -right-10 size-35 rounded-full border border-white/16 md:-top-22.5 md:-right-17.5 md:size-55 md:border-0 md:bg-white/7" />
      <span aria-hidden="true" className="absolute right-7.5 -bottom-30 hidden size-50 rounded-full border border-white/12 md:block" />

      <div className="relative flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3 md:hidden">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/14 [&_svg]:size-4.5">{createElement(meta.icon, { "aria-hidden": true })}</span>
          <span className="flex min-w-0 flex-col leading-[normal]">
            <span className="truncate text-body leading-[normal] font-bold">{name}</span>
            <span className="text-caption leading-[normal] font-normal text-white/75">{archived ? t("Archived@@status") : t(meta.label)}</span>
          </span>
        </span>
        <span className="hidden items-center gap-2 rounded-full bg-white/16 px-3 py-1 text-caption font-semibold md:inline-flex [&_svg]:size-3.5">
          {createElement(meta.icon, { "aria-hidden": true })}
          {t(meta.label)}
          {archived && ` · ${t("Archived@@status")}`}
        </span>
        {!canManage && <ChevronRight className="size-4.5 shrink-0 text-white/70 md:hidden" aria-hidden="true" />}
        {canManage && (
          <DropdownMenu>
            {/* 44px on phones, where a near miss would open the statement under it. */}
            <DropdownMenuTrigger
              disabled={busy}
              aria-label={t("Actions for {name}", { name })}
              className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-md bg-white/12 text-white hover:bg-white/20 disabled:cursor-default data-open:bg-white/28 max-md:-mr-2 max-md:size-11 max-md:bg-transparent max-md:text-white/70"
            >
              {busy ? <Loader size={16} onDark label={t("Loading...")} /> : <Ellipsis className="size-4.5" aria-hidden="true" />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="w-49 rounded-md border border-line bg-surface p-2 shadow-overlay ring-0">
              <DropdownMenuItem onSelect={onEdit} className={MENU_ITEM}>
                <Pencil aria-hidden="true" />
                {t("Edit wallet")}
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={MENU_ITEM}>
                <Link href={statementHref}>
                  <ScrollText aria-hidden="true" />
                  {t("View statement")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onToggleArchive} disabled={offline} className={MENU_ITEM}>
                {archived ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />}
                {archived ? t("Unarchive") : t("Archive")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-line" />
              <DropdownMenuItem onSelect={onRemove} disabled={offline} className={cn(MENU_ITEM, "text-expense focus:bg-expense-soft focus:text-expense")}>
                <Trash2 aria-hidden="true" />
                {t("Remove")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="relative hidden flex-col gap-1 md:flex">
        <span className="truncate text-h3 tracking-[-0.01em]">{name}</span>
        <span className="text-small tracking-[0.08em] text-white/75 tabular-nums">{((savings || walletType(wallet) !== "cash") && maskAccountNumber(wallet.accountNumber)) || t("No account number")}</span>
      </div>

      {/* The figure is never cut short: when it and the link don't fit on
          one line, the link wraps under it. */}
      <div className="relative flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-col gap-3 md:gap-0.5">
          <span className="hidden text-caption font-normal text-white/78 md:block">{savings ? t("Balance") : t("Current balance")}</span>
          <span className="text-h1 font-extrabold tabular-nums wrap-anywhere max-md:leading-[normal] md:text-h2 md:font-bold xl:text-h1">{balanceText(wallet.currentBalance, currency, locale)}</span>
          <span className="text-caption font-normal text-white/78 tabular-nums max-md:leading-[normal]">
            {t("Opening")} {formatCurrency(wallet.openingBalance, currency, locale)}
          </span>
        </div>
        <Link href={statementHref} className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/16 px-3 py-2 text-caption font-semibold text-white hover:bg-white/24 max-md:hidden">
          {t("Statement")}
          <ArrowRight className="size-3" strokeWidth={2.5} aria-hidden="true" />
        </Link>
      </div>

      {/* Phones: the whole card opens the statement; the menu sits above.
          The ring is drawn inside, where the card's rounded clip can't cut it. */}
      <Link href={statementHref} aria-label={t("View the statement of {name}", { name })} className="absolute inset-0 rounded-lg focus-visible:-outline-offset-2 md:hidden" />
    </div>
  );
}
