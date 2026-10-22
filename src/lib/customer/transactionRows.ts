import type { Transaction, TransactionEntry } from "./api";
import { formatDate, timeLabel } from "./date";
import { isIsoDay } from "./dateRangePresets";
import { cancelledLabel, TRANSACTION_TYPE_LABELS } from "./transactionDisplay";
import { toDateInputValue } from "@/lib/date";
import { banglaDayMonth, banglaShortDay, toBanglaDigits } from "@/lib/i18n/banglaDates";
import { localName, type Translate } from "@/lib/i18n/message";

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
  // What the row shows as its category: the entry's own, or the other
  // account's name standing in for one (see entryCategory).
  category: CategoryMeta | null;
  // The category the entry itself carries (its name), null when it has
  // none: what the Category filter and Edit go by.
  entryCategory: string | null;
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

// A reversal's own note is "Reversal of: <what it undid>" (the backend
// writes it). Its row already says "Reversal", so the title is what it
// undid -- or nothing when that was only the original's id, and the row
// falls back to its category like any other.
const REVERSAL_PREFIX = /^Reversal of:\s*/;
const BARE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function reversalTitle(description: string | null): string | null {
  const undid = description?.replace(REVERSAL_PREFIX, "").trim();
  return undid && !BARE_ID.test(undid) ? undid : null;
}

// Cash, bank and mobile wallets, and the savings wallets goals are kept in.
const MONEY_SUBTYPES = new Set(["cash", "bank", "mfs", "savings"]);

// Which entry carries the category and which the wallet: entry order
// differs between an income and an expense, so the wallet is "the other
// entry" -- unless the category sits on the wallet's own entry, as on an
// asset sale or a referral payout. A transfer has two wallets and no
// category. `accountNames` gives a wallet the name the reader sees ("নগদ"
// for Cash in Bangla), by its id; any other account shows its Bangla name
// (nameBn) to a Bangla reader.
export function describeTransaction(transaction: Transaction, categoriesById: Record<string, CategoryMeta>, accountNames: Record<string, string> = {}, locale: "en" | "bn" = "en"): TransactionRow {
  const nameOf = (entry: TransactionEntry | undefined) => (entry ? (accountNames[entry.accountId] ?? (entry.account ? localName(locale, entry.account) : null)) : null);
  // One of the reader's wallets, or a money account they may no longer list
  // (an archived wallet, a savings wallet).
  const isWallet = (entry: TransactionEntry) => accountNames[entry.accountId] !== undefined || (entry.account?.accountType === "ASSET" && MONEY_SUBTYPES.has(entry.account.accountSubtype ?? ""));
  const categoryEntry = transaction.entries.find((e) => e.categoryId);
  const entryCategory = categoryEntry?.categoryId ?? null;
  // A name no current category answers to (a deleted category's, or a
  // feature's own: "Asset Sale", "Referral Bonus") still names the row, on
  // the neutral tile. An id-shaped one names nothing a reader would know.
  let category: CategoryMeta | null = entryCategory ? (categoriesById[entryCategory] ?? (BARE_ID.test(entryCategory) ? null : { name: entryCategory, icon: null, color: "" })) : null;
  let wallet = categoryEntry ? nameOf(isWallet(categoryEntry) ? categoryEntry : transaction.entries.find((e) => e.id !== categoryEntry.id)) : null;
  if (!categoryEntry && transaction.transactionType !== "TRANSFER") {
    // A posting made straight against the books (a journal entry, a
    // feature's own posting): the money side is the wallet, the other
    // account stands in for the category. A wallet before any other asset:
    // an asset bought moves money from a wallet into Fixed Assets.
    const moneyEntry = transaction.entries.find(isWallet) ?? transaction.entries.find((e) => e.account?.accountType === "ASSET") ?? transaction.entries[0];
    const other = transaction.entries.find((e) => e.id !== moneyEntry?.id);
    wallet = nameOf(moneyEntry);
    if (!category && other?.account) category = { name: localName(locale, other.account), icon: null, color: "" };
  }
  if (transaction.transactionType === "TRANSFER") {
    const from = nameOf(transaction.entries.find((e) => e.entryType === "CREDIT"));
    const to = nameOf(transaction.entries.find((e) => e.entryType === "DEBIT"));
    if (from && to) wallet = `${from} → ${to}`;
  }
  const amount = Number(transaction.entries[0]?.amount ?? 0);
  const signedAmount = transaction.transactionType === "EXPENSE" ? -amount : amount;
  return {
    transaction,
    title: (transaction.reversalOfId ? reversalTitle(transaction.description) : transaction.description) || category?.name || null,
    category,
    entryCategory,
    wallet,
    signedAmount,
    cancelled: cancelledLabel(transaction),
  };
}

