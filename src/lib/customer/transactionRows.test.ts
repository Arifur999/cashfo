import { describe, expect, it } from "vitest";
import type { Transaction, TransactionEntry } from "./api";
import { dayHeading, describeTransaction, editableEntry, groupByDay, relativeDayKey, reversalTitle } from "./transactionRows";

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
});
