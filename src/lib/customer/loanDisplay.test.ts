import { describe, expect, it } from "vitest";
import { inEnglish } from "@/lib/i18n/message";
import type { Transaction, TransactionEntry } from "./api";
import { formatCurrency } from "./currency";
import {
  avatarTone,
  balanceAfterEntry,
  contactMatches,
  foldProfitRuns,
  isCancelledRow,
  lastActivity,
  loanDirection,
  loanEditOf,
  loanEntryOf,
  loanErrorText,
  loanPaymentRow,
  loanTotals,
  monthItems,
  profitCategory,
  repaymentLimit,
  statementEquation,
  statementPageEdges,
  statementProfit,
  statementTotals,
  walletDeltaOf,
  whoPhrase,
  wordInitials,
  type LoanBalanceDetail,
  type StatementEquation,
  type StatementRow,
} from "./loanDisplay";

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

  it("keeps the kind a reversal undid, though its wallet side is flipped", () => {
    // Undoing "Got money back": the money leaves the wallet again.
    expect(loanEntryOf(txn("PAYMENT", [entry("CREDIT", "cash", "100"), entry("DEBIT", null, "100", "Receivable")], "POSTED", "orig"))?.kind).toBe("RECEIVE_PAYMENT");
    expect(loanEntryOf(txn("PAYMENT", [entry("DEBIT", "cash", "100"), entry("CREDIT", null, "100", "Payable")], "POSTED", "orig"))?.kind).toBe("MAKE_PAYMENT");
  });

  it("is null for anything else", () => {
    expect(loanEntryOf(txn("EXPENSE", [entry("CREDIT", "cash", "50")]))).toBeNull();
    expect(loanEntryOf(txn("PAYMENT", [entry("DEBIT", null, "100", "Receivable")]))).toBeNull();
  });
});

