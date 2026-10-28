import { describe, expect, it } from "vitest";
import { inEnglish } from "@/lib/i18n/message";
import { formatDate } from "./date";
import { isDebitPositive, isSettledDay, ledgerDirection, periodText, readsAsMoney, statementBackLabel, statementBackPath, statementPage, statementParty, transactionHref, voidedNet } from "./ledger";

describe("isDebitPositive", () => {
  it("is true for assets and expenses only", () => {
    expect(isDebitPositive("ASSET")).toBe(true);
    expect(isDebitPositive("EXPENSE")).toBe(true);
    expect(isDebitPositive("INCOME")).toBe(false);
    expect(isDebitPositive("LIABILITY")).toBe(false);
    expect(isDebitPositive("EQUITY")).toBe(false);
  });
});

describe("ledgerDirection", () => {
  it("reads a debit to a wallet as money in", () => {
    expect(ledgerDirection("DEBIT", "ASSET")).toBe("in");
    expect(ledgerDirection("CREDIT", "ASSET")).toBe("out");
  });

  it("reads a credit to an income account as money in", () => {
    expect(ledgerDirection("CREDIT", "INCOME")).toBe("in");
    expect(ledgerDirection("DEBIT", "INCOME")).toBe("out");
  });
});

describe("readsAsMoney", () => {
  it("is true for cash, bank, mobile and savings wallets", () => {
    for (const accountSubtype of ["cash", "bank", "mfs", "savings"]) {
      expect(readsAsMoney({ accountType: "ASSET", accountSubtype })).toBe(true);
    }
  });

  it("is false for categories, receivables and other accounts", () => {
    expect(readsAsMoney({ accountType: "EXPENSE", accountSubtype: null })).toBe(false);
    expect(readsAsMoney({ accountType: "INCOME", accountSubtype: null })).toBe(false);
    expect(readsAsMoney({ accountType: "ASSET", accountSubtype: null })).toBe(false);
    expect(readsAsMoney({ accountType: "ASSET", accountSubtype: "receivable" })).toBe(false);
    expect(readsAsMoney({ accountType: "LIABILITY", accountSubtype: "bank" })).toBe(false);
  });
});

const ledger = (page: number, totalPages: number, extra: { pageOpeningBalance?: string; pageClosingBalance?: string } = { pageOpeningBalance: "700.00", pageClosingBalance: "900.00" }) => ({
  balanceBroughtForward: "500.00",
  closingBalance: "1200.00",
  meta: { page, limit: 50, total: totalPages * 50, totalPages },
  ...extra,
});

describe("statementPage", () => {
  it("opens the first page with the period's opening and carries the rest forward", () => {
    expect(statementPage(ledger(1, 3))).toEqual({
      top: { kind: "opening", balance: "500.00" },
      bottom: { kind: "carried-forward", balance: "900.00" },
      firstRow: 1,
      exact: true,
    });
  });

  it("brings a middle page's opening forward from the page before", () => {
    const middle = statementPage(ledger(2, 3));
    expect(middle.top).toEqual({ kind: "brought-forward", balance: "700.00" });
    expect(middle.bottom).toEqual({ kind: "carried-forward", balance: "900.00" });
    expect(middle.firstRow).toBe(51);
  });

  it("ends the last page with the period's closing", () => {
    const last = statementPage(ledger(3, 3));
    expect(last.top).toEqual({ kind: "brought-forward", balance: "700.00" });
    expect(last.bottom).toEqual({ kind: "closing", balance: "1200.00" });
    expect(last.firstRow).toBe(101);
  });

  it("shows opening and closing on a single page, and on an empty statement", () => {
    expect(statementPage(ledger(1, 1))).toMatchObject({ top: { kind: "opening" }, bottom: { kind: "closing" } });
    expect(statementPage(ledger(1, 0))).toMatchObject({ top: { kind: "opening" }, bottom: { kind: "closing" }, firstRow: 1 });
  });

  it("keeps the old opening and closing lines for a backend without page balances", () => {
    expect(statementPage(ledger(2, 3, {}))).toEqual({
      top: { kind: "opening", balance: "500.00" },
      bottom: { kind: "closing", balance: "1200.00" },
      firstRow: 51,
      exact: false,
    });
  });
});

