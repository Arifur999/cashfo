import { describe, expect, it } from "vitest";
import { inEnglish } from "@/lib/i18n/message";
import { translate } from "@/lib/i18n/translate";
import {
  accountColor,
  chargeOf,
  directionOf,
  entrySource,
  hasHistory,
  kindOf,
  lastUsedText,
  LEDGER_KIND_META,
  ledgerCsv,
  ledgerFileName,
  matchesAccount,
  matchState,
  monthRangeDays,
  moneyByType,
  parseTypedAmount,
  partyOf,
  sortAccounts,
  SORT_LABEL,
} from "./balanceDisplay";

describe("account colours", () => {
  it("keeps one of the ten, else the type's own", () => {
    expect(accountColor({ color: "#2563EB", accountSubtype: "bank" })).toBe("#2563eb");
    expect(accountColor({ color: null, accountSubtype: "mfs" })).toBe("#be185d");
    expect(accountColor({ color: "#123456", accountSubtype: "cash" })).toBe("#1c7567");
    // No subtype reads as a bank.
    expect(accountColor({ accountSubtype: null })).toBe("#0f766e");
  });
});

describe("the accounts list", () => {
  const rows = [
    { name: "Cash", accountSubtype: "cash", accountNumber: null, currentBalance: "9650.00" },
    { name: "Islami Bank", accountSubtype: "bank", accountNumber: "2050 7890", currentBalance: "16800.00" },
    { name: "bKash", accountSubtype: "mfs", accountNumber: "01711482915", currentBalance: "-200.00" },
  ];

  it("sorts by balance either way", () => {
    expect(sortAccounts(rows, "bal-desc").map((row) => row.name)).toEqual(["Islami Bank", "Cash", "bKash"]);
    expect(sortAccounts(rows, "bal-asc").map((row) => row.name)).toEqual(["bKash", "Cash", "Islami Bank"]);
  });

  it("finds an account by name, kind, its Bangla name or number", () => {
    expect(matchesAccount(rows[2], "bKash", "mobile")).toBe(true);
    expect(matchesAccount(rows[1], "Islami Bank", "ব্যাংক")).toBe(true);
    expect(matchesAccount(rows[0], "নগদ", "নগদ")).toBe(true);
    expect(matchesAccount(rows[1], "Islami Bank", "7890")).toBe(true);
    expect(matchesAccount(rows[0], "Cash", "bank")).toBe(false);
    expect(matchesAccount(rows[0], "Cash", "  ")).toBe(true);
  });

  it("splits what the accounts hold by kind, an overdrawn one as nothing", () => {
    expect(moneyByType(rows)).toEqual([
      { type: "cash", amount: 9650, percent: 36 },
      { type: "bank", amount: 16800, percent: 64 },
      { type: "mfs", amount: 0, percent: 0 },
    ]);
    expect(moneyByType([])).toEqual([]);
  });

  it("says when an account was last used", () => {
    expect(lastUsedText(null, "2026-11-02", inEnglish, "en")).toBe("No activity yet");
    expect(lastUsedText("2026-11-02", "2026-11-02", inEnglish, "en")).toBe("Used today");
    expect(lastUsedText("2026-11-01", "2026-11-02", inEnglish, "en")).toBe("Used yesterday");
    expect(lastUsedText("2026-09-02", "2026-11-02", inEnglish, "en")).toBe("Used 2 Sep");
    expect(lastUsedText("2025-12-30", "2026-01-02", inEnglish, "en")).toBe("Used 30 Dec 2025");
  });

  it("deletes only an account nothing was posted to", () => {
    expect(hasHistory({ entryCount: 0 })).toBe(false);
    expect(hasHistory({ entryCount: 3 })).toBe(true);
    // An older backend doesn't count: take it to have some.
    expect(hasHistory({})).toBe(true);
  });
});

describe("Match real balance", () => {
  it("reads a typed amount, Bangla digits and commas too", () => {
    expect(parseTypedAmount("1,650")).toBe(1650);
    expect(parseTypedAmount("১৬৫০.৫")).toBe(1650.5);
    expect(parseTypedAmount("12.345")).toBeNull();
    expect(parseTypedAmount("")).toBeNull();
    expect(parseTypedAmount("-5")).toBeNull();
  });

  it("says what would change", () => {
    expect(matchState(1800, "")).toEqual({ state: "idle" });
    expect(matchState(1800, "1800")).toEqual({ state: "ok" });
    expect(matchState(1800.1, "1650")).toEqual({ state: "diff", difference: -150.1 });
    expect(matchState(0, "25.5")).toEqual({ state: "diff", difference: 25.5 });
  });
});

