import { describe, expect, it } from "vitest";
import type { Account, AccountGroup, Contact, OverdueRow } from "./api";
import { accountsCsvRows, agingShares, agingTotal, booksBalance, contactStats, daysBetween, descendantIds, filterAccounts, filterContacts, flattenAccounts, hasAccountCodes, journalEntries, journalTotals, lateByContact } from "./booksDisplay";

function account(over: Partial<Account> & { id: string; accountType: Account["accountType"]; currentBalance: string }): Account {
  return { businessId: "b", parentId: null, name: over.id, nameBn: null, accountNumber: null, accountSubtype: null, openingBalance: "0.00", isSystemAccount: false, status: "ACTIVE", displayOrder: 0, children: [], ...over };
}

const GROUPS: AccountGroup[] = [
  { accountType: "ASSET", accounts: [account({ id: "Cash", accountType: "ASSET", currentBalance: "42300.00", accountNumber: "1010", accountSubtype: "cash" }), account({ id: "Bank", accountType: "ASSET", currentBalance: "318500.00", accountNumber: "1020", accountSubtype: "bank", children: [account({ id: "Branch", accountType: "ASSET", currentBalance: "100.00", parentId: "Bank" })] })] },
  { accountType: "LIABILITY", accounts: [account({ id: "Loan", accountType: "LIABILITY", currentBalance: "250000.00" })] },
  { accountType: "EQUITY", accounts: [account({ id: "Capital", accountType: "EQUITY", currentBalance: "50000.00" })] },
  { accountType: "INCOME", accounts: [account({ id: "Sales", accountType: "INCOME", currentBalance: "100000.00" })] },
  { accountType: "EXPENSE", accounts: [account({ id: "Rent", accountType: "EXPENSE", currentBalance: "39200.00" })] },
];

describe("accounts", () => {
  it("flattens a tree parents first and searches it", () => {
    const rows = flattenAccounts(GROUPS[0].accounts);
    expect(rows.map((r) => `${r.account.id}:${r.depth}`)).toEqual(["Cash:0", "Bank:0", "Branch:1"]);
    expect(filterAccounts(rows, "1020").map((r) => r.account.id)).toEqual(["Bank"]);
    expect(filterAccounts(rows, "cash").map((r) => r.account.id)).toEqual(["Cash"]);
    expect(filterAccounts(rows, "")).toHaveLength(3);
    expect([...descendantIds(GROUPS[0].accounts[1])]).toEqual(["Bank", "Branch"]);
  });

  it("knows whether codes are worth a column and lays the chart out as rows", () => {
    expect(hasAccountCodes(GROUPS)).toBe(true);
    expect(hasAccountCodes(GROUPS.slice(1))).toBe(false);
    expect(accountsCsvRows(GROUPS.slice(0, 2))).toEqual([
      ["1010", "Cash", "Asset", "Cash", 42300],
      ["1020", "Bank", "Asset", "Bank", 318500],
      ["", "Branch", "Asset", "", 100],
      ["", "Loan", "Liability", "", 250000],
    ]);
  });

  it("checks that the books balance", () => {
    const balance = booksBalance(GROUPS);
    expect(balance.owns).toBe(360800);
    expect(balance.owes).toBe(250000);
    expect(balance.share).toBe(110800);
    expect(balance.balanced).toBe(true);
    expect(booksBalance([...GROUPS.slice(0, 4), { accountType: "EXPENSE", accounts: [] }]).balanced).toBe(false);
  });
});

