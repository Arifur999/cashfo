import type { Translate } from "@/lib/i18n/message";
import type { AccountLedger, AccountSummary, AccountType, EntryType, TransactionType } from "./api";
import { formatDate } from "./date";
import { isIsoDay } from "./dateRangePresets";

// Same rule as the backend's isDebitPositive() -- duplicated here (not
// shared code across the frontend/backend boundary) purely to decide which
// statement column ("In" vs "Out") a DEBIT/CREDIT entry lands in.
export function isDebitPositive(accountType: AccountType): boolean {
  return accountType === "ASSET" || accountType === "EXPENSE";
}

// Whether an entry brought money into the account or took it out.
export function ledgerDirection(entryType: EntryType, accountType: AccountType): "in" | "out" {
  return (entryType === "DEBIT") === isDebitPositive(accountType) ? "in" : "out";
}

// The chip colour for a statement row's type.
export const LEDGER_TYPE_TONE: Record<TransactionType, "income" | "expense" | "info" | "neutral"> = {
  INCOME: "income",
  EXPENSE: "expense",
  TRANSFER: "info",
  JOURNAL: "neutral",
  SALE: "income",
  PURCHASE: "expense",
  PAYMENT: "neutral",
};

// Cash, bank and mobile wallets, and the savings wallets goals are kept in.
const MONEY_SUBTYPES = new Set(["cash", "bank", "mfs", "savings"]);

// Whether a statement reads the account as money: what comes in is money in
// (green) and what goes out money out (red). Any other account -- an expense
// category, a receivable -- only goes up or down, and a purchase landing on
// an expense category is no "money in".
export function readsAsMoney(account: { accountType: AccountType; accountSubtype: string | null }): boolean {
  return account.accountType === "ASSET" && MONEY_SUBTYPES.has(account.accountSubtype ?? "");
}

export interface StatementLine {
  kind: "opening" | "brought-forward" | "carried-forward" | "closing";
  balance: string;
}

export interface StatementPage {
  // Above the rows: the period's opening on the first page, the balance the
  // pages before ended on after that.
  top: StatementLine;
  // Below them: the balance the next page starts from, or the period's
  // closing on the last page.
  bottom: StatementLine;
  // The number the page's first row carries, so numbering runs on across pages.
  firstRow: number;
  // false for a backend older than the paged-ledger fix: it sends no page
  // balances and its closingBalance is the page's own last balance, so the
  // statement shows the opening and closing lines as it always did.
  exact: boolean;
}

// The balance lines one page of a statement shows around its rows.
export function statementPage(ledger: Pick<AccountLedger, "balanceBroughtForward" | "closingBalance" | "pageOpeningBalance" | "pageClosingBalance" | "meta">): StatementPage {
  const { page, limit, totalPages } = ledger.meta;
  const firstRow = (Math.max(Math.floor(page) || 1, 1) - 1) * Math.max(Math.floor(limit) || 0, 0) + 1;
  const opening: StatementLine = { kind: "opening", balance: ledger.balanceBroughtForward };
  const closing: StatementLine = { kind: "closing", balance: ledger.closingBalance };
  if (ledger.pageOpeningBalance === undefined || ledger.pageClosingBalance === undefined) {
    return { top: opening, bottom: closing, firstRow, exact: false };
  }
  return {
    top: page > 1 ? { kind: "brought-forward", balance: ledger.pageOpeningBalance } : opening,
    bottom: page < Math.max(totalPages, 1) ? { kind: "carried-forward", balance: ledger.pageClosingBalance } : closing,
    firstRow,
    exact: true,
  };
}

const cents = (value: string | number) => Math.round(Number(value) * 100) || 0;

// What the period's money in, money out and transfers leave out: they count
// only entries that still stand, while the balances count every entry. A
// void posts its reversal on the day it is made (and an edit is a void and a
// new entry), so an entry from one month voided in the next leaves one half
// in each period. Closing minus (opening + in - out + transfers), to the
// paisa; 0 when the figures add up on their own.
export function voidedNet(ledger: Pick<AccountLedger, "balanceBroughtForward" | "closingBalance">, summary: Pick<AccountSummary, "totalIn" | "totalOut" | "adjustment">): number {
  const residual = cents(ledger.closingBalance) - (cents(ledger.balanceBroughtForward) + cents(summary.totalIn) - cents(summary.totalOut) + cents(summary.adjustment));
  return residual === 0 ? 0 : residual / 100;
}

// A day typed into a date field that is worth loading. The field reports a
// whole date at every keystroke of the year ("0002-10-21", "0020-10-21"),
// so only a real calendar day from 1900 on is taken as finished.
export function isSettledDay(value: string): boolean {
  return isIsoDay(value) && Number(value.slice(0, 4)) >= 1900;
}

// The period a statement or a list covers, in words, for its printed copy.
export function periodText(t: Translate, from?: string, to?: string): string {
  if (from && to) return t("{from} to {to}", { from: formatDate(from), to: formatDate(to) });
  if (from) return t("From {from}", { from: formatDate(from) });
  if (to) return t("Up to {to}", { to: formatDate(to) });
  return t("All time");
}

// A row's transaction page. `from` is the list it was opened from (a path on
// this site), so the transaction page can lead back to the same account,
// period and page instead of the Transactions list.
export function transactionHref(id: string, from?: string): string {
  return from ? `/transactions/${id}?${new URLSearchParams({ from })}` : `/transactions/${id}`;
}
