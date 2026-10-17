// The sums behind Books: the accounts grouped the way an accountant reads
// them and whether they balance, the customers and suppliers with what is
// due, the age of what is owed, and a journal entry's two columns. Pure,
// so the pages and their tests agree.
import type { Account, AccountGroup, AccountType, AgingBucketRow, AgingReport, Contact, ContactType, OverdueRow, Transaction } from "./api";
import { dayOf } from "./habitDisplay";

// English, passed through t().
export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; singular: string; sub: string; tone: "money" | "expense" | "info" | "income" | "warning" }> = {
  ASSET: { label: "Assets", singular: "Asset", sub: "What the business owns", tone: "money" },
  LIABILITY: { label: "Liabilities", singular: "Liability", sub: "What the business owes", tone: "expense" },
  EQUITY: { label: "Equity", singular: "Equity", sub: "The owner's share", tone: "info" },
  INCOME: { label: "Income", singular: "Income", sub: "What came in", tone: "income" },
  EXPENSE: { label: "Expenses", singular: "Expense", sub: "What went out", tone: "warning" },
};

export const ACCOUNT_TYPES: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];

export type AccountFilter = "ALL" | AccountType;

// Every account in a group's tree, parents before their children, with
// how deep each one sits.
export function flattenAccounts(accounts: Account[], depth = 0): { account: Account; depth: number }[] {
  return accounts.flatMap((account) => [{ account, depth }, ...flattenAccounts(account.children, depth + 1)]);
}

export const groupOf = (groups: AccountGroup[], type: AccountType): Account[] => groups.find((group) => group.accountType === type)?.accounts ?? [];

// A group's balance: its top-level accounts, since a parent's balance
// already holds its children's.
export const groupTotal = (accounts: Account[]): number => accounts.reduce((sum, account) => sum + Number(account.currentBalance), 0);

export interface BooksBalance {
  owns: number;
  owes: number;
  // Equity plus the year's profit (income less expenses).
  share: number;
  balanced: boolean;
}

// What the business owns equals what it owes plus the owner's share.
export function booksBalance(groups: AccountGroup[]): BooksBalance {
  const total = (type: AccountType) => groupTotal(groupOf(groups, type));
  const owns = total("ASSET");
  const owes = total("LIABILITY");
  const share = total("EQUITY") + total("INCOME") - total("EXPENSE");
  return { owns, owes, share, balanced: Math.abs(owns - (owes + share)) < 0.005 };
}

// Matches the name, Bangla name, code or subtype, ignoring case.
export function filterAccounts(rows: { account: Account; depth: number }[], query: string): { account: Account; depth: number }[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(({ account }) => [account.name, account.nameBn ?? "", account.accountNumber ?? "", account.accountSubtype ?? ""].some((text) => text.toLowerCase().includes(q)));
}

// English, passed through t(). The first five can be picked for a new
// account; receivable and payable belong to the two system accounts.
export const SUBTYPE_LABELS: Record<string, string> = { cash: "Cash", bank: "Bank", mfs: "Mobile banking", savings: "Savings", card: "Card", receivable: "What customers owe you", payable: "What you owe suppliers" };

export const ACCOUNT_SUBTYPES = ["cash", "bank", "mfs", "savings", "card"];

export const subtypeLabel = (subtype: string | null): string | null => (subtype ? (SUBTYPE_LABELS[subtype] ?? subtype) : null);

// Whether any account carries a code, so a chart without codes drops the column.
export const hasAccountCodes = (groups: AccountGroup[]): boolean => groups.some((group) => flattenAccounts(group.accounts).some(({ account }) => account.accountNumber));

// An account and everything under it: the ones it cannot be moved under.
export function descendantIds(account: Account): Set<string> {
  return new Set(flattenAccounts([account]).map(({ account: a }) => a.id));
}

