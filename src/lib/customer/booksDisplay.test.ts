import { describe, expect, it } from "vitest";
import type { Account, AccountGroup, AccountLedger, Contact, ContactBalanceDetail, LedgerRow, OverdueRow, Transaction } from "./api";
import {
  accountsCsvRows,
  agingFor,
  agingFromInvoices,
  agingShares,
  agingTotal,
  booksBalance,
  booksDate,
  booksRange,
  contactOwed,
  contactStats,
  contactsCsvRows,
  daysBetween,
  descendantIds,
  filterAccounts,
  filterContacts,
  findInChart,
  flattenAccounts,
  hasAccountCodes,
  hasJournalAmounts,
  isAppManagedAccount,
  isMoneyAccount,
  journalEntries,
  journalTotals,
  lastRow,
  lateByContact,
  ledgerFigures,
  ledgerWords,
  lineNeedsAccount,
  overdueOver30,
  reversedDates,
  statementRows,
  statementRowsFromApi,
  subtypeLabel,
  yearRows,
} from "./booksDisplay";

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

// A translator that marks what it was asked to translate.
const bracket = (key: string) => `[${key}]`;

describe("accounts", () => {
  it("flattens a tree parents first and searches it", () => {
    const rows = flattenAccounts(GROUPS[0].accounts);
    expect(rows.map((r) => `${r.account.id}:${r.depth}`)).toEqual(["Cash:0", "Bank:0", "Branch:1"]);
    expect(filterAccounts(rows, "1020").map((r) => r.account.id)).toEqual(["Bank"]);
    expect(filterAccounts(rows, "cash").map((r) => r.account.id)).toEqual(["Cash"]);
    expect(filterAccounts(rows, "")).toHaveLength(3);
    expect([...descendantIds(GROUPS[0].accounts[1])]).toEqual(["Bank", "Branch"]);
  });

  it("finds an account in the chart with its sub-accounts", () => {
    expect(findInChart(GROUPS, "Bank")?.children.map((child) => child.id)).toEqual(["Branch"]);
    expect(findInChart(GROUPS, "Branch")?.id).toBe("Branch");
    expect(findInChart(GROUPS, "missing")).toBeUndefined();
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
    expect(accountsCsvRows(GROUPS.slice(4))).toEqual([["", "Rent", "Expense", "", 39200]]);
  });

  it("writes the chart's file in the reader's language", () => {
    const named: AccountGroup[] = [{ accountType: "ASSET", accounts: [account({ id: "Cash", nameBn: "নগদ টাকা", accountType: "ASSET", currentBalance: "10.00", accountSubtype: "mfs" })] }];
    expect(accountsCsvRows(named, bracket, "BN")).toEqual([["", "নগদ টাকা", "[Asset]", "[Mobile banking]", 10]]);
    expect(accountsCsvRows(GROUPS.slice(4), bracket)).toEqual([["", "Rent", "[Expense@@account]", "", 39200]]);
  });

  it("names the kinds the app gives its own accounts, and leaves an unknown one as it is", () => {
    expect(subtypeLabel("fixed-assets")).toBe("Fixed assets");
    expect(subtypeLabel("referral-bonus")).toBe("Referral bonus");
    expect(subtypeLabel("loan")).toBe("Loan");
    expect(subtypeLabel("something-new")).toBe("something-new");
    expect(subtypeLabel(null)).toBeNull();
  });

  it("knows which system accounts the app keeps from being archived or removed", () => {
    const system = (accountType: Account["accountType"], accountSubtype: string | null) => account({ id: "x", accountType, accountSubtype, currentBalance: "0.00", isSystemAccount: true });
    expect(isAppManagedAccount(system("ASSET", "receivable"))).toBe(true);
    expect(isAppManagedAccount(system("LIABILITY", "payable"))).toBe(true);
    expect(isAppManagedAccount(system("ASSET", "fixed-assets"))).toBe(true);
    expect(isAppManagedAccount(system("INCOME", "referral-bonus"))).toBe(true);
    // The hidden savings pool, but not a savings account the owner added.
    expect(isAppManagedAccount(system("ASSET", "savings"))).toBe(true);
    expect(isAppManagedAccount(account({ id: "DPS", accountType: "ASSET", accountSubtype: "savings", currentBalance: "0.00" }))).toBe(false);
    // A seeded default (an income or expense category) archives like any other.
    expect(isAppManagedAccount(system("EXPENSE", null))).toBe(false);
    expect(isAppManagedAccount(system("ASSET", "cash"))).toBe(false);
  });

  it("checks that the books balance, counting sub-accounts", () => {
    const balance = booksBalance(GROUPS);
    expect(balance.owns).toBe(360900);
    expect(balance.owes).toBe(250000);
    expect(balance.share).toBe(110800);
    expect(balance.opening).toBe(0);
    expect(balance.balanced).toBe(false);
    expect(balance.gap).toBe(100);
    expect(booksBalance([...GROUPS.slice(0, 2), { accountType: "EQUITY", accounts: [account({ id: "Capital", accountType: "EQUITY", currentBalance: "50100.00" })] }, ...GROUPS.slice(3)]).balanced).toBe(true);
  });

  it("counts opening balances in the owner's share, so a wallet opened with money still balances", () => {
    const cashOnly = booksBalance([{ accountType: "ASSET", accounts: [account({ id: "Cash", accountType: "ASSET", currentBalance: "10000.00", openingBalance: "10000.00" })] }]);
    expect(cashOnly).toEqual({ owns: 10000, owes: 0, share: 10000, opening: 10000, gap: 0, balanced: true });
    // A loan account opened owing money takes it back out of the share.
    const withLoan = booksBalance([
      { accountType: "ASSET", accounts: [account({ id: "Cash", accountType: "ASSET", currentBalance: "12000.00", openingBalance: "10000.00" })] },
      { accountType: "LIABILITY", accounts: [account({ id: "Loan", accountType: "LIABILITY", currentBalance: "5000.00", openingBalance: "5000.00" })] },
      { accountType: "INCOME", accounts: [account({ id: "Sales", accountType: "INCOME", currentBalance: "2000.00" })] },
    ]);
    expect(withLoan.opening).toBe(5000);
    expect(withLoan.share).toBe(7000);
    expect(withLoan.balanced).toBe(true);
  });

  it("sums a year's income or expenses by account", () => {
    expect(yearRows([{ id: "r", name: "Rent", totalIn: "60000.00", totalOut: "0.00" }, { id: "s", name: "Stock", totalIn: "620600.00", totalOut: "200.00" }, { id: "i", name: "Interest", totalIn: "0.00", totalOut: "0.00" }])).toEqual({
      rows: [
        { id: "s", name: "Stock", total: 620400 },
        { id: "r", name: "Rent", total: 60000 },
      ],
      total: 680400,
    });
  });

  it("orders siblings by code, uncoded ones last", () => {
    const rows = flattenAccounts([account({ id: "Late", accountType: "ASSET", currentBalance: "0", displayOrder: 1 }), account({ id: "B", accountType: "ASSET", currentBalance: "0", accountNumber: "1020" }), account({ id: "Early", accountType: "ASSET", currentBalance: "0", displayOrder: 0 }), account({ id: "A", accountType: "ASSET", currentBalance: "0", accountNumber: "1010" })]);
    expect(rows.map((r) => r.account.id)).toEqual(["A", "B", "Early", "Late"]);
  });
});

