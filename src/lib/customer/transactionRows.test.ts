import { describe, expect, it } from "vitest";
import { bnDictionary } from "@/lib/i18n/dictionary";
import type { Transaction, TransactionEntry } from "./api";
import {
  activeFilterCount,
  categoryLabel,
  categoryTransactionsHref,
  dayHeading,
  describeTransaction,
  editableEntry,
  editChanges,
  groupByDay,
  isReversedRange,
  owningFeature,
  pageEdgeDays,
  readTransactionFilters,
  recordTimeLabel,
  relativeDayKey,
  reversalTitle,
  rowTitle,
  SYSTEM_TEXTS,
  systemText,
  transactionDayLabel,
} from "./transactionRows";

const entry = (overrides: Partial<TransactionEntry>): TransactionEntry => ({
  id: Math.random().toString(36).slice(2),
  transactionId: "t",
  accountId: "a",
  entryType: "DEBIT",
  amount: "0",
  categoryId: null,
  note: null,
  ...overrides,
});

const transaction = (overrides: Partial<Transaction>): Transaction => ({
  id: "t1",
  businessId: "b",
  transactionType: "EXPENSE",
  transactionDate: "2026-10-01T06:00:00.000Z",
  referenceNo: null,
  description: null,
  contactId: null,
  status: "POSTED",
  createdBy: "u",
  createdAt: "2026-10-01T06:00:00.000Z",
  voidedAt: null,
  voidedReason: null,
  reversalOfId: null,
  voidable: true,
  entries: [],
  ...overrides,
});

const categories = { food: { name: "Food & Dining", icon: "utensils", color: "orange" } };

describe("describeTransaction", () => {
  it("finds the category and the wallet whichever entry comes first", () => {
    const expense = transaction({
      entries: [
        entry({ entryType: "CREDIT", amount: "420", account: { id: "w", name: "Cash", accountType: "ASSET", accountSubtype: "cash" } }),
        entry({ entryType: "DEBIT", amount: "420", categoryId: "food" }),
      ],
    });
    const row = describeTransaction(expense, categories);
    expect(row.category?.name).toBe("Food & Dining");
    expect(row.wallet).toBe("Cash");
    expect(row.signedAmount).toBe(-420);
    expect(row.title).toBe("Food & Dining");
  });

  it("writes a transfer as from → to", () => {
    const transfer = transaction({
      transactionType: "TRANSFER",
      description: "To savings",
      entries: [
        entry({ entryType: "CREDIT", amount: "500", account: { id: "a", name: "Cash", accountType: "ASSET", accountSubtype: "cash" } }),
        entry({ entryType: "DEBIT", amount: "500", account: { id: "b", name: "Bank", accountType: "ASSET", accountSubtype: "bank" } }),
      ],
    });
    const row = describeTransaction(transfer, {});
    expect(row.wallet).toBe("Cash → Bank");
    expect(row.signedAmount).toBe(500);
    expect(row.title).toBe("To savings");
  });
});