// The chart as spreadsheet rows: code, name, type, subtype, balance.
export function accountsCsvRows(groups: AccountGroup[]): (string | number)[][] {
  return groups.flatMap((group) => flattenAccounts(group.accounts).map(({ account }) => [account.accountNumber ?? "", account.name, ACCOUNT_TYPE_META[account.accountType].singular, subtypeLabel(account.accountSubtype) ?? "", Number(account.currentBalance)]));
}

export type ContactsFilter = "ALL" | "CUSTOMER" | "SUPPLIER" | "OWE_YOU" | "YOU_OWE";

export const isCustomer = (contact: Pick<Contact, "type">): boolean => contact.type === "CUSTOMER" || contact.type === "BOTH";
export const isSupplier = (contact: Pick<Contact, "type">): boolean => contact.type === "SUPPLIER" || contact.type === "BOTH";

// Positive: they owe the business. Negative: the business owes them.
export const owedToYou = (contact: Pick<Contact, "currentBalance">): number => Math.max(0, Number(contact.currentBalance));
export const owedByYou = (contact: Pick<Contact, "currentBalance">): number => Math.max(0, -Number(contact.currentBalance));

export interface ContactStats {
  receivable: number;
  receivableFrom: number;
  payable: number;
  payableTo: number;
  customers: number;
  suppliers: number;
  total: number;
}

export function contactStats(contacts: Contact[]): ContactStats {
  return contacts.reduce(
    (stats, contact) => ({
      receivable: stats.receivable + owedToYou(contact),
      receivableFrom: stats.receivableFrom + (owedToYou(contact) > 0 ? 1 : 0),
      payable: stats.payable + owedByYou(contact),
      payableTo: stats.payableTo + (owedByYou(contact) > 0 ? 1 : 0),
      customers: stats.customers + (isCustomer(contact) ? 1 : 0),
      suppliers: stats.suppliers + (isSupplier(contact) ? 1 : 0),
      total: stats.total + 1,
    }),
    { receivable: 0, receivableFrom: 0, payable: 0, payableTo: 0, customers: 0, suppliers: 0, total: 0 },
  );
}

export function filterContacts(contacts: Contact[], filter: ContactsFilter, query: string): Contact[] {
  const q = query.trim().toLowerCase();
  return contacts.filter((contact) => {
    if (filter === "CUSTOMER" && !isCustomer(contact)) return false;
    if (filter === "SUPPLIER" && !isSupplier(contact)) return false;
    if (filter === "OWE_YOU" && owedToYou(contact) <= 0) return false;
    if (filter === "YOU_OWE" && owedByYou(contact) <= 0) return false;
    return q === "" || contact.name.toLowerCase().includes(q) || (contact.phone ?? "").toLowerCase().includes(q) || (contact.email ?? "").toLowerCase().includes(q);
  });
}

// English, passed through t().
export const CONTACT_TYPE_WORD: Record<ContactType, string> = { CUSTOMER: "Customer", SUPPLIER: "Supplier", BOTH: "Customer and supplier", RELATIVE: "Relative", OTHER: "Other" };

// The people as spreadsheet rows: name, type, phone, email, what they owe
// you (negative when you owe them).
export function contactsCsvRows(contacts: Contact[]): (string | number)[][] {
  return contacts.map((contact) => [contact.name, CONTACT_TYPE_WORD[contact.type], contact.phone ?? "", contact.email ?? "", Number(contact.currentBalance)]);
}

export type StatementKind = "sale" | "purchase" | "received" | "paid";

export interface StatementRow {
  id: string;
  date: string;
  kind: StatementKind;
  reference: string | null;
  note: string | null;
  // The wallet a payment went through.
  wallet: string | null;
  amount: number;
  // What they owe you after this row; negative when you owe them.
  running: number;
  // Voided, or the reversal that voided it: shown, but not counted.
  cancelled: boolean;
}

const SETTLEMENT_SUBTYPES = ["receivable", "payable"];