describe("voidedNet", () => {
  it("is 0 when opening, in, out and transfers add up to the closing", () => {
    expect(voidedNet({ balanceBroughtForward: "10000.00", closingBalance: "17500.00" }, { totalIn: "5500.00", totalOut: "0.00", adjustment: "2000.00" })).toBe(0);
    expect(voidedNet({ balanceBroughtForward: "0.10", closingBalance: "0.30" }, { totalIn: "0.20", totalOut: "0", adjustment: "0" })).toBe(0);
  });

  it("is the half of a void that fell in this period", () => {
    // A September income of 5,000 edited to 5,500 on 21 October: September
    // keeps the voided original but not its reversal.
    expect(voidedNet({ balanceBroughtForward: "10000.00", closingBalance: "20500.00" }, { totalIn: "5500.00", totalOut: "0.00", adjustment: "0.00" })).toBe(5000);
    // October holds the reversal of an entry from September.
    expect(voidedNet({ balanceBroughtForward: "20500.00", closingBalance: "15500.00" }, { totalIn: "0.00", totalOut: "0.00", adjustment: "0.00" })).toBe(-5000);
  });

  it("works to the paisa", () => {
    expect(voidedNet({ balanceBroughtForward: "100.10", closingBalance: "100.30" }, { totalIn: "0", totalOut: "0", adjustment: "0" })).toBe(0.2);
  });
});

describe("isSettledDay", () => {
  it("takes a whole calendar day", () => {
    expect(isSettledDay("2026-10-21")).toBe(true);
    expect(isSettledDay("1900-01-01")).toBe(true);
  });

  it("waits while the year is still being typed", () => {
    expect(isSettledDay("0002-10-21")).toBe(false);
    expect(isSettledDay("0202-10-21")).toBe(false);
    expect(isSettledDay("")).toBe(false);
    expect(isSettledDay("2026-02-30")).toBe(false);
  });
});

describe("periodText", () => {
  it("names the period in words", () => {
    expect(periodText(inEnglish, "2026-10-01", "2026-10-21")).toBe("1 Oct 2026 to 21 Oct 2026");
    expect(periodText(inEnglish, "2026-10-01")).toBe("From 1 Oct 2026");
    expect(periodText(inEnglish, undefined, "2026-10-21")).toBe("Up to 21 Oct 2026");
    expect(periodText(inEnglish)).toBe("All time");
  });

  it("writes the days in the reader's language", () => {
    const bn = formatDate("2026-10-01", undefined, "bn");
    expect(bn).not.toBe("1 Oct 2026");
    expect(periodText(inEnglish, "2026-10-01", undefined, "bn")).toBe(`From ${bn}`);
  });
});

describe("statementBackPath", () => {
  it("takes a path on this site", () => {
    expect(statementBackPath("/savings-goals/overview")).toBe("/savings-goals/overview");
    expect(statementBackPath("/balance/transfer?range=this-month")).toBe("/balance/transfer?range=this-month");
  });

  it("refuses another site's address and anything that isn't a path", () => {
    expect(statementBackPath("https://evil.example")).toBeNull();
    expect(statementBackPath("//evil.example")).toBeNull();
    expect(statementBackPath("/\\evil.example")).toBeNull();
    expect(statementBackPath("/\t/evil.example")).toBeNull();
    expect(statementBackPath("savings-goals")).toBeNull();
    expect(statementBackPath(["/a", "/b"])).toBeNull();
    expect(statementBackPath(undefined)).toBeNull();
  });
});

describe("statementBackLabel", () => {
  it("names a known page, else says Back", () => {
    expect(statementBackLabel("/savings-goals/overview")).toBe("Back to Savings overview");
    expect(statementBackLabel("/savings-goals/overview?tab=1")).toBe("Back to Savings overview");
    expect(statementBackLabel("/balance/transfer")).toBe("Back");
  });
});

describe("transactionHref", () => {
  it("opens the transaction, remembering the list it came from", () => {
    expect(transactionHref("t1")).toBe("/transactions/t1");
    expect(transactionHref("t1", "/balance/ledger?accountId=a&page=2")).toBe("/transactions/t1?from=%2Fbalance%2Fledger%3FaccountId%3Da%26page%3D2");
  });
});

describe("statementParty", () => {
  it("names the other wallet of a transfer, even with a category", () => {
    expect(statementParty({ transactionType: "TRANSFER", counterAccounts: ["bKash"], category: "Savings" })).toBe("bKash");
  });

  it("names the category of an income or expense, else the other accounts", () => {
    expect(statementParty({ transactionType: "EXPENSE", counterAccounts: ["General expense"], category: "Food" })).toBe("Food");
    expect(statementParty({ transactionType: "JOURNAL", counterAccounts: ["Cash", "Bank"], category: null })).toBe("Cash, Bank");
  });

  it("is null from a backend that sends neither", () => {
    expect(statementParty({ transactionType: "INCOME" })).toBeNull();
  });
});
