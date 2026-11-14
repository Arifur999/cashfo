import { describe, expect, it } from "vitest";
import {
  addMonths,
  capitalAfter,
  closeSplit,
  entryRows,
  figuresOf,
  groupTyped,
  guessKind,
  listInvestments,
  monthStrip,
  parseTyped,
  perPayout,
  profitByMonth,
  schedule,
  totalsOf,
  watchList,
} from "./investmentDisplay";
import type { Investment, InvestmentEntry, InvestmentEntryType } from "./investmentTypes";

let seq = 0;
const entry = (type: InvestmentEntryType, date: string, amount: number, accountId: string | null = "bank"): InvestmentEntry => ({
  id: `e${++seq}`,
  investmentId: "i",
  type,
  date: `${date}T00:00:00.000Z`,
  amount: amount.toFixed(2),
  accountId,
  transactionId: accountId ? `t${seq}` : null,
  note: null,
  fromClose: false,
  createdAt: `2026-01-01T00:00:${String(seq % 60).padStart(2, "0")}.000Z`,
});

const investment = (patch: Partial<Investment> & { entries: InvestmentEntry[] }): Investment => ({
  id: "i",
  name: "Karim Garments partnership",
  kind: "BUSINESS",
  startDate: "2025-07-01T00:00:00.000Z",
  frequency: "MONTHLY",
  payoutMode: "RATE",
  fixedAmount: null,
  ratePercent: "18",
  firstDueDate: "2025-08-05T00:00:00.000Z",
  maturityDate: null,
  profitAccountId: "bank",
  note: null,
  closedAt: null,
  createdAt: "2025-07-01T00:00:00.000Z",
  put: "0",
  back: "0",
  loss: "0",
  profit: "0",
  capital: "0",
  ...patch,
});

const TODAY = "2026-11-14";
// The board's Karim Garments: 10,00,000 at 18% a year, paid on the 5th, 15 profits since August 2025.
const karim = investment({
  entries: [entry("INVEST", "2025-07-01", 1_000_000), ...Array.from({ length: 15 }, (_, i) => entry("PROFIT", addMonths("2025-08-05", i), 15_000))],
});

describe("addMonths", () => {
  it("keeps the day, falling back to a shorter month's last day", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2025-08-05", 15)).toBe("2026-11-05");
    expect(addMonths("2026-11-01", -11)).toBe("2025-12-01");
  });
});

describe("figuresOf", () => {
  it("works out capital, the payout due, what is late and the return a year", () => {
    const f = figuresOf(karim, TODAY);
    expect([f.put, f.capital, f.profit, f.per, f.yearly]).toEqual([1_000_000, 1_000_000, 225_000, 15_000, 180_000]);
    // Aug 2025 .. Nov 2026: 16 were due, 15 came.
    expect([f.due, f.got, f.late, f.next, f.status]).toEqual([16, 15, 1, "2026-11-05", "late"]);
    expect(f.ret).toBe(16.4);
  });

  it("is due soon within a week, on track further out, open with no plan, matured and closed", () => {
    const fdr = investment({ payoutMode: "FIXED", fixedAmount: "2250", ratePercent: null, firstDueDate: "2026-02-15T00:00:00.000Z", maturityDate: "2027-01-15T00:00:00.000Z", entries: [entry("INVEST", "2026-01-15", 300_000), ...Array.from({ length: 9 }, (_, i) => entry("PROFIT", addMonths("2026-02-15", i), 2250))] });
    expect(figuresOf(fdr, TODAY)).toMatchObject({ next: "2026-11-15", status: "soon", per: 2250 });
    expect(figuresOf(fdr, "2026-11-01").status).toBe("ok");
    expect(figuresOf(fdr, "2027-02-01").status).toBe("matured");
    expect(figuresOf(investment({ frequency: "IRREGULAR", payoutMode: "NONE", firstDueDate: null, entries: [entry("INVEST", "2026-03-01", 200_000)] }), TODAY).status).toBe("open");
    const closed = figuresOf(investment({ closedAt: "2026-01-10T00:00:00.000Z", entries: [entry("INVEST", "2025-07-01", 100), entry("BACK", "2026-01-10", 100)] }), TODAY);
    expect(closed).toMatchObject({ status: "closed", late: 0, next: "", capital: 0 });
  });
});