describe("describeTransaction without a category", () => {
  it("takes the money account as the wallet and the other account as the category", () => {
    const journal = transaction({
      entries: [
        entry({ entryType: "DEBIT", amount: "7", account: { id: "x", name: "Rent Expense", accountType: "EXPENSE", accountSubtype: null } }),
        entry({ entryType: "CREDIT", amount: "7", account: { id: "w", name: "Cash", accountType: "ASSET", accountSubtype: "cash" } }),
      ],
    });
    const row = describeTransaction(journal, {});
    expect(row.wallet).toBe("Cash");
    expect(row.category?.name).toBe("Rent Expense");
    expect(row.title).toBe("Rent Expense");
    // The account only stands in: the entry itself carries no category.
    expect(row.entryCategory).toBeNull();
  });

  it("takes the wallet, not another asset, as the money side of an asset bought", () => {
    const purchase = transaction({
      transactionType: "PURCHASE",
      entries: [
        entry({ accountId: "f", entryType: "DEBIT", amount: "50000", account: { id: "f", name: "Fixed Assets (Internal)", accountType: "ASSET", accountSubtype: "fixed-assets" } }),
        entry({ accountId: "b", entryType: "CREDIT", amount: "50000", account: { id: "b", name: "Bank", accountType: "ASSET", accountSubtype: "bank" } }),
      ],
    });
    const row = describeTransaction(purchase, {});
    expect(row.wallet).toBe("Bank");
    expect(row.category?.name).toBe("Fixed Assets (Internal)");
  });

  it("names an account in Bangla for a Bangla reader when it has a Bangla name", () => {
    const journal = transaction({
      entries: [
        entry({ entryType: "DEBIT", amount: "7", account: { id: "x", name: "Rent Expense", nameBn: "ভাড়া খরচ", accountType: "EXPENSE", accountSubtype: null } }),
        entry({ accountId: "s", entryType: "CREDIT", amount: "7", account: { id: "s", name: "Hajj fund", nameBn: null, accountType: "ASSET", accountSubtype: "savings" } }),
      ],
    });
    const bangla = describeTransaction(journal, {}, {}, "bn");
    expect(bangla.category?.name).toBe("ভাড়া খরচ");
    // No Bangla name: the account's own.
    expect(bangla.wallet).toBe("Hajj fund");
    expect(describeTransaction(journal, {}, {}, "en").category?.name).toBe("Rent Expense");
    // A wallet the reader lists keeps the name it was given.
    expect(describeTransaction(journal, {}, { s: "হজ তহবিল" }, "bn").wallet).toBe("হজ তহবিল");
  });
});

describe("describeTransaction with a category the list doesn't know", () => {
  const tagged = (categoryId: string) =>
    transaction({
      transactionType: "INCOME",
      entries: [
        entry({ entryType: "DEBIT", amount: "900", categoryId, account: { id: "w", name: "Cash", accountType: "ASSET", accountSubtype: "cash" } }),
        entry({ entryType: "CREDIT", amount: "900", account: { id: "i", name: "Other Income", accountType: "INCOME", accountSubtype: null } }),
      ],
    });

  it("keeps a deleted or feature-made category by its name, on the neutral tile", () => {
    const row = describeTransaction(tagged("Asset Sale"), categories);
    expect(row.category).toEqual({ name: "Asset Sale", icon: null, color: "" });
    expect(row.title).toBe("Asset Sale");
    expect(row.entryCategory).toBe("Asset Sale");
  });

  it("drops an id-shaped one, which names nothing", () => {
    expect(describeTransaction(tagged("d911f357-0000-459a-bfd3-a4d3c2b1e000"), categories).category).toBeNull();
  });
});

// An asset sale and a referral payout tag the wallet's own debit, not the
// other side's entry as a quick entry does.
describe("describeTransaction when the category sits on the wallet's entry", () => {
  it("takes an asset sale's wallet from the tagged entry", () => {
    const sale = transaction({
      transactionType: "INCOME",
      description: "Asset sale: Car",
      entries: [
        entry({ accountId: "w", entryType: "DEBIT", amount: "50000", categoryId: "Asset Sale", account: { id: "w", name: "Cash", accountType: "ASSET", accountSubtype: "cash" } }),
        entry({ accountId: "f", entryType: "CREDIT", amount: "50000", account: { id: "f", name: "Fixed Assets (Internal)", accountType: "ASSET", accountSubtype: "fixed-assets" } }),
      ],
    });
    const row = describeTransaction(sale, categories);
    expect(row.wallet).toBe("Cash");
    expect(row.category?.name).toBe("Asset Sale");
  });

  it("names a referral payout's wallet as the reader sees it, or a savings wallet by its own name", () => {
    const payout = (wallet: NonNullable<TransactionEntry["account"]>) =>
      transaction({
        transactionType: "INCOME",
        description: "Referral Program withdrawal",
        voidable: false,
        entries: [
          entry({ accountId: wallet.id, entryType: "DEBIT", amount: "300", categoryId: "Referral Bonus", account: wallet }),
          entry({ accountId: "r", entryType: "CREDIT", amount: "300", account: { id: "r", name: "Referral Bonus", accountType: "INCOME", accountSubtype: "referral-bonus" } }),
        ],
      });
    expect(describeTransaction(payout({ id: "m", name: "bKash", accountType: "ASSET", accountSubtype: "mfs" }), {}, { m: "বিকাশ" }).wallet).toBe("বিকাশ");
    expect(describeTransaction(payout({ id: "s", name: "Hajj fund", accountType: "ASSET", accountSubtype: "savings" }), {}).wallet).toBe("Hajj fund");
  });

  it("still takes the other entry when the category is on the income side", () => {
    const income = transaction({
      transactionType: "INCOME",
      entries: [
        entry({ accountId: "w", entryType: "DEBIT", amount: "900", account: { id: "w", name: "Cash", accountType: "ASSET", accountSubtype: "cash" } }),
        entry({ accountId: "i", entryType: "CREDIT", amount: "900", categoryId: "Salary", account: { id: "i", name: "Salary Income", accountType: "INCOME", accountSubtype: null } }),
      ],
    });
    expect(describeTransaction(income, {}, { w: "নগদ" }).wallet).toBe("নগদ");
  });
});