describe("ledger rows", () => {
  const row = { kind: undefined, transactionType: "EXPENSE" as const, direction: undefined, entryType: "CREDIT" as const, party: null, counterAccounts: ["General Expense"], category: "Food", transactionId: "tx", contactId: null, chargeForId: null, date: "2025-03-14" };

  it("falls back to the transaction type and the entry side on an older backend", () => {
    expect(kindOf(row)).toBe("EXPENSE");
    expect(kindOf({ ...row, transactionType: "JOURNAL" })).toBe("OTHER");
    expect(directionOf(row, true)).toBe("out");
    expect(directionOf({ ...row, direction: "in" }, true)).toBe("in");
  });

  it("names the other side", () => {
    expect(partyOf(row, "EXPENSE")).toBe("Food");
    expect(partyOf({ ...row, party: "Rahim" }, "LOAN_OUT")).toBe("Rahim");
    expect(partyOf(row, "ADJUSTMENT")).toBe("Real balance");
    expect(partyOf({ ...row, category: null, counterAccounts: [] }, "OTHER")).toBeNull();
  });

  it("opens each kind where it was made", () => {
    expect(entrySource(row, "EXPENSE")).toEqual({ href: "/transactions/tx", label: "Open in Income & Expense" });
    expect(entrySource({ ...row, chargeForId: "tr" }, "EXPENSE")?.href).toBe("/balance/transfer");
    expect(entrySource({ ...row, contactId: "c 1" }, "LOAN_IN")).toEqual({ href: "/loan-management/transactions?contactId=c%201&period=year&year=2025", label: "Open in Loan transactions" });
    expect(entrySource(row, "LOAN_IN")).toBeNull();
    expect(entrySource(row, "ADJUSTMENT")).toBeNull();
    expect(entrySource(row, "ASSET_SALE")?.href).toBe("/assets-management/purchase-sell");
  });

  it("has every kind's words in Bangla", () => {
    for (const meta of Object.values(LEDGER_KIND_META)) for (const key of [meta.label, meta.kickerIn, meta.kickerOut]) expect(translate("bn", key), key).not.toBe(key.split("@@")[0]);
    for (const label of Object.values(SORT_LABEL)) expect(translate("bn", label), label).not.toBe(label);
  });
});

describe("the CSV", () => {
  it("quotes what needs it and starts with a byte-order mark", () => {
    const csv = ledgerCsv({
      account: "Islami Bank",
      period: "This month (1 Nov – 2 Nov 2026)",
      opening: "100.00",
      closing: "50.00",
      heads: { account: "Account", period: "Period", opening: "Opening balance", closing: "Closing balance", columns: ["Date", "Note"] },
      rows: [{ date: "2026-11-01", kind: "Expense", direction: "Sent", party: "Food, drinks", note: 'He said "hi"', reference: "", in: "", out: "50.00", balance: "50.00" }],
    });
    expect(csv.startsWith("﻿Account,Islami Bank\r\n")).toBe(true);
    expect(csv).toContain('2026-11-01,Expense,Sent,"Food, drinks","He said ""hi""",,,50.00,50.00');
    expect(csv.endsWith("Closing balance,50.00")).toBe(true);
  });

  it("keeps typed text that looks like a formula as text, and the amounts' minus sign", () => {
    const csv = ledgerCsv({
      account: "=HYPERLINK(1)",
      period: "p",
      opening: "-100.00",
      closing: "-50.00",
      heads: { account: "Account", period: "Period", opening: "Opening balance", closing: "Closing balance", columns: ["Date"] },
      rows: [{ date: "2026-11-01", kind: "Expense", direction: "Sent", party: "@SUM(A1)", note: "+cmd", reference: "-ref", in: "", out: "50.00", balance: "-50.00" }],
    });
    expect(csv).toContain("Account,'=HYPERLINK(1)");
    expect(csv).toContain("2026-11-01,Expense,Sent,'@SUM(A1),'+cmd,'-ref,,50.00,-50.00");
    expect(csv).toContain("Opening balance,-100.00");
  });

  it("names the file after the account", () => {
    expect(ledgerFileName("Islami Bank!", "2026-11-02")).toBe("ledger-islami-bank-2026-11-02.csv");
    expect(ledgerFileName("নগদ", "2026-11-02")).toBe("ledger-account-2026-11-02.csv");
  });
});

describe("transfers", () => {
  it("works a charge out in taka or as a percent", () => {
    expect(chargeOf(5000, "10", "tk")).toBe(10);
    expect(chargeOf(2000, "1.85", "pct")).toBe(37);
    expect(chargeOf(1234, "1.5", "pct")).toBe(18.51);
    expect(chargeOf(5000, "", "pct")).toBe(0);
  });

  it("turns a run of months into days, in order", () => {
    expect(monthRangeDays("2026-09")).toEqual({ dateFrom: "2026-09-01", dateTo: "2026-09-30" });
    expect(monthRangeDays("2026-09", "2026-11")).toEqual({ dateFrom: "2026-09-01", dateTo: "2026-11-30" });
    expect(monthRangeDays("2026-02", "2025-11")).toEqual({ dateFrom: "2025-11-01", dateTo: "2026-02-28" });
  });
});
