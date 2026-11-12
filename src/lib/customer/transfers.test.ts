import { describe, expect, it } from "vitest";
import type { Transaction, TransactionEntry, TransactionsSummary } from "./api";
import { isSavingsTransfer, summaryTransferTotals, transferAmount, transferPair, transferParties, transferTotals } from "./transfers";

const entry = (entryType: TransactionEntry["entryType"], accountId: string, name: string, amount = "500", accountSubtype = "bank"): TransactionEntry => ({
  id: `${accountId}-${entryType}`,
  transactionId: "t",
  accountId,
  entryType,
  amount,
  categoryId: null,
  note: null,
  account: { id: accountId, name, accountType: "ASSET", accountSubtype },
});

const transfer = (amount: string, status: Transaction["status"] = "POSTED", reversalOfId: string | null = null) => ({
  status,
  reversalOfId,
  entries: [entry("CREDIT", "a", "UCB Bank", amount), entry("DEBIT", "b", "Cash", amount)],
});

// A savings goal's Add funds: from a wallet into a savings wallet.
const deposit = (amount: string) => ({
  status: "POSTED" as const,
  reversalOfId: null,
  entries: [entry("CREDIT", "a", "UCB Bank", amount), entry("DEBIT", "s", "Islami Bank DPS", amount, "savings")],
});

describe("transferParties", () => {
  it("reads the credit side as From and the debit side as To", () => {
    expect(transferParties(transfer("2000"))).toEqual({ fromId: "a", from: "UCB Bank", toId: "b", to: "Cash", fromSavings: false, toSavings: false });
  });

  it("marks the savings wallet a deposit lands in", () => {
    expect(transferParties(deposit("1000"))).toMatchObject({ to: "Islami Bank DPS", fromSavings: false, toSavings: true });
  });

  it("names the wallets in the reader's language, English where there is no Bangla name", () => {
    const named = { entries: [{ ...entry("CREDIT", "a", "Cash"), account: { id: "a", name: "Cash", nameBn: "নগদ", accountType: "ASSET" as const, accountSubtype: "cash" } }, entry("DEBIT", "b", "UCB Bank")] };
    expect(transferParties(named, "bn")).toMatchObject({ from: "নগদ", to: "UCB Bank" });
    expect(transferParties(named, "en")).toMatchObject({ from: "Cash", to: "UCB Bank" });
    expect(transferParties(named)).toMatchObject({ from: "Cash" });
  });

  it("shows dashes when an entry is missing", () => {
    expect(transferParties({ entries: [] })).toEqual({ fromId: null, from: "—", toId: null, to: "—", fromSavings: false, toSavings: false });
  });
});

describe("transferAmount", () => {
  it("is the entries' amount", () => {
    expect(transferAmount(transfer("1500.50"))).toBe(1500.5);
    expect(transferAmount({ entries: [] })).toBe(0);
  });
});

describe("isSavingsTransfer", () => {
  it("is true only when a savings wallet takes part", () => {
    expect(isSavingsTransfer(deposit("1000"))).toBe(true);
    expect(isSavingsTransfer(transfer("1000"))).toBe(false);
  });
});

describe("transferTotals", () => {
  it("counts and totals only the wallet transfers that still stand", () => {
    // A voided transfer and the reversal that undid it: neither counts.
    const totals = transferTotals([transfer("5000"), transfer("2000"), transfer("1500", "VOIDED"), transfer("1500", "POSTED", "orig")]);
    expect(totals).toEqual({ moved: 7000, standing: 2, voided: 1, savings: 0 });
  });

  it("keeps savings deposits apart", () => {
    const totals = transferTotals([transfer("5000"), deposit("3000"), deposit("250.50")]);
    expect(totals).toEqual({ moved: 5000, standing: 1, voided: 0, savings: 3250.5 });
  });

  it("adds to the paisa", () => {
    expect(transferTotals([transfer("0.10"), transfer("0.20")]).moved).toBe(0.3);
  });

  it("is zero for nothing", () => {
    expect(transferTotals([])).toEqual({ moved: 0, standing: 0, voided: 0, savings: 0 });
  });
});

const summary = (count: number, voided: number, transfer: string, standing?: number): TransactionsSummary => ({ count, voided, ...(standing !== undefined && { standing }), totals: { INCOME: "0.00", EXPENSE: "0.00", TRANSFER: transfer } });

describe("summaryTransferTotals", () => {
  it("reads the wallet-to-wallet summary, and what savings goals moved from the difference", () => {
    // 12 transfers in all, 3 of them a goal's; of the 9 between wallets, 1 voided with its reversal.
    expect(summaryTransferTotals(summary(12, 1, "45000.00", 10), summary(9, 1, "39999.50", 7))).toEqual({ moved: 39999.5, standing: 7, voided: 1, savings: 5000.5 });
  });

  it("has no savings when no goal moved anything", () => {
    expect(summaryTransferTotals(summary(3, 0, "900.00", 3), summary(3, 0, "900.00", 3))).toEqual({ moved: 900, standing: 3, voided: 0, savings: 0 });
  });

  it("never puts savings below zero", () => {
    expect(summaryTransferTotals(summary(1, 0, "100.00", 1), summary(2, 0, "300.00", 2))).toEqual({ moved: 300, standing: 2, voided: 0, savings: 0 });
  });

  it("is null when the summary doesn't count the standing ones", () => {
    expect(summaryTransferTotals(summary(3, 0, "900.00"), summary(3, 0, "900.00"))).toBeNull();
  });
});

describe("transferPair", () => {
  it("keeps the last choice while it is still offered", () => {
    expect(transferPair(["a", "b", "c"], { fromId: "c", toId: "a" })).toEqual({ fromId: "c", toId: "a" });
  });

  it("picks nothing for the reader", () => {
    expect(transferPair(["a", "b", "c"], { fromId: "", toId: "" })).toEqual({ fromId: "", toId: "" });
    expect(transferPair(["a", "b", "c"], { fromId: "b", toId: "" })).toEqual({ fromId: "b", toId: "" });
  });

  it("empties a side whose wallet was archived since", () => {
    expect(transferPair(["a", "b"], { fromId: "gone", toId: "b" })).toEqual({ fromId: "", toId: "b" });
    expect(transferPair(["a", "b"], { fromId: "b", toId: "gone" })).toEqual({ fromId: "b", toId: "" });
  });

  it("never puts one wallet on both sides", () => {
    expect(transferPair(["a", "b"], { fromId: "a", toId: "a" })).toEqual({ fromId: "a", toId: "" });
    expect(transferPair([], { fromId: "a", toId: "b" })).toEqual({ fromId: "", toId: "" });
  });
});