describe("categoryLabel / systemText / rowTitle", () => {
  const t = (key: string) => `bn:${key}`;

  it("words the backend's own names in the reader's language and leaves a reader's alone", () => {
    expect(categoryLabel("Asset Sale", t)).toBe("bn:Asset Sale");
    expect(categoryLabel("Food & Dining", t)).toBe("Food & Dining");
    expect(systemText("Referral Program withdrawal", t)).toBe("bn:Referral Program withdrawal");
    expect(systemText("Lunch with team", t)).toBe("Lunch with team");
    expect(systemText("Asset sale: Kitchen fridge", (key, values) => `bn:${key}|${values?.name}`)).toBe("bn:Asset sale: {name}|Kitchen fridge");
  });

  it("titles a row by its note or category, else by its type", () => {
    expect(rowTitle({ title: "Referral Program withdrawal", transaction: transaction({}) }, t)).toBe("bn:Referral Program withdrawal");
    expect(rowTitle({ title: "Weekly groceries", transaction: transaction({}) }, t)).toBe("Weekly groceries");
    expect(rowTitle({ title: null, transaction: transaction({ transactionType: "INCOME" }) }, t)).toBe("bn:Income");
  });

  it("has Bangla for every one of those names", () => {
    for (const name of SYSTEM_TEXTS) expect(bnDictionary[name], name).toBeTruthy();
  });
});

describe("describeTransaction with the reader's wallet names", () => {
  const names = { w: "নগদ", b: "ব্যাংক" };

  it("names the wallet of an expense and both of a transfer", () => {
    const expense = transaction({
      entries: [
        entry({ accountId: "w", entryType: "CREDIT", amount: "50", account: { id: "w", name: "Cash", accountType: "ASSET", accountSubtype: "cash" } }),
        entry({ accountId: "x", entryType: "DEBIT", amount: "50", categoryId: "food" }),
      ],
    });
    expect(describeTransaction(expense, categories, names).wallet).toBe("নগদ");
    const transfer = transaction({
      transactionType: "TRANSFER",
      entries: [
        entry({ accountId: "w", entryType: "CREDIT", amount: "500", account: { id: "w", name: "Cash", accountType: "ASSET", accountSubtype: "cash" } }),
        entry({ accountId: "b", entryType: "DEBIT", amount: "500", account: { id: "b", name: "Bank", accountType: "ASSET", accountSubtype: "bank" } }),
      ],
    });
    expect(describeTransaction(transfer, {}, names).wallet).toBe("নগদ → ব্যাংক");
  });

  it("falls back to the account's own name", () => {
    const expense = transaction({
      entries: [
        entry({ accountId: "m", entryType: "CREDIT", amount: "50", account: { id: "m", name: "bKash", accountType: "ASSET", accountSubtype: "mfs" } }),
        entry({ accountId: "x", entryType: "DEBIT", amount: "50", categoryId: "food" }),
      ],
    });
    expect(describeTransaction(expense, categories, names).wallet).toBe("bKash");
  });
});

