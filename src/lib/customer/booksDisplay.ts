// The sums behind Books: the accounts grouped the way an accountant reads
// them and whether they balance, an account's ledger figures, the customers
// and suppliers with what is due, the age of what is owed, and a journal
// entry's two columns. Pure, so the pages and their tests agree.
import { banglaDayMonth, banglaShortDay, toBanglaDigits } from "@/lib/i18n/banglaDates";
import { inEnglish, type Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";
import { accountDisplayName } from "./accountDisplay";
import type { Account, AccountGroup, AccountLedger, AccountSummary, AccountType, AgingBucketRow, AgingReport, Contact, ContactBalanceDetail, ContactStatementEntry, ContactType, DirectionBreakdown, InvoiceBreakdown, LanguagePreference, LedgerRow, OverdueRow, Transaction } from "./api";
import { formatDate } from "./date";
import { dayOf } from "./habitDisplay";
import { ledgerDirection } from "./ledger";

const round2 = (value: number): number => Math.round(value * 100) / 100;

// English, passed through t(). "Expense@@account" reads খরচ in Bangla, the
// word the Expenses band uses, where plain "Expense" is the generic ব্যয়.
export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; singular: string; sub: string; tone: "money" | "expense" | "info" | "income" | "warning" }> = {
  ASSET: { label: "Assets", singular: "Asset", sub: "What the business owns", tone: "money" },
  LIABILITY: { label: "Liabilities", singular: "Liability", sub: "What the business owes", tone: "expense" },
  EQUITY: { label: "Equity", singular: "Equity", sub: "The owner's share", tone: "info" },
  INCOME: { label: "Income", singular: "Income", sub: "What came in", tone: "income" },
  EXPENSE: { label: "Expenses", singular: "Expense@@account", sub: "What went out", tone: "warning" },
};

export const ACCOUNT_TYPES: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];

export type AccountFilter = "ALL" | AccountType;

// Siblings in code order (1010 before 1020), accounts without a code last
// in the order the workspace keeps them.
const byCode = (a: Account, b: Account): number => (a.accountNumber && b.accountNumber ? a.accountNumber.localeCompare(b.accountNumber, undefined, { numeric: true }) : a.accountNumber ? -1 : b.accountNumber ? 1 : a.displayOrder - b.displayOrder);

// Every account in a group's tree, parents before their children, with
// how deep each one sits. A single account fetched on its own has no
// children list at all.
export function flattenAccounts(accounts: Account[], depth = 0): { account: Account; depth: number }[] {
  return [...accounts].sort(byCode).flatMap((account) => [{ account, depth }, ...flattenAccounts(account.children ?? [], depth + 1)]);
}

// The account as the chart holds it, children included: a single account
// read on its own comes without them, which the edit drawer needs to keep
// it from moving under its own sub-account.
export function findInChart(groups: AccountGroup[], id: string): Account | undefined {
  return groups.flatMap((group) => flattenAccounts(group.accounts)).find(({ account }) => account.id === id)?.account;
}

export interface YearRow {
  id: string;
  name: string;
  total: number;
}

// Income or expense accounts with what moved through each in the period,
// largest first, zeros dropped. For an income account money "in" is what
// was earned; for an expense account it is what was spent.
export function yearRows(accounts: { id: string; name: string; totalIn: string; totalOut: string }[]): { rows: YearRow[]; total: number } {
  const rows = accounts.map((account) => ({ id: account.id, name: account.name, total: round2(Number(account.totalIn) - Number(account.totalOut)) })).filter((row) => row.total !== 0).sort((a, b) => b.total - a.total);
  return { rows, total: round2(rows.reduce((sum, row) => sum + row.total, 0)) };
}

export const groupOf = (groups: AccountGroup[], type: AccountType): Account[] => groups.find((group) => group.accountType === type)?.accounts ?? [];

// A group's balance: every account in it, since a parent's balance is its
// own and not its children's.
export const groupTotal = (accounts: Account[]): number => flattenAccounts(accounts).reduce((sum, { account }) => sum + Number(account.currentBalance), 0);

// The types whose balance a debit grows (the backend's isDebitPositive()).
const DEBIT_NORMAL: AccountType[] = ["ASSET", "EXPENSE"];

export interface BooksBalance {
  owns: number;
  owes: number;
  // Equity plus profit (income less expenses) plus the opening balances.
  share: number;
  // What the accounts started with, signed the way each one grows. An
  // opening balance is posted with no other side, so it belongs to the
  // owner's share; left out, the two sides would differ by exactly this.
  opening: number;
  // What is still unexplained once the opening balances count: 0 when the
  // books balance.
  gap: number;
  balanced: boolean;
}

