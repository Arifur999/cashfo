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
