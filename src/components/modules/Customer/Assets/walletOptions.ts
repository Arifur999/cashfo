import type { Account } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";

// The wallets a purchase is paid from or a sale paid into: every open one
// (and the one already picked, even if it was archived since).
export const offeredWallets = (wallets: Account[], keep?: string | null) => wallets.filter((wallet) => wallet.status !== "ARCHIVED" || wallet.id === keep);

// A wallet's balance as the boards write it beside its name: "− " before a
// wallet that is short.
export const walletBalance = (balance: number, currency: string, fmt: FormatLocale) => `${balance < 0 ? "− " : ""}${formatCurrency(Math.abs(balance), currency, fmt)}`;

export const walletName = (wallets: Account[], id: string | null | undefined) => wallets.find((wallet) => wallet.id === id)?.name ?? "";