describe("dashboard", () => {
  it("counts this month's expected, received and to come, and the late ones", () => {
    const strip = monthStrip([figuresOf(karim, TODAY)], TODAY);
    expect(strip).toMatchObject({ expected: 15_000, received: 0, toCome: 15_000 });
    expect(strip.late).toHaveLength(1);
    expect(strip.next).toBeNull();
  });

  it("weighs the average return by what was put in, and lists what to watch", () => {
    const totals = totalsOf([figuresOf(karim, TODAY)], TODAY);
    expect(totals).toMatchObject({ capital: 1_000_000, activeCount: 1, closedCount: 0, profit: 225_000, profitThisYear: 150_000, yearly: 180_000, latePayouts: 1 });
    expect(watchList([figuresOf(karim, TODAY)], TODAY)).toEqual([expect.objectContaining({ rank: 1, day: "2026-11-05" })]);
  });

  it("gives the last 12 months' profit, this month last", () => {
    const bars = profitByMonth([karim], TODAY);
    expect(bars).toHaveLength(12);
    expect(bars[0]).toEqual({ month: "2025-12", profit: 15_000, current: false });
    expect(bars[11]).toEqual({ month: "2026-11", profit: 0, current: true });
  });
});

describe("lists", () => {
  it("filters by tab and search and sorts", () => {
    const small = investment({ id: "s", name: "Rahman Poultry Farm", organisation: "Gazipur", startDate: "2026-03-01T00:00:00.000Z", entries: [entry("INVEST", "2026-03-01", 200_000)] });
    const all = [figuresOf(karim, TODAY), figuresOf(small, TODAY)];
    const label = () => "Business";
    expect(listInvestments(all, "active", "", "capital", label).map((f) => f.investment.id)).toEqual(["i", "s"]);
    expect(listInvestments(all, "active", "poultry", "capital", label).map((f) => f.investment.id)).toEqual(["s"]);
    expect(listInvestments(all, "active", "gazipur", "capital", label).map((f) => f.investment.id)).toEqual(["s"]);
    expect(listInvestments(all, "closed", "", "capital", label)).toEqual([]);
    expect(listInvestments(all, "all", "", "newest", label).map((f) => f.investment.id)).toEqual(["s", "i"]);
  });

  it("lists entries newest first and carries capital after each", () => {
    const rows = entryRows([karim], "");
    expect(rows[0].entry.date.slice(0, 10)).toBe("2026-10-05");
    const inv = investment({ entries: [entry("INVEST", "2026-01-01", 100), entry("ADD", "2026-02-01", 50), entry("BACK", "2026-03-01", 30), entry("LOSS", "2026-04-01", 20)] });
    expect(capitalAfter(inv.entries)).toEqual([100, 150, 120, 100]);
  });
});

describe("schedule", () => {
  it("shows the last received, the late one with Record, and two to come", () => {
    const rows = schedule(figuresOf(karim, TODAY), TODAY);
    expect(rows.map((r) => r.state)).toEqual(["got", "got", "got", "got", "got", "got", "late", "up", "up", "up"]);
    expect(rows.filter((r) => r.canRecord).map((r) => r.day)).toEqual(["2026-11-05"]);
  });
});

describe("forms", () => {
  it("guesses the kind from the name", () => {
    expect(guessKind("Prime Bank FDR")).toBe("FDR");
    expect(guessKind("Government Sukuk")).toBe("SANCHAYAPATRA");
    expect(guessKind("Shop rent")).toBe("PROPERTY");
    expect(guessKind("Rahman Poultry Farm")).toBe("BUSINESS");
    expect(guessKind("Gift to Ma")).toBe("OTHER");
  });

  it("groups typed digits the Bangladeshi way, in either script", () => {
    expect(groupTyped("300000")).toBe("3,00,000");
    expect(groupTyped("১৫০০০.৫০৯")).toBe("15,000.50");
    expect(parseTyped("3,00,000")).toBe(300_000);
    expect(parseTyped("abc")).toBeNaN();
  });

  it("works out each payout and how a close splits", () => {
    expect(perPayout("MONTHLY", "pct", 18, 1_000_000)).toBe(15_000);
    expect(perPayout("HALF_YEARLY", "tk", 8000, 200_000)).toBe(8000);
    expect(perPayout("IRREGULAR", "tk", 8000, 200_000)).toBe(0);
    expect(closeSplit(150_000, 120_000)).toEqual({ back: 120_000, profit: 0, loss: 30_000 });
    expect(closeSplit(150_000, 182_000)).toEqual({ back: 150_000, profit: 32_000, loss: 0 });
  });
});