describe("contacts", () => {
  const contact = (id: string, type: Contact["type"], balance: string, phone = ""): Contact => ({ id, businessId: "b", name: id, type, category: "BUSINESS", phone, email: null, address: null, photoUrl: null, openingBalance: "0", currentBalance: balance, status: "ACTIVE", notes: null, createdAt: "", updatedAt: "" });
  const contacts = [contact("Rahim", "CUSTOMER", "64500.00", "01712"), contact("Nabil", "SUPPLIER", "-92600.00"), contact("Mim", "BOTH", "0.00"), contact("Shapla", "CUSTOMER", "0.00")];

  it("sums what is owed each way and counts people", () => {
    expect(contactStats(contacts)).toEqual({ receivable: 64500, receivableFrom: 1, payable: 92600, payableTo: 1, customers: 3, suppliers: 2, total: 4 });
  });

  it("filters by role, direction and search", () => {
    expect(filterContacts(contacts, "CUSTOMER", "").map((c) => c.id)).toEqual(["Rahim", "Mim", "Shapla"]);
    expect(filterContacts(contacts, "SUPPLIER", "").map((c) => c.id)).toEqual(["Nabil", "Mim"]);
    expect(filterContacts(contacts, "OWE_YOU", "").map((c) => c.id)).toEqual(["Rahim"]);
    expect(filterContacts(contacts, "YOU_OWE", "").map((c) => c.id)).toEqual(["Nabil"]);
    expect(filterContacts(contacts, "ALL", "0171").map((c) => c.id)).toEqual(["Rahim"]);
  });
});

describe("ageing", () => {
  const report = { buckets: { current: "98400.00", days1to30: "52000.00", days31to60: "21000.00", over60: "15000.00" } };

  it("turns the buckets into shares of the whole", () => {
    const shares = agingShares(report);
    expect(agingTotal(report)).toBe(186400);
    expect(shares.map((s) => s.pct)).toEqual([52.8, 27.9, 11.3, 8]);
    expect(agingShares({ buckets: { current: "0", days1to30: "0", days31to60: "0", over60: "0" } }).every((s) => s.pct === 0)).toBe(true);
  });

  it("folds overdue invoices to one line per contact, oldest first", () => {
    const rows: OverdueRow[] = [
      { contactId: "r", contactName: "Rahim", transactionId: "1", description: "INV-0318", originalAmount: "15000", remainingAmount: "15000", dueDate: "2026-07-20", daysOverdue: 74 },
      { contactId: "r", contactName: "Rahim", transactionId: "2", description: "INV-0360", originalAmount: "25000", remainingAmount: "25000", dueDate: "2026-08-18", daysOverdue: 45 },
      { contactId: "s", contactName: "Sohag", transactionId: "3", description: "INV-0290", originalAmount: "21000", remainingAmount: "21000", dueDate: "2026-06-26", daysOverdue: 98 },
    ];
    const late = lateByContact(rows);
    expect(late.map((l) => `${l.contactName}:${l.amount}:${l.daysLate}:${l.oldestDescription}`)).toEqual(["Sohag:21000:98:INV-0290", "Rahim:40000:74:INV-0318"]);
    expect(daysBetween("2026-07-20", "2026-10-02")).toBe(74);
  });
});

describe("a journal entry", () => {
  it("totals the two columns and knows when the entry is ready", () => {
    const lines = [
      { accountId: "rent", note: "", debit: "15,000", credit: "" },
      { accountId: "bank", note: "", debit: "", credit: "12,000" },
      { accountId: "cash", note: "Rest in cash", debit: "", credit: "3000" },
      { accountId: "", note: "", debit: "", credit: "" },
    ];
    const totals = journalTotals(lines);
    expect(totals).toEqual({ debit: 15000, credit: 15000, difference: 0, balanced: true, complete: true });
    expect(journalEntries(lines)).toEqual([
      { accountId: "rent", entryType: "DEBIT", amount: 15000 },
      { accountId: "bank", entryType: "CREDIT", amount: 12000 },
      { accountId: "cash", entryType: "CREDIT", amount: 3000, description: "Rest in cash" },
    ]);
    expect(journalTotals([{ accountId: "a", note: "", debit: "10", credit: "" }]).complete).toBe(false);
    expect(journalTotals([{ accountId: "a", note: "", debit: "10", credit: "" }, { accountId: "", note: "", debit: "", credit: "10" }]).complete).toBe(false);
    expect(journalTotals([{ accountId: "a", note: "", debit: "10", credit: "5" }, { accountId: "b", note: "", debit: "", credit: "5" }]).complete).toBe(false);
    expect(journalTotals([{ accountId: "a", note: "", debit: "10", credit: "" }, { accountId: "b", note: "", debit: "", credit: "8" }]).difference).toBe(2);
  });
});
