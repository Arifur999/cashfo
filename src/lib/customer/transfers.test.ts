import { describe, expect, it } from "vitest";
import type { Transaction, TransactionEntry } from "./api";
import { transferAmount, transferParties, transferTotals } from "./transfers";

const entry = (entryType: TransactionEntry["entryType"], accountId: string, name: string, amount = "500"): TransactionEntry => ({
  id: `${accountId}-${entryType}`,
  transactionId: "t",
  accountId,
  entryType,
  amount,
  categoryId: null,
  note: null,
  account: { id: accountId, name, accountType: "ASSET", accountSubtype: "bank" },
});

const transfer = (amount: string, status: Transaction["status"] = "POSTED", reversalOfId: string | null = null) => ({
  status,
  reversalOfId,
  entries: [entry("CREDIT", "a", "UCB Bank", amount), entry("DEBIT", "b", "Cash", amount)],
});

describe("transferParties", () => {
  it("reads the credit side as From and the debit side as To", () => {
    expect(transferParties(transfer("2000"))).toEqual({ fromId: "a", from: "UCB Bank", toId: "b", to: "Cash" });
  });

  it("shows dashes when an entry is missing", () => {
    expect(transferParties({ entries: [] })).toEqual({ fromId: null, from: "—", toId: null, to: "—" });
  });
});

describe("transferAmount", () => {
  it("is the entries' amount", () => {
    expect(transferAmount(transfer("1500.50"))).toBe(1500.5);
    expect(transferAmount({ entries: [] })).toBe(0);
  });
});

describe("transferTotals", () => {
  it("counts standing transfers only", () => {
    const totals = transferTotals([transfer("5000"), transfer("2000"), transfer("1500", "VOIDED"), transfer("1500", "POSTED", "orig")]);
    expect(totals).toEqual({ moved: 7000, count: 2, voided: 1 });
  });

  it("is zero for nothing", () => {
    expect(transferTotals([])).toEqual({ moved: 0, count: 0, voided: 0 });
  });
});