// What the business owns equals what it owes plus the owner's share.
export function booksBalance(groups: AccountGroup[]): BooksBalance {
  const total = (type: AccountType) => groupTotal(groupOf(groups, type));
  const opening = round2(groups.reduce((sum, group) => sum + flattenAccounts(group.accounts).reduce((inner, { account }) => inner + (DEBIT_NORMAL.includes(account.accountType) ? 1 : -1) * Number(account.openingBalance), 0), 0));
  const owns = round2(total("ASSET"));
  const owes = round2(total("LIABILITY"));
  const share = round2(total("EQUITY") + total("INCOME") - total("EXPENSE") + opening);
  const gap = round2(owns - (owes + share));
  return { owns, owes, share, opening, gap, balanced: Math.abs(gap) < 0.005 };
}

// Matches the name, Bangla name, code or subtype, ignoring case.
export function filterAccounts(rows: { account: Account; depth: number }[], query: string): { account: Account; depth: number }[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(({ account }) => [account.name, account.nameBn ?? "", account.accountNumber ?? "", account.accountSubtype ?? ""].some((text) => text.toLowerCase().includes(q)));
}

// English, passed through t(). The first five can be picked for a new
// account. The rest only come from the app: receivable and payable on the
// two system accounts, the assets' pooled cost account and the referral
// payouts' income account (both made on first use), and a loan account an
// admin's account template can seed.
export const SUBTYPE_LABELS: Record<string, string> = {
  cash: "Cash",
  bank: "Bank",
  mfs: "Mobile banking",
  savings: "Savings",
  card: "Card",
  receivable: "What customers owe you",
  payable: "What you owe suppliers",
  "fixed-assets": "Fixed assets",
  "referral-bonus": "Referral bonus",
  loan: "Loan",
};

export const ACCOUNT_SUBTYPES = ["cash", "bank", "mfs", "savings", "card"];

export const subtypeLabel = (subtype: string | null): string | null => (subtype ? (SUBTYPE_LABELS[subtype] ?? subtype) : null);

// The kinds the app looks a system account up by and posts through (the
// backend's RESERVED_ACCOUNT_SUBTYPES).
const APP_MANAGED_SUBTYPES = ["receivable", "payable", "fixed-assets", "referral-bonus"];

// A system account the backend refuses to archive or remove: one of the
// kinds above, or the hidden savings pool every workspace gets (a savings
// account the owner adds is not a system one). Books offers neither for it.
export const isAppManagedAccount = (account: Pick<Account, "isSystemAccount" | "accountType" | "accountSubtype">): boolean =>
  account.isSystemAccount && (APP_MANAGED_SUBTYPES.includes(account.accountSubtype ?? "") || (account.accountType === "ASSET" && account.accountSubtype === "savings"));

// Whether any account carries a code, so a chart without codes drops the column.
export const hasAccountCodes = (groups: AccountGroup[]): boolean => groups.some((group) => flattenAccounts(group.accounts).some(({ account }) => account.accountNumber));

// An account and everything under it: the ones it cannot be moved under.
export function descendantIds(account: Account): Set<string> {
  return new Set(flattenAccounts([account]).map(({ account: a }) => a.id));
}

// The chart as spreadsheet rows: code, name, type, kind, balance, in the
// reader's language (the name as the chart shows it).
export function accountsCsvRows(groups: AccountGroup[], t: Translate = inEnglish, language: LanguagePreference = "EN"): (string | number)[][] {
  return groups.flatMap((group) =>
    flattenAccounts(group.accounts).map(({ account }) => {
      const kind = subtypeLabel(account.accountSubtype);
      return [account.accountNumber ?? "", accountDisplayName(account, language), t(ACCOUNT_TYPE_META[account.accountType].singular), kind ? t(kind) : "", Number(account.currentBalance)];
    }),
  );
}

// The asset kinds that hold money: the wallets, a card, a savings wallet.
const MONEY_SUBTYPES = ["cash", "bank", "mfs", "card", "savings"];

export const isMoneyAccount = (account: Pick<Account, "accountType" | "accountSubtype">): boolean => account.accountType === "ASSET" && MONEY_SUBTYPES.includes(account.accountSubtype ?? "");

export interface LedgerWords {
  // English keys, passed through t().
  in: string;
  out: string;
  // Money really moved: the in/out columns take the income and expense
  // colours. Elsewhere (rent, a receivable, a loan) a debit only grows the
  // balance, so the columns stay in ink.
  money: boolean;
}