describe("groupByDay", () => {
  it("groups by the Dhaka day and nets each day without voided rows", () => {
    const rows = [
      describeTransaction(transaction({ id: "a", transactionType: "INCOME", transactionDate: "2026-10-01T10:00:00.000Z", entries: [entry({ amount: "1000" })] }), {}),
      describeTransaction(transaction({ id: "b", transactionDate: "2026-10-01T02:00:00.000Z", entries: [entry({ amount: "300" })] }), {}),
      describeTransaction(transaction({ id: "c", transactionDate: "2026-09-30T17:30:00.000Z", status: "VOIDED", entries: [entry({ amount: "50" })] }), {}),
      // 18:30 UTC on the 30th is already 1 Oct in Dhaka? No: 00:30 on 1 Oct. Ordering keeps the API's order.
      describeTransaction(transaction({ id: "d", transactionDate: "2026-09-29T18:30:00.000Z", entries: [entry({ amount: "80" })] }), {}),
    ];
    const groups = groupByDay(rows);
    expect(groups.map((g) => [g.day, g.rows.length, g.net])).toEqual([
      ["2026-10-01", 2, 700],
      ["2026-09-30", 2, -80],
    ]);
  });
});

describe("relativeDayKey / dayHeading", () => {
  const t = (key: string) => key;
  it("names today and yesterday, else the short date", () => {
    expect(relativeDayKey("2026-10-02", "2026-10-02")).toBe("Today");
    expect(relativeDayKey("2026-10-01", "2026-10-02")).toBe("Yesterday");
    expect(relativeDayKey("2026-09-30", "2026-10-02")).toBeNull();
    expect(dayHeading("2026-10-01", "2026-10-02", t)).toBe("Yesterday · Thu, 1 Oct");
    expect(dayHeading("2026-09-30", "2026-10-02", t)).toBe("Wed, 30 Sep");
  });

  it("writes the day in Bangla, as the Bangla board does", () => {
    expect(dayHeading("2026-10-01", "2026-10-02", (key) => (key === "Yesterday" ? "গতকাল" : key), "bn")).toBe("গতকাল · বৃহস্পতি, ১ অক্টো");
    expect(dayHeading("2026-09-30", "2026-10-02", (key) => key, "bn")).toBe("বুধ, ৩০ সেপ্টে");
  });
});

describe("reversalTitle", () => {
  it("keeps what a reversal undid", () => {
    expect(reversalTitle("Reversal of: Lunch with team")).toBe("Lunch with team");
  });

  it("drops a bare id, so the row falls back to its category", () => {
    expect(reversalTitle("Reversal of: d911f357-0000-459a-bfd3-a4d3c2b1e000")).toBeNull();
    expect(reversalTitle(null)).toBeNull();
  });

  it("titles a reversal row by its category when the note was only an id", () => {
    const reversal = transaction({
      description: "Reversal of: d911f357-0000-459a-bfd3-a4d3c2b1e000",
      reversalOfId: "t0",
      entries: [
        entry({ entryType: "DEBIT", amount: "420", account: { id: "w", name: "Cash", accountType: "ASSET", accountSubtype: "cash" } }),
        entry({ entryType: "CREDIT", amount: "420", categoryId: "food" }),
      ],
    });
    const row = describeTransaction(reversal, categories);
    expect(row.title).toBe("Food & Dining");
    expect(row.cancelled).toBe("Reversal");
  });
});

