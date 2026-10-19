import { describe, expect, it } from "vitest";
import type { Transaction, TransactionEntry } from "./api";
import type { LoanStatementRow } from "./api";
import { avatarTone, balanceAfterEntry, foldProfitRuns, loanDirection, loanEntryOf, loanTotals, profitCategory, statementProfit, whoPhrase } from "./loanDisplay";

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
      // Profit paid and received: summed apart, the loans untouched.
      txn("EXPENSE", [entry("CREDIT", "cash", "5000")]),
      txn("INCOME", [entry("DEBIT", "cash", "800")]),
    ]);
    expect(totals).toEqual({ in: 2300, out: 500, profitPaid: 5000, profitReceived: 800, count: 5 });
  });
});

describe("avatarTone", () => {
  it("is stable for a name and a valid class pair", () => {
    expect(avatarTone("Rahim Uddin")).toBe(avatarTone("Rahim Uddin"));
    expect(avatarTone("Selim")).toMatch(/^bg-\S+ text-\S+$/);
  });
});

describe("whoPhrase", () => {
  const t = (key: string, values?: Record<string, string | number>) => key.replace("{count}", String(values?.count ?? ""));
  it("names banks and NGOs beside the other contacts", () => {
    expect(whoPhrase(["BOTH", "RELATIVE", undefined], t)).toBe("3 contacts");
    expect(whoPhrase(["BANK", "NGO"], t)).toBe("1 bank and 1 NGO");
    expect(whoPhrase(["BOTH", "BANK", "BANK", "NGO"], t)).toBe("1 contact, 2 banks and 1 NGO");
    expect(whoPhrase([], t)).toBe("0 contacts");
  });
});

describe("loan profit", () => {
  const row = (day: string, category: "Principal" | "Profit", paid: string | null = null, status: "POSTED" | "VOIDED" = "POSTED"): LoanStatementRow => ({ transactionId: `${category}-${day}`, date: `${day}T00:00:00.000Z`, referenceNo: null, description: null, category, debit: null, credit: category === "Principal" ? "500000.00" : null, profitPaid: paid, profitReceived: null, runningPrincipal: "-500000.00", status });
  const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09"].map((month) => row(`2026-${month}-28`, "Profit", "5000.00"));

  it("sums the profit paid and the months it was paid in, voided entries left out", () => {
    expect(statementProfit([row("2026-01-01", "Principal"), ...months, row("2026-09-30", "Profit", "5000.00", "VOIDED")])).toEqual({ paid: 45000, received: 0, paidMonths: 9, receivedMonths: 0 });
  });

  it("folds the middle of a long run of profit rows", () => {
    const items = foldProfitRuns([row("2026-01-01", "Principal"), ...months]);
    expect(items.map((item) => (item.kind === "row" ? item.row.date.slice(5, 7) : `+${item.rows.length}`))).toEqual(["01", "01", "02", "+5", "08", "09"]);
    expect(foldProfitRuns(months.slice(0, 5)).every((item) => item.kind === "row")).toBe(true);
  });

  it("files profit under a profit, interest or loan category first", () => {
    expect(profitCategory(["Food", "Bank interest", "Rent"])).toBe("Bank interest");
    expect(profitCategory(["Food", "Rent"])).toBe("Food");
    expect(profitCategory([])).toBe("");
  });
});
