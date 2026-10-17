import { describe, expect, it } from "vitest";
import type { Account, AccountGroup, Contact, OverdueRow, Transaction } from "./api";
import { accountsCsvRows, agingFromInvoices, agingShares, agingTotal, booksBalance, contactStats, contactsCsvRows, daysBetween, descendantIds, filterAccounts, filterContacts, flattenAccounts, hasAccountCodes, journalEntries, journalTotals, lastRow, lateByContact, overdueOver30, statementRows, yearRows } from "./booksDisplay";

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

  it("checks that the books balance, counting sub-accounts", () => {
    const balance = booksBalance(GROUPS);
    expect(balance.owns).toBe(360900);
    expect(balance.owes).toBe(250000);
    expect(balance.share).toBe(110800);
    expect(balance.balanced).toBe(false);
    expect(booksBalance([...GROUPS.slice(0, 2), { accountType: "EQUITY", accounts: [account({ id: "Capital", accountType: "EQUITY", currentBalance: "50100.00" })] }, ...GROUPS.slice(3)]).balanced).toBe(true);
  });

  it("sums a year's income or expenses by account", () => {
    expect(yearRows([{ name: "Rent", totalIn: "60000.00", totalOut: "0.00" }, { name: "Stock", totalIn: "620600.00", totalOut: "200.00" }, { name: "Interest", totalIn: "0.00", totalOut: "0.00" }])).toEqual({ rows: [{ name: "Stock", total: 620400 }, { name: "Rent", total: 60000 }], total: 680400 });
  });

  it("orders siblings by code, uncoded ones last", () => {
    const rows = flattenAccounts([account({ id: "Late", accountType: "ASSET", currentBalance: "0", displayOrder: 1 }), account({ id: "B", accountType: "ASSET", currentBalance: "0", accountNumber: "1020" }), account({ id: "Early", accountType: "ASSET", currentBalance: "0", displayOrder: 0 }), account({ id: "A", accountType: "ASSET", currentBalance: "0", accountNumber: "1010" })]);
    expect(rows.map((r) => r.account.id)).toEqual(["A", "B", "Early", "Late"]);
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
    expect(contactsCsvRows(contacts.slice(0, 2))).toEqual([
      ["Rahim", "Customer", "01712", "", 64500],
      ["Nabil", "Supplier", "", "", -92600],
    ]);
  });
});

describe("a statement", () => {
  const entry = (subtype: string | null, entryType: "DEBIT" | "CREDIT", amount: string, name = subtype ?? "Cash") => ({ id: `${name}-${entryType}`, transactionId: "", accountId: name, entryType, amount, categoryId: null, note: null, account: { id: name, name, accountType: "ASSET" as const, accountSubtype: subtype } });
  const tx = (id: string, type: Transaction["transactionType"], date: string, entries: Transaction["entries"], over: Partial<Transaction> = {}): Transaction => ({ id, businessId: "b", transactionType: type, transactionDate: date, referenceNo: null, description: null, contactId: "r", status: "POSTED", createdBy: "u", createdAt: date, voidedAt: null, voidedReason: null, reversalOfId: null, voidable: true, entries, ...over });
  const transactions = [
    tx("pay", "PAYMENT", "2026-09-02", [entry("bank", "DEBIT", "35000", "Islami Bank"), entry("receivable", "CREDIT", "35000")], { description: "Clears INV-0277" }),
    tx("s2", "SALE", "2026-07-20", [entry("receivable", "DEBIT", "15000"), entry(null, "CREDIT", "15000", "Sales")], { referenceNo: "INV-0318" }),
    tx("s1", "SALE", "2026-06-03", [entry("receivable", "DEBIT", "35000"), entry(null, "CREDIT", "35000", "Sales")], { referenceNo: "INV-0277" }),
    tx("void", "SALE", "2026-08-01", [entry("receivable", "DEBIT", "999"), entry(null, "CREDIT", "999", "Sales")], { status: "VOIDED" }),
    tx("buy", "PURCHASE", "2026-09-10", [entry(null, "DEBIT", "5000", "Stock"), entry("payable", "CREDIT", "5000")]),
    tx("out", "PAYMENT", "2026-09-12", [entry("payable", "DEBIT", "5000"), entry("cash", "CREDIT", "5000", "Cash")]),
    tx("journal", "JOURNAL", "2026-09-13", []),
  ];

  it("runs oldest first, tells payments in from payments out and skips what was voided", () => {
    const rows = statementRows(transactions, "0");
    expect(rows.map((row) => `${row.kind}:${row.amount}:${row.running}${row.cancelled ? ":x" : ""}`)).toEqual(["sale:35000:35000", "sale:15000:50000", "sale:999:50000:x", "received:35000:15000", "purchase:5000:10000", "paid:5000:15000"]);
    expect(rows[3].wallet).toBe("Islami Bank");
    expect(rows[0].reference).toBe("INV-0277");
    expect(lastRow(rows, ["sale"])?.id).toBe("s2");
    expect(lastRow(rows, ["received", "paid"])?.id).toBe("out");
    expect(statementRows([], "-1200")[0]).toBeUndefined();
  });

  it("sums what is more than 30 days late", () => {
    const report = { buckets: { current: "98400.00", days1to30: "52000.00", days31to60: "21000.00", over60: "15000.00" }, contacts: [{ contactId: "r", contactName: "Rahim", current: "0", days1to30: "0", days31to60: "21000", over60: "0", total: "21000", totalInvoiced: "21000", totalPaid: "0" }, { contactId: "k", contactName: "Karim", current: "98400", days1to30: "52000", days31to60: "0", over60: "0", total: "150400", totalInvoiced: "150400", totalPaid: "0" }] };
    expect(overdueOver30(report)).toEqual({ amount: 36000, contacts: 1 });
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

  it("sorts one contact's invoices into the age buckets", () => {
    const invoices = [
      { dueDate: "2026-10-20", remainingAmount: "24500" },
      { dueDate: null, remainingAmount: "100" },
      { dueDate: "2026-09-10", remainingAmount: "25000" },
      { dueDate: "2026-08-10", remainingAmount: "15000" },
      { dueDate: "2026-06-01", remainingAmount: "7000" },
      { dueDate: "2026-06-01", remainingAmount: "0" },
    ];
    expect(agingFromInvoices(invoices, "2026-10-02")).toEqual({ current: "24600.00", days1to30: "25000.00", days31to60: "15000.00", over60: "7000.00" });
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
      { accountId: "cash", entryType: "CREDIT", amount: 3000, note: "Rest in cash" },
    ]);
    expect(journalTotals([{ accountId: "a", note: "", debit: "10", credit: "" }]).complete).toBe(false);
    expect(journalTotals([{ accountId: "a", note: "", debit: "10", credit: "" }, { accountId: "", note: "", debit: "", credit: "10" }]).complete).toBe(false);
    expect(journalTotals([{ accountId: "a", note: "", debit: "10", credit: "5" }, { accountId: "b", note: "", debit: "", credit: "5" }]).complete).toBe(false);
    expect(journalTotals([{ accountId: "a", note: "", debit: "10", credit: "" }, { accountId: "b", note: "", debit: "", credit: "8" }]).difference).toBe(2);
  });
});
