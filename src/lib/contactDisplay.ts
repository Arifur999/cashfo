import type { ContactType } from "./api";

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  CUSTOMER: "Customer",
  SUPPLIER: "Supplier",
  BOTH: "Customer & Supplier",
  RELATIVE: "Relative",
  OTHER: "Other",
};

export function contactInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

export type BalanceDirection = "OWED_TO_BUSINESS" | "OWED_BY_BUSINESS" | "SETTLED";

// Keyed off the SIGN of the balance, not `type` -- a CUSTOMER can end up
// with a negative balance (overpaid, a refund is owed to them) and a
// SUPPLIER can end up positive (business overpaid, owed a refund back).
// Sign-based coloring gets these edge cases right automatically; a
// type-based rule ("CUSTOMER=always green") would get them backwards.
// This is the exact convention Prompt 9's Receivable/Payable balances
// build on -- keep any future balance display consistent with this.
export function balanceDirection(balance: number | string): BalanceDirection {
  const n = Number(balance);
  if (n > 0) return "OWED_TO_BUSINESS";
  if (n < 0) return "OWED_BY_BUSINESS";
  return "SETTLED";
}

export const BALANCE_DIRECTION_COLOR: Record<BalanceDirection, string> = {
  OWED_TO_BUSINESS: "text-brand-primary",
  OWED_BY_BUSINESS: "text-brand-danger",
  SETTLED: "text-neutral-400",
};

export const BALANCE_DIRECTION_LABEL: Record<BalanceDirection, string> = {
  OWED_TO_BUSINESS: "Owes you",
  OWED_BY_BUSINESS: "You owe",
  SETTLED: "Settled",
};
