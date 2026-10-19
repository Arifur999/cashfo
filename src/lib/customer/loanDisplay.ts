import type { Translate } from "@/lib/i18n/message";
import type { ContactType, LoanBalanceDirection, LoanStatementRow, Transaction } from "./api";
import { WALLET_TYPES } from "./walletVisuals";

// What a loan contact is called. They are created as BOTH (they can lend
// and borrow), which reads as a plain person; the others say themselves.
export const LOAN_KIND_LABELS: Record<ContactType, string> = {
  BOTH: "Person",
  RELATIVE: "Relative",
  BANK: "Bank",
  NGO: "NGO",
  CUSTOMER: "Customer",
  SUPPLIER: "Supplier",
  OTHER: "Other",
};

// The kinds a loan contact can be, in the order the drawer offers them.
export const LOAN_KINDS: ContactType[] = ["BOTH", "RELATIVE", "BANK", "NGO", "CUSTOMER", "SUPPLIER", "OTHER"];

// Who a total is with, as the dashboard's cards say it: "3 contacts", or
// "1 bank and 1 NGO" once banks and NGOs are among them.
export function whoPhrase(kinds: (ContactType | undefined)[], t: Translate): string {
  const banks = kinds.filter((kind) => kind === "BANK").length;
  const ngos = kinds.filter((kind) => kind === "NGO").length;
  const others = kinds.length - banks - ngos;
  const parts = [
    others > 0 || kinds.length === 0 ? t(others === 1 ? "{count} contact" : "{count} contacts", { count: others }) : null,
    banks > 0 ? t(banks === 1 ? "{count} bank" : "{count} banks", { count: banks }) : null,
    ngos > 0 ? t(ngos === 1 ? "{count} NGO" : "{count} NGOs", { count: ngos }) : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} ${t("and")} ${parts[parts.length - 1]}` : parts[0];
}

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

// A statement's profit, voided entries left out: paid and received, and the
// months each was in.
export function statementProfit(rows: LoanStatementRow[]): { paid: number; received: number; paidMonths: number; receivedMonths: number } {
  const live = rows.filter((row) => row.status !== "VOIDED");
  const months = (pick: (row: LoanStatementRow) => string | null) => new Set(live.filter((row) => Number(pick(row) ?? 0) > 0).map((row) => row.date.slice(0, 7))).size;
  return {
    paid: live.reduce((sum, row) => sum + Number(row.profitPaid ?? 0), 0),
    received: live.reduce((sum, row) => sum + Number(row.profitReceived ?? 0), 0),
    paidMonths: months((row) => row.profitPaid),
    receivedMonths: months((row) => row.profitReceived),
  };
}

export type LedgerItem = { kind: "row"; row: LoanStatementRow } | { kind: "more"; key: string; rows: LoanStatementRow[] };

// A long run of profit rows (a monthly payment) shows its first two and
// last two, with the rest folded into one row between them, as the board
// draws it.
export function foldProfitRuns(rows: LoanStatementRow[], keep = 2): LedgerItem[] {
  const items: LedgerItem[] = [];
  let run: LoanStatementRow[] = [];
  const flush = () => {
    if (run.length > keep * 2 + 1) {
      items.push(...run.slice(0, keep).map((row) => ({ kind: "row" as const, row })));
      items.push({ kind: "more", key: run[keep].transactionId, rows: run.slice(keep, -keep) });
      items.push(...run.slice(-keep).map((row) => ({ kind: "row" as const, row })));
    } else {
      items.push(...run.map((row) => ({ kind: "row" as const, row })));
    }
    run = [];
  };
  for (const row of rows) {
    if (row.category === "Profit") {
      run.push(row);
    } else {
      flush();
      items.push({ kind: "row", row });
    }
  }
  flush();
  return items;
}

// The category a loan's profit is first filed under: one named for profit,
// interest or a loan, else the first there is.
export function profitCategory(names: string[]): string {
  return names.find((name) => /profit|interest|loan|সুদ|মুনাফা/i.test(name)) ?? names[0] ?? "";
}

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

// A loan's profit or interest: an expense (paid) or an income (received)
// posted with the contact; what it was filed under, and the wallet.
export function loanProfitOf(transaction: Pick<Transaction, "transactionType" | "entries">): { paid: boolean; amount: number; wallet: string | null; category: string | null } | null {
  if (transaction.transactionType !== "INCOME" && transaction.transactionType !== "EXPENSE") return null;
  const money = transaction.entries.find((entry) => entry.account?.accountSubtype && (WALLET_TYPES as readonly string[]).includes(entry.account.accountSubtype));
  const filed = transaction.entries.find((entry) => entry !== money);
  return { paid: transaction.transactionType === "EXPENSE", amount: Number(money?.amount ?? filed?.amount ?? 0), wallet: money?.account?.name ?? null, category: filed?.categoryId ?? filed?.account?.name ?? null };
}

export interface LoanTotals {
  in: number;
  out: number;
  // Profit or interest paid and received; it never moves the loans.
  profitPaid: number;
  profitReceived: number;
  count: number;
}

// Money in and out across the standing entries only: a voided entry and
// its reversal cancel, so neither counts.
export function loanTotals(transactions: Pick<Transaction, "transactionType" | "entries" | "status" | "reversalOfId">[]): LoanTotals {
  return transactions.reduce<LoanTotals>(
    (totals, transaction) => {
      if (transaction.status !== "POSTED" || transaction.reversalOfId) return totals;
      const profit = loanProfitOf(transaction);
      if (profit) return { ...totals, profitPaid: totals.profitPaid + (profit.paid ? profit.amount : 0), profitReceived: totals.profitReceived + (profit.paid ? 0 : profit.amount), count: totals.count + 1 };
      const entry = loanEntryOf(transaction);
      if (!entry) return totals;
      return { ...totals, in: totals.in + (LOAN_ENTRY_META[entry.kind].flow === "in" ? entry.amount : 0), out: totals.out + (LOAN_ENTRY_META[entry.kind].flow === "out" ? entry.amount : 0), count: totals.count + 1 };
    },
    { in: 0, out: 0, profitPaid: 0, profitReceived: 0, count: 0 },
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