describe("editableEntry", () => {
  it("opens an expense with its wallet, category, amount, day and note", () => {
    const expense = transaction({
      entries: [
        entry({ accountId: "food", entryType: "DEBIT", amount: "2450.00", categoryId: "food", note: "Weekly groceries" }),
        entry({ accountId: "cash", entryType: "CREDIT", amount: "2450.00" }),
      ],
    });
    expect(editableEntry(expense, "Weekly groceries", "Food & Dining")).toEqual({
      id: "t1",
      kind: "EXPENSE",
      title: "Weekly groceries",
      day: "2026-10-01",
      amount: 2450,
      accountId: "cash",
      toAccountId: "",
      otherAccountId: "food",
      category: "Food & Dining",
      note: "Weekly groceries",
      contactId: null,
    });
  });

  it("takes an income's wallet from the debit side and a transfer's note from its description", () => {
    const income = transaction({ transactionType: "INCOME", entries: [entry({ accountId: "bank", entryType: "DEBIT", amount: "85000" }), entry({ accountId: "salary", entryType: "CREDIT", amount: "85000" })] });
    expect(editableEntry(income, "Salary", null)).toMatchObject({ kind: "INCOME", accountId: "bank", otherAccountId: "salary", category: "" });
    const transfer = transaction({ transactionType: "TRANSFER", description: "Card bill", entries: [entry({ accountId: "cash", entryType: "DEBIT", amount: "2000" }), entry({ accountId: "bank", entryType: "CREDIT", amount: "2000" })] });
    expect(editableEntry(transfer, "Card bill", null)).toMatchObject({ kind: "TRANSFER", accountId: "bank", toAccountId: "cash", note: "Card bill" });
  });

  it("leaves out what Edit can't take", () => {
    const plain = [entry({ entryType: "DEBIT", amount: "10" }), entry({ entryType: "CREDIT", amount: "10" })];
    expect(editableEntry(transaction({ voidable: false, entries: plain }), "x", null)).toBeNull();
    expect(editableEntry(transaction({ transactionType: "SALE", entries: plain }), "x", null)).toBeNull();
    expect(editableEntry(transaction({ entries: [...plain, entry({ entryType: "CREDIT", amount: "0" })] }), "x", null)).toBeNull();
  });

  it("edits an entry saved without a category as one without, not as its account", () => {
    const income = transaction({
      transactionType: "INCOME",
      entries: [
        entry({ accountId: "cash", entryType: "DEBIT", amount: "300", account: { id: "cash", name: "Cash", accountType: "ASSET", accountSubtype: "cash" } }),
        entry({ accountId: "sales", entryType: "CREDIT", amount: "300", account: { id: "sales", name: "Sales Revenue", accountType: "INCOME", accountSubtype: null } }),
      ],
    });
    const row = describeTransaction(income, {});
    expect(row.category?.name).toBe("Sales Revenue");
    expect(editableEntry(income, row.title ?? "", row.entryCategory)?.category).toBe("");
  });
});

describe("editChanges", () => {
  const income = { id: "t1", kind: "INCOME" as const, title: "Salary", day: "2026-10-01", amount: 85000, accountId: "bank", toAccountId: "", otherAccountId: "salary", category: "Salary", note: "October", contactId: null };
  const untouched = { amount: 85000, category: "Salary", accountId: "bank", toAccountId: "", day: "2026-10-01", note: "October" };

  it("counts nothing for an edit opened and left alone", () => {
    expect(editChanges(income, untouched)).toBe(0);
  });

  it("never counts a second wallet for an income or an expense", () => {
    // The drawer keeps a "to" wallet for the Transfer tab; it isn't part of an income.
    expect(editChanges(income, { ...untouched, toAccountId: "cash" })).toBe(0);
    expect(editChanges(income, { ...untouched, amount: 90000, note: " October " })).toBe(1);
  });

  it("counts a transfer's second wallet", () => {
    const transfer = { ...income, kind: "TRANSFER" as const, category: "", toAccountId: "cash" };
    expect(editChanges(transfer, { ...untouched, category: "", toAccountId: "cash" })).toBe(0);
    expect(editChanges(transfer, { ...untouched, category: "", toAccountId: "bkash", day: "2026-10-02" })).toBe(2);
  });
});

