import type { Transaction } from "./api";
import { formatDate } from "./date";
import { cancelledLabel } from "./transactionDisplay";
import { toDateInputValue } from "@/lib/date";

export interface CategoryMeta {
  name: string;
  icon: string | null;
  color: string;
}

// An entry's categoryId holds the category's NAME (the quick-entry API
// stores the label), so the index answers to the name as well as the id.
export function categoryIndex(categories: { id: string; name: string; icon: string | null; color: string }[]): Record<string, CategoryMeta> {
  const index: Record<string, CategoryMeta> = {};
  for (const category of categories) {
    const meta = { name: category.name, icon: category.icon, color: category.color };
    index[category.id] = meta;
    index[category.name] = meta;
  }
  return index;
}

export interface TransactionRow {
  transaction: Transaction;
  // What the row is called: the note, else the category, else the type.
  title: string | null;
  category: CategoryMeta | null;
  // The wallet, or "from → to" for a transfer.
  wallet: string | null;
  // Positive for money in, negative for money out, as entered for a transfer.
  signedAmount: number;
  cancelled: "Voided" | "Reversal" | null;
}

export const shiftDay = (day: string, delta: number): string => {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
};

// Which entry carries the category and which the wallet: entry order
// differs between an income and an expense, so the wallet is "the other
// entry". A transfer has two wallets and no category.
export function describeTransaction(transaction: Transaction, categoriesById: Record<string, CategoryMeta>): TransactionRow {
  const categoryEntry = transaction.entries.find((e) => e.categoryId);
  let category = categoryEntry?.categoryId ? (categoriesById[categoryEntry.categoryId] ?? null) : null;
  let wallet = categoryEntry ? (transaction.entries.find((e) => e.id !== categoryEntry.id)?.account?.name ?? null) : null;
  if (!categoryEntry && transaction.transactionType !== "TRANSFER") {
    // A posting made straight against the books (a journal entry, a
    // feature's own posting): the money side is the wallet, the other
    // account stands in for the category.
    const moneyEntry = transaction.entries.find((e) => e.account?.accountType === "ASSET") ?? transaction.entries[0];
    const other = transaction.entries.find((e) => e.id !== moneyEntry?.id);
    wallet = moneyEntry?.account?.name ?? null;
    if (!category && other?.account) category = { name: other.account.name, icon: null, color: "" };
  }
  if (transaction.transactionType === "TRANSFER") {
    const from = transaction.entries.find((e) => e.entryType === "CREDIT")?.account?.name;
    const to = transaction.entries.find((e) => e.entryType === "DEBIT")?.account?.name;
    if (from && to) wallet = `${from} → ${to}`;
  }
  const amount = Number(transaction.entries[0]?.amount ?? 0);
  const signedAmount = transaction.transactionType === "EXPENSE" ? -amount : amount;
  return {
    transaction,
    title: transaction.description || category?.name || null,
    category,
    wallet,
    signedAmount,
    cancelled: cancelledLabel(transaction),
  };
}

export interface DayGroup {
  day: string;
  rows: TransactionRow[];
  // The day's money in minus money out, voided rows left out.
  net: number;
}

// Rows grouped by their calendar day in the platform timezone, in the
// order they arrived (newest first).
export function groupByDay(rows: TransactionRow[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const row of rows) {
    const day = toDateInputValue(row.transaction.transactionDate);
    let group = groups[groups.length - 1];
    if (!group || group.day !== day) {
      group = { day, rows: [], net: 0 };
      groups.push(group);
    }
    group.rows.push(row);
    if (!row.cancelled && row.transaction.transactionType !== "TRANSFER") group.net += row.signedAmount;
  }
  return groups;
}

// "Today", "Yesterday" or nothing, for a "YYYY-MM-DD" day.
export function relativeDayKey(day: string, today: string): "Today" | "Yesterday" | null {
  if (day === today) return "Today";
  if (day === shiftDay(today, -1)) return "Yesterday";
  return null;
}

// "Yesterday · Thu, 1 Oct" or "Wed, 30 Sep", the way the list heads a day.
export function dayHeading(day: string, today: string, t: (key: string) => string): string {
  const short = formatDate(`${day}T00:00:00.000Z`, "EEE, d MMM");
  const relative = relativeDayKey(day, today);
  return relative ? `${t(relative)} · ${short}` : short;
}
