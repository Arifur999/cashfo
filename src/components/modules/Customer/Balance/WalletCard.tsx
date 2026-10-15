"use client";

import { Archive, ArchiveRestore, ArrowRight, Ellipsis, Pencil, PiggyBank, ScrollText, Trash2 } from "lucide-react";
import Link from "next/link";
import { createElement } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
}

const MENU_ITEM = "flex h-9 cursor-pointer items-center gap-3 rounded-sm px-3 text-small font-medium text-ink focus:bg-cream [&_svg]:size-3.75";

// One wallet as a bank card: its kind, name and number, what it holds now
// and held at the start, a link to its statement, and the actions menu.
// Phones get the shorter card from the phone board.
export function WalletCard({ wallet, index, currency, canManage, onEdit, onToggleArchive, onRemove, savings = false }: WalletCardProps) {
  const { t } = useLocale();
  const palette = savings ? savingsPalette(index) : walletPalette(index);
  const meta = savings ? { label: "Savings wallet", icon: PiggyBank } : WALLET_TYPE_META[walletType(wallet)];
  const archived = wallet.status === "ARCHIVED";
  const ledgerHref = `/balance/ledger?accountId=${wallet.id}`;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 overflow-hidden rounded-lg p-4 text-white md:h-50 md:justify-between md:gap-0 md:rounded-xl md:p-5 md:shadow-[0_10px_28px_-8px_rgba(11,61,46,0.18),0_2px_6px_rgba(14,26,22,0.06)]",
        palette.gradient,
        archived && "saturate-50",
      )}
    >
      <span aria-hidden="true" className="absolute -top-12.5 -right-10 size-35 rounded-full border border-white/16 md:-top-22.5 md:-right-17.5 md:size-55 md:border-0 md:bg-white/7" />
      <span aria-hidden="true" className="absolute right-7.5 -bottom-30 hidden size-50 rounded-full border border-white/12 md:block" />

      <div className="relative flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3 md:hidden">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/14 [&_svg]:size-4.5">{createElement(meta.icon, { "aria-hidden": true })}</span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-title">{wallet.name}</span>
            <span className="text-caption font-normal text-white/80">{archived ? t("Archived") : t(meta.label)}</span>
          </span>
        </span>
        <span className="hidden items-center gap-2 rounded-full bg-white/16 px-3 py-1 text-caption font-semibold md:inline-flex [&_svg]:size-3.5">
          {createElement(meta.icon, { "aria-hidden": true })}
          {t(meta.label)}
          {archived && ` · ${t("Archived")}`}
        </span>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger aria-label={`${t("Actions for")} ${wallet.name}`} className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/12 text-white hover:bg-white/20 data-open:bg-white/28">
              <Ellipsis className="size-4.5" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="w-49 rounded-md border border-line bg-surface p-2 shadow-overlay ring-0">
              <DropdownMenuItem onSelect={onEdit} className={MENU_ITEM}>
                <Pencil aria-hidden="true" />
                {t("Edit wallet")}
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={MENU_ITEM}>
                <Link href={ledgerHref}>
                  <ScrollText aria-hidden="true" />
                  {t("View ledger")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onToggleArchive} className={MENU_ITEM}>
                {archived ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />}
                {archived ? t("Unarchive") : t("Archive")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-line" />
              <DropdownMenuItem onSelect={onRemove} className={cn(MENU_ITEM, "text-expense focus:bg-expense-soft focus:text-expense")}>
                <Trash2 aria-hidden="true" />
                {t("Remove")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="relative hidden flex-col gap-1 md:flex">
        <span className="truncate text-h3 tracking-[-0.01em]">{wallet.name}</span>
        <span className="text-small tracking-[0.08em] text-white/75 tabular-nums">{maskAccountNumber(wallet.accountNumber) ?? t("No account number")}</span>
      </div>

      <div className="relative flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="hidden text-caption font-normal text-white/78 md:block">{savings ? t("Balance") : t("Current balance")}</span>
          <span className="truncate text-h1 font-extrabold tabular-nums md:font-bold">{formatCurrency(wallet.currentBalance, currency)}</span>
          <span className="text-caption font-normal text-white/78 tabular-nums">
            {t("Opening")} {formatCurrency(wallet.openingBalance, currency)}
          </span>
        </div>
        <Link href={ledgerHref} className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/16 px-3 py-2 text-caption font-semibold text-white hover:bg-white/24">
          {t("Ledger")}
          <ArrowRight className="size-3" strokeWidth={2.5} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