// The categories the backend gives a feature's own postings (an asset sale,
// a referral payout), which no reader named: shown in the reader's
// language. A category a reader named stays as they wrote it.
export const SYSTEM_CATEGORIES = new Set(["Asset Sale", "Referral Bonus"]);
// Those, and the note the backend writes on a referral payout (its title).
export const SYSTEM_TEXTS = new Set([...SYSTEM_CATEGORIES, "Referral Program withdrawal"]);

export const categoryLabel = (name: string, t: Translate): string => (SYSTEM_CATEGORIES.has(name) ? t(name) : name);

// The notes the assets feature writes around the reader's own asset name
// ("Asset sale: Kitchen fridge"): the words translate, the name stays.
const SYSTEM_PREFIXES: [RegExp, string][] = [
  [/^Asset purchase: ([^]+)$/, "Asset purchase: {name}"],
  [/^Asset sale: ([^]+)$/, "Asset sale: {name}"],
  [/^Asset deleted: ([^]+)$/, "Asset deleted: {name}"],
];

// A row's title or note: translated when the backend wrote it, else as typed.
export const systemText = (text: string, t: Translate): string => {
  if (SYSTEM_TEXTS.has(text)) return t(text);
  for (const [pattern, key] of SYSTEM_PREFIXES) {
    const match = text.match(pattern);
    if (match) return t(key, { name: match[1] });
  }
  return text;
};

// What a row is called on screen: its title, else its type.
export const rowTitle = (row: Pick<TransactionRow, "title" | "transaction">, t: Translate): string =>
  row.title ? systemText(row.title, t) : t(TRANSACTION_TYPE_LABELS[row.transaction.transactionType]);