describe("loanPaymentRow", () => {
  it("signs a loan by where the money went, and its reversal the other way", () => {
    expect(loanPaymentRow(txn("SALE", [entry("CREDIT", "cash", "500")]))).toMatchObject({ title: "Gave a loan", signedAmount: -500, wallet: "Cash", cancelled: null });
    expect(loanPaymentRow(txn("SALE", [entry("CREDIT", "cash", "500")], "VOIDED"))).toMatchObject({ title: "Gave a loan", signedAmount: -500, cancelled: "Voided" });
    expect(loanPaymentRow(txn("SALE", [entry("DEBIT", "cash", "500")], "POSTED", "orig"))).toMatchObject({ title: "Gave a loan", signedAmount: 500, cancelled: "Reversal" });
  });

  it("names profit paid and received, and a reversed repayment by what it undid", () => {
    expect(loanPaymentRow(txn("EXPENSE", [entry("CREDIT", "cash", "5000"), entry("DEBIT", null, "5000", "Interest")]))).toMatchObject({ title: "Paid profit", signedAmount: -5000 });
    expect(loanPaymentRow(txn("INCOME", [entry("DEBIT", "bank", "800", "Bank"), entry("CREDIT", null, "800", "Interest")]))).toMatchObject({ title: "Received profit", signedAmount: 800, wallet: "Bank" });
    expect(loanPaymentRow(txn("PAYMENT", [entry("CREDIT", "cash", "100"), entry("DEBIT", null, "100", "Receivable")], "POSTED", "orig"))).toMatchObject({ title: "Got money back", signedAmount: -100 });
  });

  it("names the wallet and a profit's account in the reader's language", () => {
    const bangla = (base: TransactionEntry, nameBn: string | null): TransactionEntry => ({ ...base, account: base.account && { ...base.account, nameBn } });
    const loan = txn("SALE", [bangla(entry("CREDIT", "cash", "500"), "নগদ")]);
    expect(loanPaymentRow(loan, "bn").wallet).toBe("নগদ");
    expect(loanPaymentRow(loan).wallet).toBe("Cash");
    // No Bangla name: the English one.
    expect(loanPaymentRow(txn("SALE", [bangla(entry("CREDIT", "cash", "500"), null)]), "bn").wallet).toBe("Cash");
    const profit = txn("EXPENSE", [bangla(entry("CREDIT", "cash", "50"), "নগদ"), bangla(entry("DEBIT", null, "50", "Interest"), "সুদ")]);
    expect(loanPaymentRow(profit, "bn").profit).toMatchObject({ wallet: "নগদ", category: "সুদ" });
  });

  it("has no title or amount for a posting that is neither", () => {
    expect(loanPaymentRow(txn("PAYMENT", [entry("DEBIT", null, "100", "Receivable")]))).toMatchObject({ title: null, signedAmount: 0 });
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

  it("counts in the reader's digits", () => {
    expect(whoPhrase(["BANK", "BANK", "BOTH"], t, "bn")).toBe("১ contact and ২ banks");
  });
});

describe("loan statement", () => {
  const row = (day: string, category: "Principal" | "Profit", paid: string | null = null, status: "POSTED" | "VOIDED" = "POSTED", extra: Partial<StatementRow> = {}): StatementRow => ({
    transactionId: `${category}-${day}-${status}`,
    date: `${day}T00:00:00.000Z`,
    referenceNo: null,
    description: null,
    category,
    debit: null,
    credit: category === "Principal" ? "500000.00" : null,
    profitPaid: paid,
    profitReceived: category === "Profit" && !paid ? "800.00" : null,
    runningPrincipal: "-500000.00",
    status,
    ...extra,
  });
  const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09"].map((month) => row(`2026-${month}-28`, "Profit", "5000.00"));

  it("sums the profit paid and the months it was paid in, cancelled rows left out", () => {
    expect(statementProfit([row("2026-01-01", "Principal"), ...months, row("2026-09-30", "Profit", "5000.00", "VOIDED")])).toEqual({ paid: 45000, received: 0, paidMonths: 9, receivedMonths: 0 });
  });

  it("tells a cancelled row by its flag, or by its status and reversal on an older API", () => {
    expect(isCancelledRow(row("2026-01-01", "Principal", null, "POSTED", { cancelled: true }))).toBe(true);
    expect(isCancelledRow(row("2026-01-01", "Principal", null, "VOIDED"))).toBe(true);
    expect(isCancelledRow(row("2026-01-01", "Principal", null, "POSTED", { reversalOfId: "orig" }))).toBe(true);
    expect(isCancelledRow(row("2026-01-01", "Principal"))).toBe(false);
  });

  it("adds principal in and out over the rows that still stand", () => {
    const given = row("2026-02-01", "Principal", null, "POSTED", { credit: null, debit: "50000.00" });
    const voided = row("2026-02-02", "Principal", null, "VOIDED", { credit: null, debit: "50000.00", cancelled: true });
    const reversal = row("2026-02-03", "Principal", null, "POSTED", { reversalOfId: "x", cancelled: true, credit: "50000.00" });
    expect(statementTotals([row("2026-01-01", "Principal"), given, voided, reversal])).toEqual({ received: 500000, paid: 50000 });
  });

  it("folds the middle of a long run of profit rows", () => {
    const items = foldProfitRuns([row("2026-01-01", "Principal"), ...months]);
    expect(items.map((item) => (item.kind === "row" ? item.row.date.slice(5, 7) : `+${item.rows.length}`))).toEqual(["01", "01", "02", "+5", "08", "09"]);
    expect(foldProfitRuns(months.slice(0, 5)).every((item) => item.kind === "row")).toBe(true);
  });

  it("folds paid and received apart, and never folds a cancelled row", () => {
    const received = ["01", "02", "03", "04", "05", "06"].map((month) => row(`2027-${month}-28`, "Profit"));
    const folded = foldProfitRuns([...months, ...received]).filter((item) => item.kind === "more");
    expect(folded.map((item) => (item.kind === "more" ? [item.rows.length, item.paid] : null))).toEqual([
      [5, true],
      [2, false],
    ]);
    // A voided payment in the middle breaks the run in two short ones.
    const broken = [...months.slice(0, 4), row("2026-05-15", "Profit", "5000.00", "VOIDED"), ...months.slice(4, 8)];
    expect(foldProfitRuns(broken).every((item) => item.kind === "row")).toBe(true);
  });

  it("files profit under a profit, interest or loan category first", () => {
    expect(profitCategory(["Food", "Bank interest", "Rent"])).toBe("Bank interest");
    expect(profitCategory(["Food", "Rent"])).toBe("Food");
    expect(profitCategory([])).toBe("");
  });
});

describe("statementEquation", () => {
  // The card reads opening + raised − lowered = closing.
  const sum = (equation: StatementEquation) => equation.opening + equation.raised - equation.lowered;

  it("reads a plain statement from its closing side", () => {
    // TK5,000 pawna, TK10,000 more lent, TK3,000 got back.
    const lent = statementEquation(5000, 12000, 3000, 10000);
    expect(lent).toEqual({ side: "PAWNA", opening: 5000, raised: 10000, lowered: 3000, closing: 12000 });
    // TK20,000 dena, TK5,000 more taken, TK8,000 paid back.
    const owed = statementEquation(-20000, -17000, 5000, 8000);
    expect(owed).toEqual({ side: "DENA", opening: 20000, raised: 5000, lowered: 8000, closing: 17000 });
    // A first loan taken: the opening of 0 reads as 0 on the dena side.
    expect(statementEquation(0, -5000, 5000, 0)).toEqual({ side: "DENA", opening: 0, raised: 5000, lowered: 0, closing: 5000 });
    expect([lent, owed].map(sum)).toEqual([12000, 17000]);
  });

  it("reads a settled closing from the opening's side", () => {
    // You owed TK50,000 and paid it all back: 50,000 + 0 − 50,000 = 0.
    const paidOff = statementEquation(-50000, 0, 0, 50000);
    expect(paidOff).toEqual({ side: "DENA", opening: 50000, raised: 0, lowered: 50000, closing: 0 });
    // They owed TK20,000 and paid it all back.
    const gotBack = statementEquation(20000, 0, 20000, 0);
    expect(gotBack).toEqual({ side: "PAWNA", opening: 20000, raised: 0, lowered: 20000, closing: 0 });
    expect(statementEquation(0, 0, 0, 0)).toEqual({ side: "SETTLED", opening: 0, raised: 0, lowered: 0, closing: 0 });
    expect([paidOff, gotBack].map(sum)).toEqual([0, 0]);
  });

  it("counts an opening on the other side as a minus", () => {
    // TK10,000 pawna, then a TK30,000 loan taken: −10,000 + 30,000 − 0 = 20,000 dena.
    const flipped = statementEquation(10000, -20000, 30000, 0);
    expect(flipped).toEqual({ side: "DENA", opening: -10000, raised: 30000, lowered: 0, closing: 20000 });
    // TK5,000 dena, then TK12,000 lent: 7,000 pawna.
    const back = statementEquation(-5000, 7000, 0, 12000);
    expect(back).toEqual({ side: "PAWNA", opening: -5000, raised: 12000, lowered: 0, closing: 7000 });
    expect([flipped, back].map(sum)).toEqual([20000, 7000]);
  });
});

describe("statementPageEdges", () => {
  const entry = (n: number, balance: number, extra: Partial<StatementRow> = {}): StatementRow => ({
    transactionId: `t${n}`,
    date: "2026-03-01T00:00:00.000Z",
    referenceNo: null,
    description: null,
    category: "Principal",
    debit: "1000.00",
    credit: null,
    profitPaid: null,
    profitReceived: null,
    runningPrincipal: balance.toFixed(2),
    status: "POSTED",
    ...extra,
  });
  // TK5,000 pawna, then 120 loans of TK1,000 given: row n leaves 5,000 + n × 1,000.
  const rows = Array.from({ length: 120 }, (_, i) => entry(i + 1, 5000 + (i + 1) * 1000));
  const ids = (page: { rows: StatementRow[] }) => page.rows.map((row) => row.transactionId);

  it("opens page 1 on the opening balance and carries its last row's balance on", () => {
    const first = statementPageEdges(rows, 1, 50, 5000);
    expect(first).toMatchObject({ page: 1, totalPages: 3, total: 120, firstPage: true, lastPage: false, broughtForward: 5000, carriedForward: 55000 });
    expect(ids(first)).toEqual(rows.slice(0, 50).map((row) => row.transactionId));
  });

  it("brings page 2 forward from row 50's balance", () => {
    const second = statementPageEdges(rows, 2, 50, 5000);
    expect(second).toMatchObject({ page: 2, firstPage: false, lastPage: false, broughtForward: 55000, carriedForward: 105000 });
    expect(ids(second)[0]).toBe("t51");
  });

  it("closes on the last page, and shows the last page for a page past the end", () => {
    for (const page of [3, 99]) {
      const last = statementPageEdges(rows, page, 50, 5000);
      expect(last).toMatchObject({ page: 3, totalPages: 3, firstPage: false, lastPage: true, broughtForward: 105000, carriedForward: 125000 });
      expect(ids(last)).toHaveLength(20);
    }
  });

  it("opens and closes an empty statement on page 1", () => {
    expect(statementPageEdges([], 1, 50, -2500)).toEqual({ rows: [], page: 1, totalPages: 0, total: 0, firstPage: true, lastPage: true, broughtForward: -2500, carriedForward: -2500 });
    expect(statementPageEdges([], 4, 50, -2500)).toMatchObject({ page: 1, firstPage: true, lastPage: true, broughtForward: -2500, carriedForward: -2500 });
  });

  it("carries the unchanged balance on from a voided last row", () => {
    // Row 50 was voided: the API leaves the balance where row 49 put it, and
    // every later row is TK1,000 lower.
    const voided = rows.map((row, i) => (i === 49 ? entry(50, 54000, { status: "VOIDED", cancelled: true }) : i > 49 ? entry(i + 1, 5000 + i * 1000) : row));
    expect(statementPageEdges(voided, 1, 50, 5000).carriedForward).toBe(54000);
    expect(statementPageEdges(voided, 2, 50, 5000).broughtForward).toBe(54000);
  });

  it("lays the whole statement on one page for paper", () => {
    const paper = statementPageEdges(rows, 2, Infinity, 5000);
    expect(paper).toMatchObject({ page: 1, totalPages: 1, firstPage: true, lastPage: true, broughtForward: 5000, carriedForward: 125000 });
    expect(paper.rows).toHaveLength(120);
  });
});

describe("repaymentLimit", () => {
  const side = (remaining: string, openingRemaining?: string) => ({ totalInvoiced: "0.00", totalPaid: "0.00", remaining, transactions: [], ...(openingRemaining === undefined ? {} : { openingRemaining }) });
  const detail = (receivable: ReturnType<typeof side>, payable: ReturnType<typeof side>): LoanBalanceDetail => ({ contactId: "c", openingBalance: "0.00", currentBalance: "0.00", receivable, payable });

  it("caps money back at what they owe, and a payment at what you owe, opening balance included", () => {
    const both = detail(side("10000.00", "2500.00"), side("5000.00", "0.00"));
    expect(repaymentLimit(both, "RECEIVE_PAYMENT")).toBe(12500);
    expect(repaymentLimit(both, "MAKE_PAYMENT")).toBe(5000);
    expect(repaymentLimit(both, "GIVE_LOAN")).toBeNull();
  });

  it("is never below zero, and unknown without the detail or an older API's opening figure", () => {
    expect(repaymentLimit(detail(side("-300.00", "0.00"), side("0.00", "0.00")), "RECEIVE_PAYMENT")).toBe(0);
    expect(repaymentLimit(detail(side("100.00"), side("0.00")), "RECEIVE_PAYMENT")).toBeNull();
    expect(repaymentLimit(null, "MAKE_PAYMENT")).toBeNull();
  });
});

describe("contactMatches", () => {
  it("finds a contact by name, or by phone whatever its dashes or digits", () => {
    expect(contactMatches("Rahim Uddin", "01711-223344", "rahim")).toBe(true);
    expect(contactMatches("Rahim Uddin", "01711-223344", "0171122")).toBe(true);
    expect(contactMatches("Rahim Uddin", "01711-223344", "01711 22")).toBe(true);
    expect(contactMatches("Rahim Uddin", "01711-223344", "০১৭১১")).toBe(true);
    expect(contactMatches("Rahim Uddin", "01711-223344", "")).toBe(true);
  });

  it("doesn't match a word against the phone, or a dash alone against anyone", () => {
    expect(contactMatches("Rahim Uddin", "01711-223344", "karim")).toBe(false);
    expect(contactMatches("Rahim Uddin", null, "0171")).toBe(false);
    expect(contactMatches("Rahim Uddin", "01711-223344", "-")).toBe(false);
  });
});

describe("loanErrorText", () => {
  const money = (amount: number) => formatCurrency(amount, "BDT");
  it("rewords the API's raw figures as money", () => {
    expect(loanErrorText("Payment amount (10000.00) exceeds the total outstanding balance (5000.00)", "x", inEnglish, money)).toBe("That's more than is owed. It can be TK 5,000 at most.");
    expect(loanErrorText("This contact still has an outstanding balance of 50000.00. Settle it before archiving.", "x", inEnglish, money)).toBe("This contact still has a balance of TK 50,000. Settle it before archiving.");
  });

  it("says an action's trade fallback the loan way, and keeps any other message", () => {
    expect(loanErrorText("Failed to record credit sale", "x", inEnglish, money)).toBe("Couldn't save the loan");
    expect(loanErrorText("Failed to record payment", "x", inEnglish, money)).toBe("Couldn't save the payment");
    expect(loanErrorText("Something else", "x", inEnglish, money)).toBe("Something else");
    expect(loanErrorText(undefined, "Couldn't save the loan", inEnglish, money)).toBe("Couldn't save the loan");
  });
});

describe("loanEditOf", () => {
  const base = { id: "t1", contactId: "bank", transactionDate: "2026-03-10T00:00:00.000Z", referenceNo: "BL-2231", charge: "500.00" };

  it("reads a principal entry back for Edit, with its wallet and charge", () => {
    const took = { ...base, ...txn("PURCHASE", [entry("DEBIT", "bank", "100000", "Islami bank"), entry("CREDIT", null, "100000", "Payable")]) };
    expect(loanEditOf(took)).toEqual({ transactionId: "t1", contactId: "bank", kind: "TAKE_LOAN", profit: null, accountId: "Islami bank", date: "2026-03-10", amount: 100000, reference: "BL-2231", charge: 500 });
  });

  it("reads profit paid with its category", () => {
    const paid = { ...base, charge: null, ...txn("EXPENSE", [entry("CREDIT", "cash", "5000"), { ...entry("DEBIT", null, "5000", "Interest"), categoryId: "Loan profit" }]) };
    expect(loanEditOf(paid)).toMatchObject({ kind: null, profit: { paid: true, category: "Loan profit" }, amount: 5000, charge: 0 });
  });

  it("is null without a contact or a wallet", () => {
    expect(loanEditOf({ ...base, contactId: null, ...txn("SALE", [entry("CREDIT", "cash", "500")]) })).toBeNull();
    expect(loanEditOf({ ...base, ...txn("SALE", [entry("DEBIT", null, "500", "Receivable")]) })).toBeNull();
  });
});

describe("walletDeltaOf", () => {
  it("moves the wallet by the amount, less the charge", () => {
    expect(walletDeltaOf({ kind: "TAKE_LOAN", profit: null, amount: 100000, charge: 500 })).toBe(99500);
    expect(walletDeltaOf({ kind: "GIVE_LOAN", profit: null, amount: 20000, charge: 0 })).toBe(-20000);
    expect(walletDeltaOf({ kind: null, profit: { paid: true, category: null }, amount: 5000, charge: 50 })).toBe(-5050);
  });
});

describe("wordInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect([wordInitials("Karim Traders"), wordInitials("Hasan"), wordInitials("  rahim uddin  khan "), wordInitials("")]).toEqual(["KT", "H", "RU", "?"]);
  });
});