// What an account's two columns are called: money in and out of a wallet,
// or the balance going up and down on every other account.
export function ledgerWords(account: Pick<Account, "accountType" | "accountSubtype">): LedgerWords {
  return isMoneyAccount(account) ? { in: "Money in@@ledger", out: "Money out@@ledger", money: true } : { in: "Increase@@ledger", out: "Decrease@@ledger", money: false };
}

// An entry as it moves the balance: + when it grows it, − when it shrinks it.
export const signedEntry = (row: Pick<LedgerRow, "entryType" | "amount">, accountType: AccountType): number => (ledgerDirection(row.entryType, accountType) === "in" ? 1 : -1) * Number(row.amount);

export interface LedgerFigures {
  // The balance before the period and at its end: the same on every page.
  opening: number;
  closing: number;
  // The running balance before this page's first row and after its last:
  // the brought forward and carried forward lines.
  pageOpening: number;
  pageClosing: number;
  firstPage: boolean;
  lastPage: boolean;
  // closing − opening.
  change: number;
  // The part of the change that in − out ± transfers leaves out: entries
  // voided, and the reversals that cancelled them, when the two fall in
  // different periods (a reversal is dated the day of the void).
  voided: number;
}

// An account's figures for one page of its ledger. The page fields came
// with the backend fix that made closingBalance the period's; an older one
// sends the running balance at the page's end there, so the period's
// closing is then worked out from the summary (exact on the last page).
export function ledgerFigures(ledger: Pick<AccountLedger, "balanceBroughtForward" | "closingBalance" | "pageOpeningBalance" | "pageClosingBalance" | "entries" | "meta">, accountType: AccountType, summary: Pick<AccountSummary, "totalIn" | "totalOut" | "adjustment">): LedgerFigures {
  const firstPage = ledger.meta.page <= 1;
  const lastPage = ledger.meta.page >= ledger.meta.totalPages;
  const opening = Number(ledger.balanceBroughtForward);
  const movement = round2(Number(summary.totalIn) - Number(summary.totalOut) + Number(summary.adjustment));
  const current = ledger.pageClosingBalance !== undefined;
  const first = ledger.entries[0];
  const last = ledger.entries[ledger.entries.length - 1];
  const pageOpening = ledger.pageOpeningBalance !== undefined ? Number(ledger.pageOpeningBalance) : first ? Number(first.runningBalance) - signedEntry(first, accountType) : opening;
  const pageClosing = current ? Number(ledger.pageClosingBalance) : last ? Number(last.runningBalance) : pageOpening;
  const closing = current || lastPage ? Number(ledger.closingBalance) : round2(opening + movement);
  const change = round2(closing - opening);
  return { opening, closing, pageOpening: round2(pageOpening), pageClosing: round2(pageClosing), firstPage, lastPage, change, voided: round2(change - movement) };
}

export interface BooksDateOptions {
  // Today, "YYYY-MM-DD": a day in another year shows its year.
  today?: string;
  weekday?: boolean;
  // "auto" adds the year outside today's year (always, without a today).
  year?: "auto" | "always" | "never";
}

// A Books date in the reader's words: "Mon, 3 Jun" this year, "Mon, 3 Jun
// 2025" before it, "সোম, ৩ জুন" in Bangla, in the platform timezone. Noon
// UTC stands for the day, so no timezone moves it.
export function booksDate(value: string, locale: Locale, { today, weekday = false, year = "auto" }: BooksDateOptions = {}): string {
  const day = formatDate(value, "yyyy-MM-dd");
  const showYear = year === "always" || (year === "auto" && (!today || today.slice(0, 4) !== day.slice(0, 4)));
  if (locale === "bn") {
    const words = weekday ? banglaShortDay(day) : banglaDayMonth(day);
    return showYear ? `${words} ${toBanglaDigits(day.slice(0, 4))}` : words;
  }
  return formatDate(`${day}T12:00:00.000Z`, `${weekday ? "EEE, " : ""}d MMM${showYear ? " yyyy" : ""}`);
}