// A payment that credits receivables came in from them; one that debits
// payables went out to them.
function statementKind(transaction: Transaction): StatementKind | null {
  if (transaction.transactionType === "SALE") return "sale";
  if (transaction.transactionType === "PURCHASE") return "purchase";
  if (transaction.transactionType !== "PAYMENT") return null;
  const receivable = transaction.entries.find((entry) => entry.account?.accountSubtype === "receivable");
  if (receivable) return receivable.entryType === "CREDIT" ? "received" : "paid";
  const payable = transaction.entries.find((entry) => entry.account?.accountSubtype === "payable");
  if (payable) return payable.entryType === "DEBIT" ? "paid" : "received";
  return null;
}

// A contact's statement from their postings, oldest first, with what they
// owe you after each one.
export function statementRows(transactions: Transaction[], openingBalance: string | number): StatementRow[] {
  const ordered = [...transactions].sort((a, b) => a.transactionDate.localeCompare(b.transactionDate) || a.createdAt.localeCompare(b.createdAt));
  let running = Number(openingBalance);
  const rows: StatementRow[] = [];
  for (const transaction of ordered) {
    const kind = statementKind(transaction);
    if (!kind) continue;
    const amount = Number(transaction.entries[0]?.amount ?? 0);
    const cancelled = transaction.status === "VOIDED" || transaction.reversalOfId !== null;
    const wallet = kind === "received" || kind === "paid" ? (transaction.entries.find((entry) => !SETTLEMENT_SUBTYPES.includes(entry.account?.accountSubtype ?? ""))?.account?.name ?? null) : null;
    if (!cancelled) running += kind === "sale" || kind === "paid" ? amount : -amount;
    rows.push({ id: transaction.id, date: transaction.transactionDate, kind, reference: transaction.referenceNo, note: transaction.description, wallet, amount, running: Math.round(running * 100) / 100, cancelled });
  }
  return rows;
}

// The newest counted row of the given kinds, for "Last sale … · last payment …".
export const lastRow = (rows: StatementRow[], kinds: StatementKind[]): StatementRow | undefined => [...rows].reverse().find((row) => !row.cancelled && kinds.includes(row.kind));

export const agingRowFor = (report: AgingReport, contactId: string): AgingBucketRow | undefined => report.contacts.find((row) => row.contactId === contactId);

// What is more than 30 days late, and how many people owe it.
export function overdueOver30(report: AgingReport): { amount: number; contacts: number } {
  const late = (row: Pick<AgingBucketRow, "days31to60" | "over60">) => Number(row.days31to60) + Number(row.over60);
  return { amount: late(report.buckets), contacts: report.contacts.filter((row) => late(row) > 0).length };
}

export interface AgingShare {
  key: "current" | "days1to30" | "days31to60" | "over60";
  label: string;
  amount: number;
  // Of the total, 0 to 100.
  pct: number;
  tone: "income" | "warning" | "loans" | "expense";
}

// The four age buckets as shares of the whole, for a bar.
export function agingShares(report: Pick<AgingReport, "buckets">): AgingShare[] {
  const amounts = { current: Number(report.buckets.current), days1to30: Number(report.buckets.days1to30), days31to60: Number(report.buckets.days31to60), over60: Number(report.buckets.over60) };
  const total = amounts.current + amounts.days1to30 + amounts.days31to60 + amounts.over60;
  const pct = (amount: number) => (total > 0 ? Math.round((amount / total) * 1000) / 10 : 0);
  return [
    { key: "current", label: "Not yet due", amount: amounts.current, pct: pct(amounts.current), tone: "income" },
    { key: "days1to30", label: "1–30 days late", amount: amounts.days1to30, pct: pct(amounts.days1to30), tone: "warning" },
    { key: "days31to60", label: "31–60 days late", amount: amounts.days31to60, pct: pct(amounts.days31to60), tone: "loans" },
    { key: "over60", label: "Over 60 days late", amount: amounts.over60, pct: pct(amounts.over60), tone: "expense" },
  ];
}

export const agingTotal = (report: Pick<AgingReport, "buckets">): number => agingShares(report).reduce((sum, share) => sum + share.amount, 0);