describe("an account's ledger", () => {
  it("calls wallet movements money in and out, and every other account's increases and decreases", () => {
    expect(isMoneyAccount({ accountType: "ASSET", accountSubtype: "mfs" })).toBe(true);
    expect(isMoneyAccount({ accountType: "ASSET", accountSubtype: "receivable" })).toBe(false);
    expect(isMoneyAccount({ accountType: "EXPENSE", accountSubtype: null })).toBe(false);
    expect(ledgerWords({ accountType: "ASSET", accountSubtype: "cash" })).toEqual({ in: "Money in@@ledger", out: "Money out@@ledger", money: true });
    expect(ledgerWords({ accountType: "EXPENSE", accountSubtype: null })).toEqual({ in: "Increase@@ledger", out: "Decrease@@ledger", money: false });
    expect(ledgerWords({ accountType: "LIABILITY", accountSubtype: "payable" }).money).toBe(false);
  });

  const row = (id: string, entryType: LedgerRow["entryType"], amount: string, runningBalance: string): LedgerRow => ({ entryId: id, transactionId: id, transactionType: "INCOME", date: "2026-10-01", description: null, referenceNo: null, entryType, amount, transactionStatus: "POSTED", runningBalance });
  const ledger = (over: Partial<AccountLedger>): AccountLedger => ({ accountId: "a", accountName: "Cash", openingBalance: "0", balanceBroughtForward: "1000.00", entries: [], closingBalance: "1000.00", meta: { page: 1, limit: 50, total: 0, totalPages: 0 }, ...over });
  const summary = { totalIn: "500.00", totalOut: "200.00", adjustment: "0.00" };

  it("reads the period's closing and each page's brought and carried forward lines from the API", () => {
    const page2 = ledgerFigures(ledger({ entries: [row("e", "DEBIT", "100", "1200.00")], closingBalance: "1300.00", pageOpeningBalance: "1100.00", pageClosingBalance: "1200.00", meta: { page: 2, limit: 50, total: 120, totalPages: 3 } }), "ASSET", summary);
    expect(page2).toEqual({ opening: 1000, closing: 1300, pageOpening: 1100, pageClosing: 1200, firstPage: false, lastPage: false, change: 300, voided: 0 });
  });

  it("works the figures out on an older backend that sends neither page line", () => {
    // Page 1 of 2: closingBalance is the running balance at the page's end.
    const first = ledgerFigures(ledger({ entries: [row("a", "DEBIT", "300", "1300.00"), row("b", "CREDIT", "100", "1200.00")], closingBalance: "1200.00", meta: { page: 1, limit: 2, total: 3, totalPages: 2 } }), "ASSET", summary);
    expect(first).toMatchObject({ pageOpening: 1000, pageClosing: 1200, closing: 1300, firstPage: true, lastPage: false });
    // The last page's closingBalance is the period's.
    const last = ledgerFigures(ledger({ entries: [row("c", "CREDIT", "100", "1300.00")], closingBalance: "1300.00", meta: { page: 2, limit: 2, total: 3, totalPages: 2 } }), "EXPENSE", summary);
    expect(last).toMatchObject({ pageOpening: 1400, pageClosing: 1300, closing: 1300, lastPage: true });
    // No entries at all: one page, opening and closing alike.
    expect(ledgerFigures(ledger({}), "ASSET", { totalIn: "0", totalOut: "0", adjustment: "0" })).toMatchObject({ pageOpening: 1000, pageClosing: 1000, closing: 1000, firstPage: true, lastPage: true, change: 0, voided: 0 });
  });

  it("names what a void in another period leaves in the change", () => {
    // A September sale voided in October: October's balance falls by it, but
    // its money in and out leave the pair out.
    const october = ledgerFigures(ledger({ closingBalance: "900.00", pageOpeningBalance: "1000.00", pageClosingBalance: "900.00", meta: { page: 1, limit: 50, total: 1, totalPages: 1 } }), "ASSET", { totalIn: "0.00", totalOut: "0.00", adjustment: "0.00" });
    expect(october.change).toBe(-100);
    expect(october.voided).toBe(-100);
  });
});