// "1 Sep – 2 Oct 2026": the span a period covers, in the reader's words.
export function booksRange(from: string | undefined, to: string | undefined, locale: Locale): string | null {
  if (from && to) return `${booksDate(from, locale, { year: from.slice(0, 4) === to.slice(0, 4) ? "never" : "always" })} – ${booksDate(to, locale, { year: "always" })}`;
  const one = from ?? to;
  return one ? booksDate(one, locale, { year: "always" }) : null;
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

// English, passed through t(). "Customer@@books" reads ক্রেতা, as the rest
// of Books does, where plain "Customer" is the admin side's গ্রাহক.
export const CONTACT_TYPE_WORD: Record<ContactType, string> = { CUSTOMER: "Customer@@books", SUPPLIER: "Supplier", BOTH: "Customer and supplier", RELATIVE: "Relative", BANK: "Bank", NGO: "NGO", OTHER: "Other" };

// The people as spreadsheet rows: name, type, phone, email, what they owe
// you (negative when you owe them), the type in the reader's language.
export function contactsCsvRows(contacts: Contact[], t: Translate = inEnglish): (string | number)[][] {
  return contacts.map((contact) => [contact.name, t(CONTACT_TYPE_WORD[contact.type]), contact.phone ?? "", contact.email ?? "", Number(contact.currentBalance)]);
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
// owe you after each one. Only for a backend without the statement
// endpoint: it has just the newest 50 postings to work from.
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
    rows.push({ id: transaction.id, date: transaction.transactionDate, kind, reference: transaction.referenceNo, note: transaction.description, wallet, amount, running: round2(running), cancelled });
  }
  return rows;
}

// The statement endpoint's rows in the same shape; the server worked out
// the running balance over the whole history.
export const statementRowsFromApi = (entries: ContactStatementEntry[]): StatementRow[] =>
  entries.map((entry) => ({ id: entry.transactionId, date: entry.date, kind: entry.kind, reference: entry.referenceNo, note: entry.description, wallet: entry.wallet, amount: Number(entry.amount), running: Number(entry.runningBalance), cancelled: entry.cancelled }));

// The newest counted row of the given kinds, for "Last sale … · Last payment …".
export const lastRow = (rows: StatementRow[], kinds: StatementKind[]): StatementRow | undefined => [...rows].reverse().find((row) => !row.cancelled && kinds.includes(row.kind));

export const agingRowFor = (report: AgingReport, contactId: string): AgingBucketRow | undefined => report.contacts.find((row) => row.contactId === contactId);

// The aging report narrowed to some contacts (Books' customers and
// suppliers, without Loans' lenders and borrowers), its totals summed again
// from the rows that are left.
export function agingFor(report: AgingReport, ids: ReadonlySet<string>): AgingReport {
  const contacts = report.contacts.filter((row) => ids.has(row.contactId));
  const sum = (key: "current" | "days1to30" | "days31to60" | "over60") => round2(contacts.reduce((total, row) => total + Number(row[key]), 0)).toFixed(2);
  return { buckets: { current: sum("current"), days1to30: sum("days1to30"), days31to60: sum("days31to60"), over60: sum("over60") }, contacts };
}

// What is more than 30 days late, and how many people owe it.
export function overdueOver30(report: AgingReport): { amount: number; contacts: number } {
  const late = (row: Pick<AgingBucketRow, "days31to60" | "over60">) => Number(row.days31to60) + Number(row.over60);
  return { amount: late(report.buckets), contacts: report.contacts.filter((row) => late(row) > 0).length };
}

export interface AgingShare {
  // "opening" is what was owed from before Books: it has no due date.
  key: "current" | "days1to30" | "days31to60" | "over60" | "opening";
  label: string;
  amount: number;
  // Of the total, 0 to 100.
  pct: number;
  tone: "income" | "warning" | "loans" | "expense" | "neutral";
}

