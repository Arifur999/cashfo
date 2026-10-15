import type { ContactType, LoanBalanceDirection, Transaction } from "./api";
import { WALLET_TYPES } from "./walletVisuals";

// What a loan contact is called. They are created as BOTH (they can lend
// and borrow), which reads as a plain person; the others say themselves.
export const LOAN_KIND_LABELS: Record<ContactType, string> = {
  BOTH: "Person",
  RELATIVE: "Relative",
  CUSTOMER: "Customer",
  SUPPLIER: "Supplier",
  OTHER: "Other",
};

// Positive balance: they owe us (pawna). Negative: we owe them (dena).
export function loanDirection(balance: number | string): LoanBalanceDirection {
  const n = Number(balance);
  return n > 0 ? "PAWNA" : n < 0 ? "DENA" : "SETTLED";
}

export interface DirectionMeta {
  // "Pawna" / "Dena" / "Settled", as the chips say.
  name: string;
  // "They owe you" / "You owe them" / "Nothing outstanding".
  label: string;
  // "owes you" / "you owe" / "Settled", after an amount on a phone row.
  short: string;
  chip: "income" | "expense" | "neutral";
  text: string;
  box: string;
}

export const DIRECTION_META: Record<LoanBalanceDirection, DirectionMeta> = {
  PAWNA: { name: "Pawna", label: "They owe you", short: "owes you", chip: "income", text: "text-income", box: "bg-mint-50" },
  DENA: { name: "Dena", label: "You owe them", short: "you owe", chip: "expense", text: "text-expense", box: "bg-expense-soft" },
  SETTLED: { name: "Settled", label: "Nothing outstanding", short: "Settled", chip: "neutral", text: "text-ink-muted", box: "bg-cream" },
};

// The four principal entries, as the API records them: a loan given is a
// credit sale, a loan taken a credit purchase, and repayments are payments
// received or made.
export type LoanEntryKind = "GIVE_LOAN" | "TAKE_LOAN" | "RECEIVE_PAYMENT" | "MAKE_PAYMENT";

export interface LoanEntryMeta {
  title: string;
  sub: string;
  // Which way the money moved through the wallet.
  flow: "in" | "out";
  walletLabel: string;
  save: string;
  // How the balance changes: which side grows or shrinks.
  effect: "PAWNA" | "DENA";
  effectSign: "+" | "−";
  effectSub: string;
}

export const LOAN_ENTRY_META: Record<LoanEntryKind, LoanEntryMeta> = {
  GIVE_LOAN: { title: "Gave a loan", sub: "Money out · they owe you", flow: "out", walletLabel: "Paid from", save: "Save loan", effect: "PAWNA", effectSign: "+", effectSub: "They owe you more" },
  TAKE_LOAN: { title: "Took a loan", sub: "Money in · you owe them", flow: "in", walletLabel: "Money came into", save: "Save loan", effect: "DENA", effectSign: "+", effectSub: "You owe more" },
  RECEIVE_PAYMENT: { title: "Got money back", sub: "Money in · they owe less", flow: "in", walletLabel: "Money came into", save: "Save payment", effect: "PAWNA", effectSign: "−", effectSub: "They owe you less" },
  MAKE_PAYMENT: { title: "Paid back", sub: "Money out · you owe less", flow: "out", walletLabel: "Paid from", save: "Save payment", effect: "DENA", effectSign: "−", effectSub: "You owe less" },
};

export const LOAN_ENTRY_KINDS = Object.keys(LOAN_ENTRY_META) as LoanEntryKind[];

// The contact's balance once an entry of this kind is saved (pawna is
// positive): giving or being paid back raises it, taking or paying lowers it.
export function balanceAfterEntry(balance: number | string, kind: LoanEntryKind, amount: number): number {
  const delta = kind === "GIVE_LOAN" || kind === "MAKE_PAYMENT" ? amount : -amount;
  return Number(balance) + delta;
}

export interface LoanEntry {
  kind: LoanEntryKind;
  amount: number;
  // The wallet the money moved through, when the entry carries one.
  wallet: string | null;
}

// Reads a loan entry back out of a transaction: the type says loan or
// repayment, and the wallet side says which way the money went. Null for
// anything that isn't one of the four.
export function loanEntryOf(transaction: Pick<Transaction, "transactionType" | "entries">): LoanEntry | null {
  const money = transaction.entries.find((entry) => entry.account?.accountSubtype && (WALLET_TYPES as readonly string[]).includes(entry.account.accountSubtype));
  const amount = Number(money?.amount ?? transaction.entries[0]?.amount ?? 0);
  const wallet = money?.account?.name ?? null;
  switch (transaction.transactionType) {
    case "SALE":
      return { kind: "GIVE_LOAN", amount, wallet };
    case "PURCHASE":
      return { kind: "TAKE_LOAN", amount, wallet };
    case "PAYMENT":
      if (!money) return null;
      return { kind: money.entryType === "DEBIT" ? "RECEIVE_PAYMENT" : "MAKE_PAYMENT", amount, wallet };
    default:
      return null;
  }
}

export interface LoanTotals {
  in: number;
  out: number;
  count: number;
}

// Money in and out across the standing entries only: a voided entry and
// its reversal cancel, so neither counts.
export function loanTotals(transactions: Pick<Transaction, "transactionType" | "entries" | "status" | "reversalOfId">[]): LoanTotals {
  return transactions.reduce<LoanTotals>(
    (totals, transaction) => {
      if (transaction.status !== "POSTED" || transaction.reversalOfId) return totals;
      const entry = loanEntryOf(transaction);
      if (!entry) return totals;
      return { in: totals.in + (LOAN_ENTRY_META[entry.kind].flow === "in" ? entry.amount : 0), out: totals.out + (LOAN_ENTRY_META[entry.kind].flow === "out" ? entry.amount : 0), count: totals.count + 1 };
    },
    { in: 0, out: 0, count: 0 },
  );
}

// The soft colours a phone list gives its avatars, picked by name so one
// person always gets the same one.
const AVATAR_TONES = ["bg-info-soft text-info", "bg-pillar-insights-soft text-pillar-insights", "bg-pillar-loans-soft text-pillar-loans", "bg-pillar-habits-soft text-pillar-habits", "bg-mint-50 text-income", "bg-cream text-ink-muted"];

export function avatarTone(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}
