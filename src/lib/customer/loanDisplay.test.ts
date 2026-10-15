import { describe, expect, it } from "vitest";
import type { Transaction, TransactionEntry } from "./api";
import { avatarTone, balanceAfterEntry, loanDirection, loanEntryOf, loanTotals } from "./loanDisplay";

const entry = (entryType: TransactionEntry["entryType"], subtype: string | null, amount: string, name = "Cash"): TransactionEntry => ({
  id: `${name}-${entryType}`,
  transactionId: "t",
  accountId: name,
  entryType,
  amount,
  categoryId: null,
  note: null,
  account: { id: name, name, accountType: subtype ? "ASSET" : "LIABILITY", accountSubtype: subtype },
});

const txn = (transactionType: Transaction["transactionType"], entries: TransactionEntry[], status: Transaction["status"] = "POSTED", reversalOfId: string | null = null) => ({ transactionType, entries, status, reversalOfId });

describe("loanDirection", () => {
  it("reads the sign", () => {
    expect(loanDirection("500")).toBe("PAWNA");
    expect(loanDirection(-1)).toBe("DENA");
    expect(loanDirection("0.00")).toBe("SETTLED");
  });
});

describe("balanceAfterEntry", () => {
  it("raises pawna for a loan given or money paid back, lowers it otherwise", () => {
    expect(balanceAfterEntry(0, "GIVE_LOAN", 500)).toBe(500);
    expect(balanceAfterEntry(500, "RECEIVE_PAYMENT", 200)).toBe(300);
    expect(balanceAfterEntry(0, "TAKE_LOAN", 1000)).toBe(-1000);
    expect(balanceAfterEntry("-1000", "MAKE_PAYMENT", 400)).toBe(-600);
  });
});

describe("loanEntryOf", () => {
  it("names a loan given and taken by the transaction type", () => {
    expect(loanEntryOf(txn("SALE", [entry("CREDIT", "cash", "500"), entry("DEBIT", null, "500", "Receivable")]))).toEqual({ kind: "GIVE_LOAN", amount: 500, wallet: "Cash" });
    expect(loanEntryOf(txn("PURCHASE", [entry("DEBIT", "bank", "900", "Bank"), entry("CREDIT", null, "900", "Payable")]))).toEqual({ kind: "TAKE_LOAN", amount: 900, wallet: "Bank" });
  });

  it("tells a repayment received from one made by the wallet side", () => {
    expect(loanEntryOf(txn("PAYMENT", [entry("DEBIT", "mfs", "100", "bKash"), entry("CREDIT", null, "100", "Receivable")]))?.kind).toBe("RECEIVE_PAYMENT");
    expect(loanEntryOf(txn("PAYMENT", [entry("CREDIT", "cash", "100"), entry("DEBIT", null, "100", "Payable")]))?.kind).toBe("MAKE_PAYMENT");
  });

  it("is null for anything else", () => {
    expect(loanEntryOf(txn("EXPENSE", [entry("CREDIT", "cash", "50")]))).toBeNull();
    expect(loanEntryOf(txn("PAYMENT", [entry("DEBIT", null, "100", "Receivable")]))).toBeNull();
  });
});

describe("loanTotals", () => {
  it("sums money in and out over the standing entries", () => {
    const totals = loanTotals([
      txn("SALE", [entry("CREDIT", "cash", "500")]),
      txn("PURCHASE", [entry("DEBIT", "cash", "2000")]),
      txn("PAYMENT", [entry("DEBIT", "cash", "300")]),
      txn("PAYMENT", [entry("CREDIT", "cash", "700")], "VOIDED"),
      txn("PAYMENT", [entry("DEBIT", "cash", "700")], "POSTED", "orig"),
    ]);
    expect(totals).toEqual({ in: 2300, out: 500, count: 3 });
  });
});

describe("avatarTone", () => {
  it("is stable for a name and a valid class pair", () => {
    expect(avatarTone("Rahim Uddin")).toBe(avatarTone("Rahim Uddin"));
    expect(avatarTone("Selim")).toMatch(/^bg-\S+ text-\S+$/);
  });
});