// The four age buckets as shares of the whole, for a bar; with fromBefore,
// a fifth for what was owed from before Books.
export function agingShares(report: Pick<AgingReport, "buckets">, fromBefore = 0): AgingShare[] {
  const amounts = { current: Number(report.buckets.current), days1to30: Number(report.buckets.days1to30), days31to60: Number(report.buckets.days31to60), over60: Number(report.buckets.over60) };
  const opening = Math.max(0, fromBefore);
  const total = amounts.current + amounts.days1to30 + amounts.days31to60 + amounts.over60 + opening;
  const pct = (amount: number) => (total > 0 ? Math.round((amount / total) * 1000) / 10 : 0);
  const shares: AgingShare[] = [
    { key: "current", label: "Not yet due", amount: amounts.current, pct: pct(amounts.current), tone: "income" },
    { key: "days1to30", label: "1–30 days late", amount: amounts.days1to30, pct: pct(amounts.days1to30), tone: "warning" },
    { key: "days31to60", label: "31–60 days late", amount: amounts.days31to60, pct: pct(amounts.days31to60), tone: "loans" },
    { key: "over60", label: "Over 60 days late", amount: amounts.over60, pct: pct(amounts.over60), tone: "expense" },
  ];
  if (opening > 0) shares.push({ key: "opening", label: "From before Books", amount: opening, pct: pct(opening), tone: "neutral" });
  return shares;
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

export interface SideOwed {
  // The unpaid sales (or purchases), oldest first.
  invoices: InvoiceBreakdown[];
  onInvoices: number;
  // What was owed from before Books (the contact's opening balance) and is
  // still unpaid. It is on no invoice, so the aging never sees it.
  fromBefore: number;
  // Everything a payment on this side can settle.
  total: number;
}

// openingRemaining comes with the balance detail; an older backend leaves
// it out, and then what the balance holds beyond this side's invoices
// stands in for it.
type WithOpening = DirectionBreakdown & { openingRemaining?: string };

function sideOwed(side: WithOpening, beyondInvoices: number): SideOwed {
  const invoices = side.transactions.filter((invoice) => Number(invoice.remainingAmount) > 0);
  const onInvoices = round2(invoices.reduce((sum, invoice) => sum + Number(invoice.remainingAmount), 0));
  const fromBefore = side.openingRemaining !== undefined ? Math.max(0, Number(side.openingRemaining)) : Math.max(0, round2(beyondInvoices - onInvoices));
  return { invoices, onInvoices, fromBefore, total: round2(onInvoices + fromBefore) };
}

// What one contact owes the business (receivable) and the business owes
// them (payable), each with its invoices and what was owed from before.
export function contactOwed(detail: Pick<ContactBalanceDetail, "receivable" | "payable">, currentBalance: number): { receivable: SideOwed; payable: SideOwed } {
  return { receivable: sideOwed(detail.receivable, Math.max(0, currentBalance)), payable: sideOwed(detail.payable, Math.max(0, -currentBalance)) };
}

// Overdue rows folded to one line per contact: the oldest due date and the
// amount late. With overDays, only what is more than that many days late
// counts, so an "Over 30 days" list never adds in a bill 10 days late.
export interface LateContact {
  contactId: string;
  contactName: string;
  amount: number;
  oldestDescription: string | null;
  oldestDueDate: string;
  daysLate: number;
}

export function lateByContact(rows: OverdueRow[], overDays?: number): LateContact[] {
  const byContact = new Map<string, LateContact>();
  for (const row of rows) {
    if (overDays !== undefined && row.daysOverdue <= overDays) continue;
    const current = byContact.get(row.contactId);
    if (!current) {
      byContact.set(row.contactId, { contactId: row.contactId, contactName: row.contactName, amount: Number(row.remainingAmount), oldestDescription: row.description, oldestDueDate: row.dueDate, daysLate: row.daysOverdue });
    } else {
      current.amount = round2(current.amount + Number(row.remainingAmount));
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

// A line with an amount but no account yet: the entry can't be saved.
export const lineNeedsAccount = (line: JournalLine): boolean => (amountOf(line.debit) > 0 || amountOf(line.credit) > 0) && !line.accountId;

// Any line holding an amount: what Cancel would throw away.
export const hasJournalAmounts = (lines: JournalLine[]): boolean => lines.some((line) => amountOf(line.debit) > 0 || amountOf(line.credit) > 0);

export function journalTotals(lines: JournalLine[]): JournalTotals {
  const debit = lines.reduce((sum, line) => sum + amountOf(line.debit), 0);
  const credit = lines.reduce((sum, line) => sum + amountOf(line.credit), 0);
  const used = lines.filter((line) => amountOf(line.debit) > 0 || amountOf(line.credit) > 0);
  const complete = used.length >= 2 && used.every((line) => line.accountId && !(amountOf(line.debit) > 0 && amountOf(line.credit) > 0));
  const difference = round2(debit - credit);
  return { debit, credit, difference, balanced: debit > 0 && difference === 0, complete };
}

// The lines as the API takes them: one entry per used line.
export function journalEntries(lines: JournalLine[]): { accountId: string; entryType: "DEBIT" | "CREDIT"; amount: number; note?: string }[] {
  return lines
    .filter((line) => amountOf(line.debit) > 0 || amountOf(line.credit) > 0)
    .map((line) => ({ accountId: line.accountId, entryType: amountOf(line.debit) > 0 ? ("DEBIT" as const) : ("CREDIT" as const), amount: amountOf(line.debit) > 0 ? amountOf(line.debit) : amountOf(line.credit), ...(line.note.trim() ? { note: line.note.trim() } : {}) }));
}