export interface DayGroup {
  day: string;
  rows: TransactionRow[];
  // The day's money in minus money out, voided rows left out -- of the
  // rows given, so a day split across two pages nets only its own part
  // (see pageEdgeDays).
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

// The days a page may share with the pages around it: its first day when
// a page comes before it, its last when one comes after. A day in between
// is whole on this page, so its rows' net is the day's own.
export function pageEdgeDays(rows: Pick<Transaction, "transactionDate">[], page: number, totalPages: number): { before: string | null; after: string | null } {
  if (rows.length === 0) return { before: null, after: null };
  return {
    before: page > 1 ? toDateInputValue(rows[0].transactionDate) : null,
    after: page < totalPages ? toDateInputValue(rows[rows.length - 1].transactionDate) : null,
  };
}

// "Today", "Yesterday" or nothing, for a "YYYY-MM-DD" day.
export function relativeDayKey(day: string, today: string): "Today" | "Yesterday" | null {
  if (day === today) return "Today";
  if (day === shiftDay(today, -1)) return "Yesterday";
  return null;
}

// "Yesterday · Thu, 1 Oct" or "Wed, 30 Sep", the way the list heads a day.
export function dayHeading(day: string, today: string, t: (key: string) => string, locale: "en" | "bn" = "en"): string {
  // "Wed, 30 Sep", or "বুধ, ৩০ সেপ্টে" in the Bangla board's own words.
  const short = locale === "bn" ? banglaShortDay(day) : formatDate(`${day}T00:00:00.000Z`, "EEE, d MMM");
  const relative = relativeDayKey(day, today);
  return relative ? `${t(relative)} · ${short}` : short;
}

// "Thu, 1 Oct 2026" (or "বৃহস্পতি, ১ অক্টো ২০২৬"): a transaction's day. Its
// date is a day with no time of its own (stored at UTC midnight), so it is
// never shown with one.
export function transactionDayLabel(day: string, locale: "en" | "bn"): string {
  return locale === "bn" ? `${banglaShortDay(day)} ${toBanglaDigits(day.slice(0, 4))}` : formatDate(`${day}T00:00:00.000Z`, "EEE, d MMM yyyy");
}

// "1 Oct 2026, 5:30 pm" (or "১ অক্টো ২০২৬, ৫:৩০ অপরাহ্ণ"): when something
// happened to a record, to the minute, in the platform timezone.
export function recordTimeLabel(value: string, locale: "en" | "bn", t: Translate): string {
  if (locale === "en") return formatDate(value, "d MMM yyyy, h:mm a");
  const day = toDateInputValue(value);
  return `${banglaDayMonth(day)} ${toBanglaDigits(day.slice(0, 4))}, ${toBanglaDigits(timeLabel(formatDate(value, "HH:mm"), t))}`;
}

// What Edit opens a saved entry with (decision D2): the wallet the money
// left or came into (and, for a transfer, the one it went to), the
// category on the other side, the amount, the day and the note. Saving
// voids the entry and posts the corrected one.
export interface EditableEntry {
  id: string;
  kind: "INCOME" | "EXPENSE" | "TRANSFER";
  // The entry's name and day, under the drawer's title.
  title: string;
  day: string;
  amount: number;
  accountId: string;
  toAccountId: string;
  // The income or expense account on the other side, kept while the
  // category stays the same.
  otherAccountId: string;
  category: string;
  note: string;
  // A loan's profit or interest keeps its bank or person when edited.
  contactId: string | null;
}

// null for anything Edit can't take: a book entry, a reversal, a voided
// entry, or one a feature keeps (the API says so through `voidable`).
// `categoryName` is the entry's own category (TransactionRow.entryCategory),
// never an account standing in for one: an entry saved without a category
// edits as one without.
export function editableEntry(transaction: Transaction, title: string, categoryName: string | null): EditableEntry | null {
  const kind = transaction.transactionType;
  if ((kind !== "INCOME" && kind !== "EXPENSE" && kind !== "TRANSFER") || !transaction.voidable || transaction.entries.length !== 2) return null;
  const debit = transaction.entries.find((entry) => entry.entryType === "DEBIT");
  const credit = transaction.entries.find((entry) => entry.entryType === "CREDIT");
  if (!debit || !credit) return null;
  const base = { id: transaction.id, kind, title, day: toDateInputValue(transaction.transactionDate), amount: Number(debit.amount), category: categoryName ?? "", contactId: transaction.contactId };
  if (kind === "INCOME") return { ...base, accountId: debit.accountId, toAccountId: "", otherAccountId: credit.accountId, note: credit.note ?? transaction.description ?? "" };
  if (kind === "EXPENSE") return { ...base, accountId: credit.accountId, toAccountId: "", otherAccountId: debit.accountId, note: debit.note ?? transaction.description ?? "" };
  return { ...base, accountId: credit.accountId, toAccountId: debit.accountId, otherAccountId: "", note: transaction.description ?? "" };
}

// What the drawer holds while an entry is edited.
export interface EntryValues {
  amount: number;
  category: string;
  accountId: string;
  toAccountId: string;
  day: string;
  note: string;
}

// How many of a saved entry's values an edit has changed. Only a transfer
// has a second wallet, so an income or expense never counts one: the
// drawer opening an edit untouched says "0 changes" and can't save.
export function editChanges(editing: EditableEntry, values: EntryValues): number {
  return [
    values.amount !== editing.amount,
    values.category !== editing.category,
    values.accountId !== editing.accountId,
    editing.kind === "TRANSFER" && values.toAccountId !== editing.toAccountId,
    values.day !== editing.day,
    values.note.trim() !== editing.note.trim(),
  ].filter(Boolean).length;
}

// The filters the Transactions list takes from its URL. Anything else in
// the query (page, limit, a tracking tag) is no filter.
export interface TransactionListFilters {
  type?: "INCOME" | "EXPENSE";
  categoryId?: string;
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// A query's values, from useSearchParams() or a page's searchParams.
type QueryValue = (key: string) => string | null | undefined;

// Only what the list can apply: a type it lists, real days, words that
// aren't blank. The server page and the filter bar read the URL alike.
export function readTransactionFilters(get: QueryValue): TransactionListFilters {
  const type = get("type");
  const text = (key: string) => get(key)?.trim() || undefined;
  const day = (key: string) => {
    const value = get(key);
    return isIsoDay(value) ? value : undefined;
  };
  return {
    type: type === "INCOME" || type === "EXPENSE" ? type : undefined,
    categoryId: text("categoryId"),
    accountId: text("accountId"),
    dateFrom: day("dateFrom"),
    dateTo: day("dateTo"),
    search: text("search"),
  };
}

// How many filters are on, the date range counting once.
export const activeFilterCount = (filters: TransactionListFilters): number =>
  [filters.type, filters.categoryId, filters.accountId, filters.dateFrom || filters.dateTo, filters.search].filter(Boolean).length;

// A From day after the To day: nothing can match.
export const isReversedRange = (filters: Pick<TransactionListFilters, "dateFrom" | "dateTo">): boolean => !!filters.dateFrom && !!filters.dateTo && filters.dateFrom > filters.dateTo;

// One category's entries in one month: what Budget's and Income sources'
// "See transactions" open.
export function categoryTransactionsHref(type: "INCOME" | "EXPENSE", category: string, year: number, month: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const query = new URLSearchParams({ type, categoryId: category, dateFrom: `${year}-${pad(month)}-01`, dateTo: `${year}-${pad(month)}-${pad(last)}` });
  return `/transactions?${query.toString()}`;
}

// The feature that keeps its own record of a posting, so the posting can
// only change there: an asset bought or sold, a savings goal's deposit or
// withdrawal, a referral payout. Read from what the backend writes on them.
export type OwningFeature = "asset" | "savings" | "referral";

export function owningFeature(transaction: Pick<Transaction, "description" | "entries">): OwningFeature | null {
  const description = transaction.description ?? "";
  if (/^Asset (purchase|sale):/.test(description) || transaction.entries.some((e) => e.categoryId === "Asset Sale")) return "asset";
  if (/^Savings (contribution|withdrawal):/.test(description) || transaction.entries.some((e) => e.account?.accountSubtype === "savings")) return "savings";
  if (description === "Referral Program withdrawal" || transaction.entries.some((e) => e.categoryId === "Referral Bonus")) return "referral";
  return null;
}