// One contact's unpaid invoices sorted into the same four age buckets the
// aging report uses, counted from each due date to today.
export function agingFromInvoices(invoices: { dueDate: string | null; remainingAmount: string }[], today: string): AgingReport["buckets"] {
  const buckets = { current: 0, days1to30: 0, days31to60: 0, over60: 0 };
  for (const invoice of invoices) {
    const remaining = Number(invoice.remainingAmount);
    if (remaining <= 0) continue;
    const late = invoice.dueDate ? daysBetween(invoice.dueDate, today) : 0;
    const key = late <= 0 ? "current" : late <= 30 ? "days1to30" : late <= 60 ? "days31to60" : "over60";
    buckets[key] += remaining;
  }
  return { current: buckets.current.toFixed(2), days1to30: buckets.days1to30.toFixed(2), days31to60: buckets.days31to60.toFixed(2), over60: buckets.over60.toFixed(2) };
}

// Overdue rows folded to one line per contact: the oldest due date and the
// whole amount late.
export interface LateContact {
  contactId: string;
  contactName: string;
  amount: number;
  oldestDescription: string | null;
  oldestDueDate: string;
  daysLate: number;
}

export function lateByContact(rows: OverdueRow[]): LateContact[] {
  const byContact = new Map<string, LateContact>();
  for (const row of rows) {
    const current = byContact.get(row.contactId);
    if (!current) {
      byContact.set(row.contactId, { contactId: row.contactId, contactName: row.contactName, amount: Number(row.remainingAmount), oldestDescription: row.description, oldestDueDate: row.dueDate, daysLate: row.daysOverdue });
    } else {
      current.amount += Number(row.remainingAmount);
      if (row.daysOverdue > current.daysLate) {
        current.daysLate = row.daysOverdue;
        current.oldestDueDate = row.dueDate;
        current.oldestDescription = row.description;
      }
    }
  }
  return [...byContact.values()].sort((a, b) => b.daysLate - a.daysLate);
}

// Whole days between two "YYYY-MM-DD" days (or ISO moments' days).
export const daysBetween = (from: string, to: string): number => Math.round((dayOf(to.slice(0, 10)).getTime() - dayOf(from.slice(0, 10)).getTime()) / 86_400_000);

export interface JournalLine {
  accountId: string;
  note: string;
  debit: string;
  credit: string;
}

export const emptyLine = (): JournalLine => ({ accountId: "", note: "", debit: "", credit: "" });

export interface JournalTotals {
  debit: number;
  credit: number;
  difference: number;
  balanced: boolean;
  // Lines with an account and an amount on one side only.
  complete: boolean;
}

const amountOf = (text: string): number => {
  const n = Number(text.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function journalTotals(lines: JournalLine[]): JournalTotals {
  const debit = lines.reduce((sum, line) => sum + amountOf(line.debit), 0);
  const credit = lines.reduce((sum, line) => sum + amountOf(line.credit), 0);
  const used = lines.filter((line) => amountOf(line.debit) > 0 || amountOf(line.credit) > 0);
  const complete = used.length >= 2 && used.every((line) => line.accountId && !(amountOf(line.debit) > 0 && amountOf(line.credit) > 0));
  const difference = Math.round((debit - credit) * 100) / 100;
  return { debit, credit, difference, balanced: debit > 0 && difference === 0, complete };
}

// The lines as the API takes them: one entry per used line.
export function journalEntries(lines: JournalLine[]): { accountId: string; entryType: "DEBIT" | "CREDIT"; amount: number; note?: string }[] {
  return lines
    .filter((line) => amountOf(line.debit) > 0 || amountOf(line.credit) > 0)
    .map((line) => ({ accountId: line.accountId, entryType: amountOf(line.debit) > 0 ? ("DEBIT" as const) : ("CREDIT" as const), amount: amountOf(line.debit) > 0 ? amountOf(line.debit) : amountOf(line.credit), ...(line.note.trim() ? { note: line.note.trim() } : {}) }));
}