describe("pageEdgeDays", () => {
  const rows = [{ transactionDate: "2026-10-03T00:00:00.000Z" }, { transactionDate: "2026-10-02T00:00:00.000Z" }];

  it("names the first day after a page and the last day before one", () => {
    expect(pageEdgeDays(rows, 2, 3)).toEqual({ before: "2026-10-03", after: "2026-10-02" });
    expect(pageEdgeDays(rows, 1, 3)).toEqual({ before: null, after: "2026-10-02" });
    expect(pageEdgeDays(rows, 3, 3)).toEqual({ before: "2026-10-03", after: null });
  });

  it("names nothing on a single page or an empty one", () => {
    expect(pageEdgeDays(rows, 1, 1)).toEqual({ before: null, after: null });
    expect(pageEdgeDays([], 2, 3)).toEqual({ before: null, after: null });
  });
});

describe("readTransactionFilters / activeFilterCount", () => {
  const read = (query: string) => {
    const params = new URLSearchParams(query);
    return readTransactionFilters((key) => params.get(key));
  };

  it("counts only the list's own filters, the date range once", () => {
    expect(activeFilterCount(read("page=3&limit=50&utm_source=mail"))).toBe(0);
    expect(activeFilterCount(read("type=INCOME&dateFrom=2026-10-01&dateTo=2026-10-31"))).toBe(2);
    expect(activeFilterCount(read("search=rent"))).toBe(1);
    expect(activeFilterCount(read("type=EXPENSE&categoryId=Food&accountId=w&dateTo=2026-10-31&search=bazar"))).toBe(5);
  });

  it("ignores what the list can't apply", () => {
    expect(read("type=TRANSFER&dateFrom=2026-13-01&search=%20%20")).toEqual({ type: undefined, categoryId: undefined, accountId: undefined, dateFrom: undefined, dateTo: undefined, search: undefined });
  });

  it("knows a range that runs backwards", () => {
    expect(isReversedRange({ dateFrom: "2026-10-31", dateTo: "2026-10-01" })).toBe(true);
    expect(isReversedRange({ dateFrom: "2026-10-01", dateTo: "2026-10-01" })).toBe(false);
    expect(isReversedRange({ dateFrom: "2026-10-31" })).toBe(false);
  });
});

describe("categoryTransactionsHref", () => {
  it("opens one category's entries for the whole month", () => {
    expect(categoryTransactionsHref("EXPENSE", "Food & Dining", 2026, 2)).toBe("/transactions?type=EXPENSE&categoryId=Food+%26+Dining&dateFrom=2026-02-01&dateTo=2026-02-28");
    expect(categoryTransactionsHref("INCOME", "Salary", 2024, 2)).toContain("dateTo=2024-02-29");
  });
});

describe("owningFeature", () => {
  it("knows the features that keep their own record of a posting", () => {
    expect(owningFeature(transaction({ description: "Asset sale: Car -- sold to Rafiq" }))).toBe("asset");
    expect(owningFeature(transaction({ description: "Savings contribution: Hajj" }))).toBe("savings");
    expect(owningFeature(transaction({ description: "Referral Program withdrawal" }))).toBe("referral");
    expect(owningFeature(transaction({ entries: [entry({ categoryId: "Referral Bonus" })] }))).toBe("referral");
    expect(owningFeature(transaction({ description: "Lunch" }))).toBeNull();
  });
});

describe("transactionDayLabel / recordTimeLabel", () => {
  it("writes a transaction's day without a time", () => {
    expect(transactionDayLabel("2026-10-01", "en")).toBe("Thu, 1 Oct 2026");
    expect(transactionDayLabel("2026-10-01", "bn")).toBe("বৃহস্পতি, ১ অক্টো ২০২৬");
  });

  it("writes when a record changed, in Dhaka time", () => {
    expect(recordTimeLabel("2026-10-01T11:30:00.000Z", "en", (key) => key)).toBe("1 Oct 2026, 5:30 PM");
    expect(recordTimeLabel("2026-10-01T11:30:00.000Z", "bn", (key) => (key === "pm" ? "অপরাহ্ণ" : key))).toBe("১ অক্টো ২০২৬, ৫:৩০ অপরাহ্ণ");
  });
});
