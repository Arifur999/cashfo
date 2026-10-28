import { formatCount } from "@/lib/i18n/digits";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";
import { localName, type Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";
import { paginate } from "@/lib/table/paginate";
import type { ContactBalanceDetail, ContactType, LoanBalanceDirection, LoanStatementRow, Transaction } from "./api";
import { toEnglishDigits } from "./money";
import { cancelledLabel } from "./transactionDisplay";
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
// "1 bank and 1 NGO" once banks and NGOs are among them. Counts are in the
// reader's digits.
export function whoPhrase(kinds: (ContactType | undefined)[], t: Translate, locale: FormatLocale = "en"): string {
  const banks = kinds.filter((kind) => kind === "BANK").length;
  const ngos = kinds.filter((kind) => kind === "NGO").length;
  const others = kinds.length - banks - ngos;
  const count = (value: number) => formatCount(value, locale);
  const parts = [
    others > 0 || kinds.length === 0 ? t(others === 1 ? "{count} contact" : "{count} contacts", { count: count(others) }) : null,
    banks > 0 ? t(banks === 1 ? "{count} bank" : "{count} banks", { count: count(banks) }) : null,
    ngos > 0 ? t(ngos === 1 ? "{count} NGO" : "{count} NGOs", { count: count(ngos) }) : null,
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
  // The tile behind a balance inside a card.
  box: string;
}

export const DIRECTION_META: Record<LoanBalanceDirection, DirectionMeta> = {
  PAWNA: { name: "Pawna", label: "They owe you", short: "owes you", chip: "income", text: "text-income", box: "bg-mint-50/50" },
  DENA: { name: "Dena", label: "You owe them", short: "you owe", chip: "expense", text: "text-expense", box: "bg-expense-soft/50" },
  SETTLED: { name: "Settled", label: "Nothing outstanding", short: "Settled", chip: "neutral", text: "text-ink-muted", box: "bg-strip" },
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

// "Paid from@@loan": the wallet a loan or repayment left, which another
// area's plain "Paid from" (a status, "was paid") would misword in Bangla.
export const LOAN_ENTRY_META: Record<LoanEntryKind, LoanEntryMeta> = {
  GIVE_LOAN: { title: "Gave a loan", sub: "Money out · they owe you", flow: "out", walletLabel: "Paid from@@loan", save: "Save loan", effect: "PAWNA", effectSign: "+", effectSub: "They owe you more" },
  TAKE_LOAN: { title: "Took a loan", sub: "Money in · you owe them", flow: "in", walletLabel: "Money came into", save: "Save loan", effect: "DENA", effectSign: "+", effectSub: "You owe more" },
  RECEIVE_PAYMENT: { title: "Got money back", sub: "Money in · they owe less", flow: "in", walletLabel: "Money came into", save: "Save payment", effect: "PAWNA", effectSign: "−", effectSub: "They owe you less" },
  MAKE_PAYMENT: { title: "Paid back", sub: "Money out · you owe less", flow: "out", walletLabel: "Paid from@@loan", save: "Save payment", effect: "DENA", effectSign: "−", effectSub: "You owe less" },
};

export const LOAN_ENTRY_KINDS = Object.keys(LOAN_ENTRY_META) as LoanEntryKind[];

// A statement row as the API sends it (an older backend leaves out
// reversalOfId and cancelled).
export type StatementRow = LoanStatementRow;

// A voided posting, or the reversal that undid it: listed, never counted.
export const isCancelledRow = (row: StatementRow): boolean => row.cancelled ?? (row.status === "VOIDED" || !!row.reversalOfId);

// A statement's profit, cancelled rows left out: paid and received, and the
// months each was in.
export function statementProfit(rows: StatementRow[]): { paid: number; received: number; paidMonths: number; receivedMonths: number } {
  const live = rows.filter((row) => !isCancelledRow(row));
  const months = (pick: (row: StatementRow) => string | null) => new Set(live.filter((row) => Number(pick(row) ?? 0) > 0).map((row) => row.date.slice(0, 7))).size;
  return {
    paid: live.reduce((sum, row) => sum + Number(row.profitPaid ?? 0), 0),
    received: live.reduce((sum, row) => sum + Number(row.profitReceived ?? 0), 0),
    paidMonths: months((row) => row.profitPaid),
    receivedMonths: months((row) => row.profitReceived),
  };
}

// Principal in (credit, money that came to you) and out (debit, money you
// paid), over the rows that still stand: a voided loan and its reversal
// moved nothing.
export function statementTotals(rows: StatementRow[]): { received: number; paid: number } {
  return rows.reduce((sum, row) => (isCancelledRow(row) ? sum : { received: sum.received + Number(row.credit ?? 0), paid: sum.paid + Number(row.debit ?? 0) }), { received: 0, paid: 0 });
}

export interface StatementEquation {
  // The side the sum is read from.
  side: LoanBalanceDirection;
  // The opening counted on that side: below zero when it stood on the other.
  opening: number;
  // The principal that raised the balance on that side, and what lowered it.
  raised: number;
  lowered: number;
  closing: number;
}

// The statement card's sum, opening + raised − lowered = closing, read from
// one side so its figures add up: the closing balance's, or the opening's
// once the closing is settled (you owed ৳50,000 and paid it all back). For
// someone you owe, what you took raises it and what you paid back lowers
// it; for someone who owes you, the other way round. An opening on the
// other side counts as a minus: ৳10,000 pawna, then a ৳30,000 loan taken,
// is −10,000 + 30,000 − 0 = ৳20,000 dena. The balance is pawna-positive,
// so closing = opening + paid − received.
export function statementEquation(opening: number, closing: number, received: number, paid: number): StatementEquation {
  const closingSide = loanDirection(closing);
  const side = closingSide === "SETTLED" ? loanDirection(opening) : closingSide;
  const owe = side === "DENA";
  // 0 - opening rather than -opening, so an opening of 0 stays 0, not -0.
  return { side, opening: owe ? 0 - opening : opening, raised: owe ? received : paid, lowered: owe ? paid : received, closing: Math.abs(closing) };
}

export interface StatementPage {
  rows: StatementRow[];
  page: number;
  totalPages: number;
  total: number;
  // Only page 1 opens on the opening balance; a later one opens on what the
  // page before it closed on.
  firstPage: boolean;
  // Only the last page closes the statement; any other carries its balance on.
  lastPage: boolean;
  broughtForward: number;
  carriedForward: number;
}

// One page of a loan statement and the balances at its edges. Each row
// carries the balance after it (a cancelled row, the balance it left
// alone), so a page closes on its last row's and the next page opens on the
// same figure. A ?page past the end shows the last page; an empty statement
// is one page that opens and closes on the opening balance. A size of
// Infinity puts the whole statement on one page, for paper.
export function statementPageEdges(rows: readonly StatementRow[], page: number, size: number, opening: number): StatementPage {
  const paged = paginate(rows, page, size);
  const firstPage = paged.page <= 1;
  // A later page only exists while the size is a real one, smaller than the
  // statement, so the row before the page is at (page - 1) * size - 1.
  const perPage = Math.max(Math.floor(size) || 1, 1);
  const broughtForward = firstPage ? opening : Number(rows[(paged.page - 1) * perPage - 1].runningPrincipal);
  const last = paged.rows[paged.rows.length - 1];
  return { ...paged, firstPage, lastPage: paged.page >= paged.totalPages, broughtForward, carriedForward: last ? Number(last.runningPrincipal) : broughtForward };
}

export type LedgerItem = { kind: "row"; row: StatementRow } | { kind: "more"; key: string; rows: StatementRow[]; paid: boolean };

// Which way a standing profit row went; null for a row that never folds (a
// principal row, or a cancelled one, which is always shown on its own).
const profitWay = (row: StatementRow): "paid" | "received" | null => {
  if (row.category !== "Profit" || isCancelledRow(row)) return null;
  return Number(row.profitPaid ?? 0) > 0 ? "paid" : "received";
};

// A long run of profit rows one way (a monthly payment) shows its first two
// and last two, with the rest folded into one row between them, as the
// board draws it. Paid and received never share a run, so the folded row's
// count and sum always agree.
export function foldProfitRuns(rows: StatementRow[], keep = 2): LedgerItem[] {
  const items: LedgerItem[] = [];
  let run: StatementRow[] = [];
  let runWay: "paid" | "received" | null = null;
  const flush = () => {
    if (run.length > keep * 2 + 1) {
      items.push(...run.slice(0, keep).map((row) => ({ kind: "row" as const, row })));
      items.push({ kind: "more", key: run[keep].transactionId, rows: run.slice(keep, -keep), paid: runWay === "paid" });
      items.push(...run.slice(-keep).map((row) => ({ kind: "row" as const, row })));
    } else {
      items.push(...run.map((row) => ({ kind: "row" as const, row })));
    }
    run = [];
    runWay = null;
  };
  for (const row of rows) {
    const way = profitWay(row);
    if (way && way === runWay) {
      run.push(row);
      continue;
    }
    flush();
    if (way) {
      run = [row];
      runWay = way;
    } else {
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

// The balance-detail API's two sides, with what is still unpaid of the
// contact's opening balance on each (an older backend leaves it out).
export type LoanBalanceDetail = ContactBalanceDetail;

// The most a repayment can be, as the API checks it: what is still owed on
// that side (its loans, and its part of the opening balance). "Got money
// back" settles what they owe you, "Paid back" what you owe them. Null when
// it can't be told (no detail, an older API, or not a repayment), so
// nothing is capped and the API still has the last word.
export function repaymentLimit(detail: LoanBalanceDetail | null | undefined, kind: LoanEntryKind): number | null {
  if (!detail || (kind !== "RECEIVE_PAYMENT" && kind !== "MAKE_PAYMENT")) return null;
  const side = kind === "RECEIVE_PAYMENT" ? detail.receivable : detail.payable;
  if (side?.openingRemaining === undefined) return null;
  const owed = Number(side.remaining) + Number(side.openingRemaining);
  return Number.isFinite(owed) ? Math.max(0, Math.round(owed * 100) / 100) : null;
}

export interface LoanEntry {
  kind: LoanEntryKind;
  amount: number;
  // The wallet the money moved through, when the entry carries one.
  wallet: string | null;
}

const walletEntry = (transaction: Pick<Transaction, "entries">) => transaction.entries.find((entry) => entry.account?.accountSubtype && (WALLET_TYPES as readonly string[]).includes(entry.account.accountSubtype));

// Reads a loan entry back out of a transaction: the type says loan or
// repayment, and the wallet side says which way the money went. A reversal
// keeps the kind of the entry it undid (its wallet side is flipped). Null
// for anything that isn't one of the four. The wallet is named in the
// reader's language.
export function loanEntryOf(transaction: Pick<Transaction, "transactionType" | "entries"> & { reversalOfId?: string | null }, locale: Locale = "en"): LoanEntry | null {
  const money = walletEntry(transaction);
  const amount = Number(money?.amount ?? transaction.entries[0]?.amount ?? 0);
  const wallet = money?.account ? localName(locale, money.account) : null;
  switch (transaction.transactionType) {
    case "SALE":
      return { kind: "GIVE_LOAN", amount, wallet };
    case "PURCHASE":
      return { kind: "TAKE_LOAN", amount, wallet };
    case "PAYMENT": {
      if (!money) return null;
      const received = (money.entryType === "DEBIT") !== Boolean(transaction.reversalOfId);
      return { kind: received ? "RECEIVE_PAYMENT" : "MAKE_PAYMENT", amount, wallet };
    }
    default:
      return null;
  }
}

export interface LoanProfit {
  paid: boolean;
  amount: number;
  wallet: string | null;
  // What it was filed under (the category's name).
  category: string | null;
}

// A loan's profit or interest: an expense (paid) or an income (received)
// posted with the contact; what it was filed under, and the wallet.
export function loanProfitOf(transaction: Pick<Transaction, "transactionType" | "entries">, locale: Locale = "en"): LoanProfit | null {
  if (transaction.transactionType !== "INCOME" && transaction.transactionType !== "EXPENSE") return null;
  const money = walletEntry(transaction);
  const filed = transaction.entries.find((entry) => entry !== money);
  return {
    paid: transaction.transactionType === "EXPENSE",
    amount: Number(money?.amount ?? filed?.amount ?? 0),
    wallet: money?.account ? localName(locale, money.account) : null,
    category: filed?.categoryId ?? (filed?.account ? localName(locale, filed.account) : null),
  };
}

export interface LoanPaymentRow {
  entry: LoanEntry | null;
  profit: LoanProfit | null;
  // What the row is called (an English key), or null for a posting that is
  // neither a loan entry nor profit.
  title: string | null;
  // Money in positive, money out negative. A reversal moved the money back,
  // so it goes the other way from the entry it undid.
  signedAmount: number;
  wallet: string | null;
  cancelled: "Voided" | "Reversal" | null;
}

// One row of Loan payments, read from its transaction, its wallet named in
// the reader's language.
export function loanPaymentRow(transaction: Pick<Transaction, "transactionType" | "entries" | "status" | "reversalOfId">, locale: Locale = "en"): LoanPaymentRow {
  const entry = loanEntryOf(transaction, locale);
  const profit = loanProfitOf(transaction, locale);
  const inward = profit ? !profit.paid : entry ? LOAN_ENTRY_META[entry.kind].flow === "in" : null;
  const amount = profit?.amount ?? entry?.amount ?? 0;
  const moved = inward === null ? null : transaction.reversalOfId ? !inward : inward;
  return {
    entry,
    profit,
    title: profit ? (profit.paid ? "Paid profit" : "Received profit") : entry ? LOAN_ENTRY_META[entry.kind].title : null,
    signedAmount: moved === null ? 0 : moved ? amount : -amount,
    wallet: (profit ?? entry)?.wallet ?? null,
    cancelled: cancelledLabel(transaction),
  };
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

const digitsOf = (text: string) => toEnglishDigits(text).replace(/\D/g, "");

// A contact found by name or phone. Bangla digits count as English ones,
// and a number is compared digit by digit, so "01711 22", "০১৭১১" and
// "01711-22" all find 01711-223344.
export function contactMatches(name: string, phone: string | null | undefined, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const lowerName = name.toLowerCase();
  if (lowerName.includes(q) || lowerName.includes(toEnglishDigits(q))) return true;
  if (/[^\d০-৯\s+()-]/.test(q)) return false;
  const digits = digitsOf(q);
  return digits.length > 0 && digitsOf(phone ?? "").includes(digits);
}

// The server actions' own fallbacks, said the loan way.
const FALLBACKS: Record<string, string> = {
  "Failed to record credit sale": "Couldn't save the loan",
  "Failed to record credit purchase": "Couldn't save the loan",
  "Failed to record payment": "Couldn't save the payment",
  "Failed to add income": "Couldn't save the profit entry",
  "Failed to add expense": "Couldn't save the profit entry",
};

// An error from the API (or an action's fallback) in the reader's words.
// The API writes some with raw figures in them ("exceeds the total
// outstanding balance (5000.00)"); those are reworded around the amount,
// shown as money. Anything else goes through t() as it is, so a message the
// dictionary knows reads in Bangla.
export function loanErrorText(message: string | undefined, fallback: string, t: Translate, money: (amount: number) => string): string {
  if (!message) return t(fallback);
  const over = /exceeds the (?:total outstanding|remaining) balance \((-?[\d.]+)\)/.exec(message);
  if (over) return t("That's more than is owed. It can be {amount} at most.", { amount: money(Number(over[1])) });
  const unsettled = /^This contact still has an outstanding balance of (-?[\d.]+)\./.exec(message);
  if (unsettled) return t("This contact still has a balance of {amount}. Settle it before archiving.", { amount: money(Number(unsettled[1])) });
  // The API only lets a customer or a "both" contact take a sale, and a
  // supplier or "both" a purchase, even for a loan.
  if (/^This contact must be a (?:Customer|Supplier)/.test(message)) return t("A loan with this kind of contact can't be saved yet. Change them to Person, then try again.");
  return t(FALLBACKS[message] ?? message);
}

// The soft colours a phone list gives its avatars, picked by name so one
// person always gets the same one.
const AVATAR_TONES = ["bg-info-soft text-info", "bg-pillar-insights-soft text-pillar-insights", "bg-pillar-loans-soft text-pillar-loans", "bg-pillar-habits-soft text-pillar-habits", "bg-mint-50 text-income", "bg-surface-sunken text-ink-muted"];

export function avatarTone(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}