describe("a ledger's reversals", () => {
  it("finds the day of the posting a reversal undid, when it is on the page", () => {
    const reversed = reversedDates([
      { transactionId: "t1", date: "2026-10-02", reversalOfId: null },
      { transactionId: "t2", date: "2026-10-05", reversalOfId: "t1" },
      { transactionId: "t3", date: "2026-10-06", reversalOfId: "elsewhere" },
      { transactionId: "t4", date: "2026-10-07" },
    ]);
    expect([...reversed]).toEqual([["t2", "2026-10-02"]]);
  });
});

describe("Books dates", () => {
  it("adds the year only outside this year, in English or Bangla words", () => {
    expect(booksDate("2026-06-03T00:00:00.000Z", "en", { today: "2026-10-21", weekday: true })).toBe("Wed, 3 Jun");
    expect(booksDate("2025-06-03T00:00:00.000Z", "en", { today: "2026-10-21", weekday: true })).toBe("Tue, 3 Jun 2025");
    expect(booksDate("2026-06-03", "en", { today: "2026-10-21" })).toBe("3 Jun");
    expect(booksDate("2026-10-01T00:00:00.000Z", "bn", { today: "2026-10-21", weekday: true })).toBe("বৃহস্পতি, ১ অক্টো");
    expect(booksDate("2025-10-01T00:00:00.000Z", "bn", { today: "2026-10-21" })).toBe("১ অক্টো ২০২৫");
    // Without a today, the year always shows.
    expect(booksDate("2026-06-03", "en")).toBe("3 Jun 2026");
    expect(booksDate("2026-06-03", "en", { today: "2025-01-01", year: "never" })).toBe("3 Jun");
  });

  it("words a period", () => {
    expect(booksRange("2026-09-01", "2026-10-02", "en")).toBe("1 Sep – 2 Oct 2026");
    expect(booksRange("2025-12-01", "2026-01-31", "en")).toBe("1 Dec 2025 – 31 Jan 2026");
    expect(booksRange("2026-09-01", undefined, "bn")).toBe("১ সেপ্টে ২০২৬");
    expect(booksRange(undefined, undefined, "en")).toBeNull();
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
    expect(contactsCsvRows(contacts.slice(0, 1), bracket)[0][1]).toBe("[Customer@@books]");
  });

  const direction = (over: Partial<ContactBalanceDetail["receivable"]> & { openingRemaining?: string } = {}) => ({ totalInvoiced: "0.00", totalPaid: "0.00", remaining: "0.00", transactions: [], ...over });
  const invoice = (id: string, remainingAmount: string) => ({ transactionId: id, date: "2026-09-01", description: null, originalAmount: remainingAmount, amountPaid: "0.00", remainingAmount, dueDate: null, isOverdue: false });

  it("counts what was owed from before Books as its own part of the debt", () => {
    // Already owed 20,000 and no invoices: all of it is from before.
    const before = contactOwed({ receivable: direction({ openingRemaining: "20000.00" }), payable: direction({ openingRemaining: "0.00" }) }, 20000);
    expect(before.receivable).toEqual({ invoices: [], onInvoices: 0, fromBefore: 20000, total: 20000 });
    expect(before.payable.total).toBe(0);
    // Paid invoices drop out; the rest add to what was owed before.
    const mixed = contactOwed({ receivable: direction({ openingRemaining: "5000.00", transactions: [invoice("a", "3000.00"), invoice("b", "0.00")] }), payable: direction() }, 8000);
    expect(mixed.receivable.invoices.map((i) => i.transactionId)).toEqual(["a"]);
    expect(mixed.receivable).toMatchObject({ onInvoices: 3000, fromBefore: 5000, total: 8000 });
  });

  it("falls back to what the balance holds beyond the invoices on an older backend", () => {
    const owed = contactOwed({ receivable: direction({ transactions: [invoice("a", "3000.00")] }), payable: direction() }, 23000);
    expect(owed.receivable).toMatchObject({ onInvoices: 3000, fromBefore: 20000, total: 23000 });
    // A supplier the business owes from before.
    expect(contactOwed({ receivable: direction(), payable: direction() }, -4000).payable.fromBefore).toBe(4000);
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

  it("takes the statement endpoint's rows as they come, balance and all", () => {
    const rows = statementRowsFromApi([
      { transactionId: "s1", date: "2026-06-03T00:00:00.000Z", kind: "sale", referenceNo: "INV-0277", description: null, wallet: null, amount: "35000.00", runningBalance: "55000.00", cancelled: false },
      { transactionId: "v", date: "2026-08-01T00:00:00.000Z", kind: "sale", referenceNo: null, description: "Wrong", wallet: null, amount: "999.00", runningBalance: "55000.00", cancelled: true },
      { transactionId: "p", date: "2026-09-02T00:00:00.000Z", kind: "received", referenceNo: null, description: null, wallet: "Islami Bank", amount: "35000.00", runningBalance: "20000.00", cancelled: false },
    ]);
    expect(rows.map((row) => `${row.id}:${row.kind}:${row.amount}:${row.running}${row.cancelled ? ":x" : ""}`)).toEqual(["s1:sale:35000:55000", "v:sale:999:55000:x", "p:received:35000:20000"]);
    expect(rows[2].wallet).toBe("Islami Bank");
    expect(rows[1].note).toBe("Wrong");
  });

  it("sums what is more than 30 days late", () => {
    const report = { buckets: { current: "98400.00", days1to30: "52000.00", days31to60: "21000.00", over60: "15000.00" }, contacts: [{ contactId: "r", contactName: "Rahim", current: "0", days1to30: "0", days31to60: "21000", over60: "0", total: "21000", totalInvoiced: "21000", totalPaid: "0" }, { contactId: "k", contactName: "Karim", current: "98400", days1to30: "52000", days31to60: "0", over60: "0", total: "150400", totalInvoiced: "150400", totalPaid: "0" }] };
    expect(overdueOver30(report)).toEqual({ amount: 36000, contacts: 1 });
  });

  it("narrows the aging to Books' own contacts and adds the buckets up again", () => {
    const report = {
      buckets: { current: "1100.00", days1to30: "200.00", days31to60: "0.00", over60: "5000.00" },
      contacts: [
        { contactId: "shop", contactName: "Shop", current: "1000.00", days1to30: "200.00", days31to60: "0.00", over60: "0.00", total: "1200.00", totalInvoiced: "1200.00", totalPaid: "0.00" },
        { contactId: "loan", contactName: "Friend", current: "100.00", days1to30: "0.00", days31to60: "0.00", over60: "5000.00", total: "5100.00", totalInvoiced: "5100.00", totalPaid: "0.00" },
      ],
    };
    const books = agingFor(report, new Set(["shop"]));
    expect(books.contacts.map((row) => row.contactId)).toEqual(["shop"]);
    expect(books.buckets).toEqual({ current: "1000.00", days1to30: "200.00", days31to60: "0.00", over60: "0.00" });
    expect(agingFor(report, new Set()).buckets.over60).toBe("0.00");
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

  it("adds what was owed from before Books as a fifth share", () => {
    const shares = agingShares({ buckets: { current: "0", days1to30: "0", days31to60: "0", over60: "0" } }, 20000);
    expect(shares.map((s) => `${s.key}:${s.amount}:${s.pct}`)).toEqual(["current:0:0", "days1to30:0:0", "days31to60:0:0", "over60:0:0", "opening:20000:100"]);
    expect(agingShares(report, 0)).toHaveLength(4);
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

  it("counts only what is more than 30 days late on the Over 30 days list", () => {
    const rows: OverdueRow[] = [
      { contactId: "r", contactName: "Rahim", transactionId: "1", description: "INV-1", originalAmount: "25000", remainingAmount: "25000", dueDate: "2026-09-06", daysOverdue: 45 },
      { contactId: "r", contactName: "Rahim", transactionId: "2", description: "INV-2", originalAmount: "10000", remainingAmount: "10000", dueDate: "2026-10-11", daysOverdue: 10 },
      { contactId: "k", contactName: "Karim", transactionId: "3", description: "INV-3", originalAmount: "500", remainingAmount: "500", dueDate: "2026-10-01", daysOverdue: 20 },
    ];
    expect(lateByContact(rows, 30).map((l) => `${l.contactName}:${l.amount}:${l.daysLate}`)).toEqual(["Rahim:25000:45"]);
    expect(lateByContact(rows).map((l) => `${l.contactName}:${l.amount}`)).toEqual(["Rahim:35000", "Karim:500"]);
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

  it("points at the lines that still need an account, and knows when there is something to lose", () => {
    expect(lineNeedsAccount({ accountId: "", note: "", debit: "", credit: "100" })).toBe(true);
    expect(lineNeedsAccount({ accountId: "", note: "Rent", debit: "", credit: "" })).toBe(false);
    expect(lineNeedsAccount({ accountId: "rent", note: "", debit: "100", credit: "" })).toBe(false);
    expect(hasJournalAmounts([{ accountId: "rent", note: "Rent", debit: "", credit: "" }])).toBe(false);
    expect(hasJournalAmounts([{ accountId: "", note: "", debit: "0", credit: "5" }])).toBe(true);
  });
});
