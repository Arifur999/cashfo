import { formatCount } from "@/lib/i18n/digits";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";
import { walletPalette, type WalletPalette } from "./walletVisuals";

export interface WalletShare {
  id: string;
  name: string;
  amount: number;
  // Its share of the whole, 0–100.
  share: number;
  // The slice's colour (a wallet palette's `bar`).
  bar: string;
}

// The share bar's slices: every active wallet with money in it, biggest
// first, each coloured by its place in the full list (money wallet colours
// unless another palette is given). Shares sum to 100 (or 0 when nothing
// is held); a wallet in the red takes no slice.
export function walletShares(wallets: { id: string; name: string; currentBalance: string; status?: string }[], palette: (index: number) => WalletPalette = walletPalette): WalletShare[] {
  const held = wallets.map((wallet, index) => ({ wallet, index, amount: wallet.status === "ARCHIVED" ? 0 : Math.max(0, Number(wallet.currentBalance)) }));
  const total = held.reduce((sum, item) => sum + item.amount, 0);
  return held
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .map(({ wallet, index, amount }) => ({ id: wallet.id, name: wallet.name, amount, share: total > 0 ? (amount / total) * 100 : 0, bar: palette(index).bar }));
}

// A whole percentage in the reader's digits: "45%", "৪৫%".
export const sharePercent = (share: number, locale: FormatLocale): string => `${formatCount(Math.round(share), locale)}%`;

// What the bar says to a screen reader, which can't see the slices: its
// name, then each wallet's share ("Share of balance by wallet: Cash 45%,
// bKash 30%").
export function shareBarLabel(label: string, slices: Pick<WalletShare, "name" | "share">[], locale: FormatLocale): string {
  if (slices.length === 0) return label;
  return `${label}: ${slices.map((slice) => `${slice.name} ${sharePercent(slice.share, locale)}`).join(", ")}`;
}
