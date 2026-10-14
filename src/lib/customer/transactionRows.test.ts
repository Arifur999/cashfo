import { describe, expect, it } from "vitest";
import type { Transaction, TransactionEntry } from "./api";
import { dayHeading, describeTransaction, groupByDay, relativeDayKey } from "./transactionRows";

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
});