describe("lastActivity", () => {
  const row = (lastEntry: { kind: "GAVE" | "GOT_BACK" | "PAID_BACK" | "PROFIT_PAID"; date: string } | null, currentBalance = "45000.00", openingBalance = "0.00") => ({ lastEntry, currentBalance, openingBalance });
  it("names the newest entry with its day", () => {
    expect(lastActivity(row({ kind: "GOT_BACK", date: "2026-09-16" }))).toEqual({ key: "Got money back {date}", date: "2026-09-16" });
    expect(lastActivity(row({ kind: "PROFIT_PAID", date: "2026-09-30" }, "-500000.00")).key).toBe("Profit paid {date}");
  });
  it("says paid back in full when money back settled them", () => {
    expect(lastActivity(row({ kind: "GOT_BACK", date: "2026-07-02" }, "0.00")).key).toBe("Paid back in full {date}");
    expect(lastActivity(row({ kind: "GAVE", date: "2026-07-02" }, "0.00")).key).toBe("Gave loan {date}");
  });
  it("falls back to the opening balance, or no entries", () => {
    expect(lastActivity(row(null, "70000.00", "70000.00"))).toEqual({ key: "Opening balance", date: null });
    expect(lastActivity(row(null, "0.00"))).toEqual({ key: "No entries yet", date: null });
    expect(lastActivity(undefined).key).toBe("No entries yet");
  });
});

describe("monthItems", () => {
  it("lists the five always, and profit received only when there was some", () => {
    const month = { lent: "0.00", borrowed: "100000.00", gotBack: "0.00", paidBack: "0.00", profitPaid: "5000.00", profitReceived: "0.00", entries: 2 };
    expect(monthItems(month).map((item) => [item.label, item.amount])).toEqual([["Lent", 0], ["Borrowed", 100000], ["Got back", 0], ["Paid back@@month", 0], ["Profit paid@@month", 5000]]);
    expect(monthItems({ ...month, profitReceived: "250.00" })).toHaveLength(6);
    expect(monthItems(undefined)).toHaveLength(5);
  });
});
