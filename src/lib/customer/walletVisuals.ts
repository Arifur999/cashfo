import { Banknote, Boxes, HandCoins, Landmark, PiggyBank, Scale, ShoppingBag, Smartphone, TrendingUp, type LucideIcon } from "lucide-react";
import type { AccountType } from "./api";

// A wallet is a money account; its subtype says what kind. Anything else
// (an old row with no subtype) reads as a bank account.
export const WALLET_TYPES = ["cash", "bank", "mfs"] as const;
export type WalletType = (typeof WALLET_TYPES)[number];

export const WALLET_TYPE_META: Record<WalletType, { label: string; icon: LucideIcon }> = {
  cash: { label: "Cash", icon: Banknote },
  bank: { label: "Bank account", icon: Landmark },
  mfs: { label: "Mobile wallet", icon: Smartphone },
};

export function walletType(account: { accountSubtype: string | null }): WalletType {
  return account.accountSubtype === "cash" || account.accountSubtype === "mfs" ? account.accountSubtype : "bank";
}

export function walletIcon(account: { accountSubtype: string | null }): LucideIcon {
  return WALLET_TYPE_META[walletType(account)].icon;
}

// The icon for any other account in the chart (the Statement's picker): one
// per account type, and a savings wallet's piggy bank. A letter would read
// the same for Equity and Expenses, and stay English in Bangla.
export const ACCOUNT_TYPE_ICONS: Record<AccountType, LucideIcon> = {
  ASSET: Boxes,
  LIABILITY: HandCoins,
  EQUITY: Scale,
  INCOME: TrendingUp,
  EXPENSE: ShoppingBag,
};

export function accountIcon(account: { accountType: AccountType; accountSubtype: string | null }): LucideIcon {
  return account.accountSubtype === "savings" ? PiggyBank : ACCOUNT_TYPE_ICONS[account.accountType];
}

export interface WalletPalette {
  // The card's gradient.
  gradient: string;
  // Its slice of the share bar.
  bar: string;
  // The soft tile behind its icon in lists.
  tile: string;
}

// The four card colours the design cycles through, in its order.
export const WALLET_PALETTES: WalletPalette[] = [
  { gradient: "bg-wallet-forest", bar: "bg-emerald", tile: "bg-mint-50 text-emerald" },
  { gradient: "bg-wallet-teal", bar: "bg-pillar-insights", tile: "bg-pillar-insights-soft text-pillar-insights" },
  { gradient: "bg-wallet-charcoal", bar: "bg-ink-2", tile: "bg-surface-sunken text-ink-2" },
  { gradient: "bg-wallet-mint", bar: "bg-jade", tile: "bg-mint-50 text-emerald" },
];

export function walletPalette(index: number): WalletPalette {
  return WALLET_PALETTES[((index % WALLET_PALETTES.length) + WALLET_PALETTES.length) % WALLET_PALETTES.length];
}

// "•••• •••• 7890": the last four digits, as a card prints them. Null when
// there is nothing to mask.
export function maskAccountNumber(accountNumber: string | null | undefined): string | null {
  const digits = (accountNumber ?? "").replace(/\s+/g, "");
  if (!digits) return null;
  return `•••• •••• ${digits.slice(-4)}`;
}
