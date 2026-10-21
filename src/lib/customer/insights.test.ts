import { describe, expect, it } from "vitest";
import type { CategoryBreakdown, MonthlyBreakdown } from "./api";
import {
  biggestDrop,
  biggestPart,
  categoryMoves,
  categoryTotals,
  completeMonths,
  concentrationNote,
  insightPeriodFrom,
  monthlyAverage,
  monthName,
  monthRates,
  monthsElapsed,
  monthSpan,
  monthUnderWay,
  movement,
  netWorth,
  percentChange,
  periodLabels,
  periodTotals,
  previousRange,
  rangeLabel,
  rankedRows,
  rateTrend,
} from "./insights";

const breakdown = (type: "INCOME" | "EXPENSE", rows: [string, number][]): CategoryBreakdown => ({
  type,
  total: rows.reduce((sum, [, amount]) => sum + amount, 0).toFixed(2),
  categories: rows.map(([name, amount]) => ({ name, amount: amount.toFixed(2), percent: 0, color: "green" })),
});

const monthly = (type: "INCOME" | "EXPENSE", months: string[], totals: number[]): MonthlyBreakdown => ({
  type,
  months,
  rows: [],
  totals: totals.map((t) => t.toFixed(2)),
  total: totals.reduce((a, b) => a + b, 0).toFixed(2),
});

describe("previousRange", () => {
  it("compares the same stretch of days one step back", () => {
    expect(previousRange({ dateFrom: "2026-10-01", dateTo: "2026-10-21" }, "this-month")).toEqual({ dateFrom: "2026-09-01", dateTo: "2026-09-21" });
    expect(previousRange({ dateFrom: "2026-08-01", dateTo: "2026-10-21" }, "last-3-months")).toEqual({ dateFrom: "2026-05-01", dateTo: "2026-07-21" });
    expect(previousRange({ dateFrom: "2026-01-01", dateTo: "2026-02-10" }, "last-3-months")).toEqual({ dateFrom: "2025-11-01", dateTo: "2025-12-10" });
  });

  it("keeps whole months whole and clamps to a shorter month", () => {
    expect(previousRange({ dateFrom: "2026-09-01", dateTo: "2026-09-30" }, "last-month")).toEqual({ dateFrom: "2026-08-01", dateTo: "2026-08-31" });
    expect(previousRange({ dateFrom: "2026-03-01", dateTo: "2026-03-30" }, "this-month")).toEqual({ dateFrom: "2026-02-01", dateTo: "2026-02-28" });
    expect(previousRange({ dateFrom: "2026-10-01", dateTo: "2026-10-31" }, "this-month")).toEqual({ dateFrom: "2026-09-01", dateTo: "2026-09-30" });
  });

  it("compares this year with the same days of last year", () => {
    expect(previousRange({ dateFrom: "2026-01-01", dateTo: "2026-10-21" }, "this-year")).toEqual({ dateFrom: "2025-01-01", dateTo: "2025-10-21" });
    expect(previousRange({ dateFrom: "2028-01-01", dateTo: "2028-02-29" }, "this-year")).toEqual({ dateFrom: "2027-01-01", dateTo: "2027-02-28" });
    expect(monthSpan({ dateFrom: "2026-01-01", dateTo: "2026-10-21" })).toBe(10);
  });
});

describe("monthsElapsed", () => {
  it("counts the month under way by its share of days", () => {
    expect(monthsElapsed({ dateFrom: "2026-09-01", dateTo: "2026-09-30" })).toBe(1);
    expect(monthsElapsed({ dateFrom: "2026-01-01", dateTo: "2026-10-21" })).toBeCloseTo(9 + 21 / 31, 5);
    expect(monthsElapsed({ dateFrom: "2026-08-01", dateTo: "2026-10-21" })).toBeCloseTo(2 + 21 / 31, 5);
    expect(monthsElapsed({ dateFrom: "2025-11-01", dateTo: "2026-01-15" })).toBeCloseTo(2 + 15 / 31, 5);
  });
});

describe("monthlyAverage", () => {
  // This year in January is under a month: 3 days are 3/31 of one, and a
  // ৳ 15,000 rent divided by that came to ৳ 1,55,000 a month.
  it("has nothing to average over a month or less", () => {
    expect(monthlyAverage(15000, monthsElapsed({ dateFrom: "2027-01-01", dateTo: "2027-01-01" }))).toBeNull();
    expect(monthlyAverage(15000, monthsElapsed({ dateFrom: "2027-01-01", dateTo: "2027-01-03" }))).toBeNull();
    expect(monthlyAverage(15000, monthsElapsed({ dateFrom: "2027-01-01", dateTo: "2027-01-31" }))).toBeNull();
  });

  it("divides by the months so far, in whole taka", () => {
    // 1 January to 3 February is 1 + 3/28 months.
    expect(monthlyAverage(15000, monthsElapsed({ dateFrom: "2027-01-01", dateTo: "2027-02-03" }))).toBe(13548);
    // 4,456.33 a month, written without the paisa.
    expect(monthlyAverage(43125.75, monthsElapsed({ dateFrom: "2026-01-01", dateTo: "2026-10-21" }))).toBe(4456);
  });
});

describe("totals and changes", () => {
  it("knows what was left and the share kept", () => {
    expect(periodTotals(breakdown("INCOME", [["Salary", 85000]]), breakdown("EXPENSE", [["Food", 52300]]))).toEqual({ income: 85000, expense: 52300, left: 32700, rate: 38 });
    expect(periodTotals(breakdown("INCOME", []), breakdown("EXPENSE", [["Food", 100]])).rate).toBeNull();
  });

  it("measures a change against what came before", () => {
    expect(percentChange(85000, 80000)).toBe(6.3);
    expect(percentChange(52300, 54500)).toBe(-4);
    expect(percentChange(100, 0)).toBeNull();
  });

  it("words a move as a percent, an amount, new or the same", () => {
    expect(movement(85000, 80000)).toEqual({ kind: "percent", percent: 6.3, change: 5000 });
    expect(movement(100, 0)).toEqual({ kind: "new", change: 100 });
    expect(movement(0, 0)).toEqual({ kind: "same" });
    // Left over after an overspent period: the amount, not "new".
    expect(movement(2000, -5000, { hadBefore: true })).toEqual({ kind: "amount", change: 7000 });
    expect(movement(2000, 0, { hadBefore: false })).toEqual({ kind: "new", change: 2000 });
  });
});

describe("categoryTotals", () => {
  it("reads every category of a monthly breakdown, not just ten", () => {
    const rows = Array.from({ length: 14 }, (_, i) => ({ name: `Cat ${i + 1}`, color: "green", amounts: ["10.00", "5.00"], total: "15.00" }));
    const reading = categoryTotals({ type: "EXPENSE", months: ["2026-09", "2026-10"], rows, totals: ["140.00", "70.00"], total: "210.00" });
    expect(reading.categories).toHaveLength(14);
    expect(reading.total).toBe("210.00");
    // The rows add up to the total, so the split bar ends where it should.
    expect(reading.categories.reduce((sum, row) => sum + Number(row.amount), 0)).toBe(210);
    expect(rankedRows(reading).at(-1)?.share).toBe(7.1);
  });
});

describe("rankedRows and concentrationNote", () => {
  const income = breakdown("INCOME", [["Freelance", 104000], ["Salary", 660000], ["Shop rent", 36000], ["Gifts", 24000]]);

  it("ranks biggest first with shares and bar widths", () => {
    const rows = rankedRows(income);
    expect(rows.map((r) => [r.rank, r.name, r.share, r.width])).toEqual([
      [1, "Salary", 80.1, 100],
      [2, "Freelance", 12.6, 15.8],
      [3, "Shop rent", 4.4, 5.5],
      [4, "Gifts", 2.9, 3.6],
    ]);
  });

  it("warns when one source is over 60%, naming how the runner-up moved", () => {
    const before = breakdown("INCOME", [["Salary", 600000], ["Freelance", 80000]]);
    expect(concentrationNote(income, before)).toEqual({ name: "Salary", percent: 80, second: { name: "Freelance", before: 80000, now: 104000 } });
    expect(concentrationNote(breakdown("INCOME", [["Salary", 50], ["Shop", 50]]), before)).toBeNull();
    expect(concentrationNote(breakdown("INCOME", [["Salary", 50]]), before)?.second).toBeNull();
  });
});

describe("categoryMoves and biggestDrop", () => {
  const now = breakdown("EXPENSE", [["Transport", 7200], ["Shopping", 4400], ["Food", 16800]]);
  const before = breakdown("EXPENSE", [["Transport", 17000], ["Shopping", 3100], ["Food", 16800], ["Health", 900]]);

  it("lists every category by the size of its move", () => {
    expect(categoryMoves(now, before).map((m) => [m.name, m.change, m.percent])).toEqual([
      ["Transport", -9800, -57.6],
      ["Shopping", 1300, 41.9],
      ["Health", -900, -100],
      ["Food", 0, 0],
    ]);
  });

  it("finds the biggest fall, or nothing when everything rose", () => {
    expect(biggestDrop(now, before)?.name).toBe("Transport");
    expect(biggestDrop(before, breakdown("EXPENSE", []))).toBeNull();
  });
});

describe("monthRates and rateTrend", () => {
  const months = ["2026-05", "2026-06", "2026-07"];
  const income = monthly("INCOME", months, [80000, 80000, 0]);
  const expense = monthly("EXPENSE", months, [56800, 60800, 1000]);

  it("works out what was kept each month", () => {
    const rates = monthRates(income, expense);
    expect(rates.map((r) => [r.month, r.kept, r.rate])).toEqual([
      ["2026-05", 23200, 29],
      ["2026-06", 19200, 24],
      ["2026-07", -1000, null],
    ]);
  });

  it("says whether the share kept went up since the first month", () => {
    expect(rateTrend(monthRates(income, expense))).toEqual({ direction: "down", points: 5, since: "2026-05" });
    expect(rateTrend(monthRates(monthly("INCOME", ["2026-07"], [100]), monthly("EXPENSE", ["2026-07"], [50])))).toBeNull();
  });

  it("calls a flat rate the same, not up by nothing", () => {
    const flat = monthRates(monthly("INCOME", ["2026-05", "2026-06"], [100, 200]), monthly("EXPENSE", ["2026-05", "2026-06"], [50, 100]));
    expect(rateTrend(flat)).toEqual({ direction: "same", points: 0, since: "2026-05" });
  });

  it("leaves the month under way out of a trend until it is over", () => {
    const rates = monthRates(monthly("INCOME", ["2026-09", "2026-10"], [100, 100]), monthly("EXPENSE", ["2026-09", "2026-10"], [50, 10]));
    expect(completeMonths(rates, "2026-10-21").map((r) => r.month)).toEqual(["2026-09"]);
    expect(completeMonths(rates, "2026-10-31").map((r) => r.month)).toEqual(["2026-09", "2026-10"]);
  });

  it("names the month under way until it is over", () => {
    const rates = monthRates(monthly("INCOME", ["2026-09", "2026-10"], [100, 100]), monthly("EXPENSE", ["2026-09", "2026-10"], [50, 10]));
    expect(monthUnderWay(rates, "2026-10-21")).toBe("2026-10");
    expect(monthUnderWay(rates, "2026-10-31")).toBeNull();
    expect(monthUnderWay([], "2026-10-21")).toBeNull();
  });
});

describe("netWorth", () => {
  it("adds what you have and takes off what you owe", () => {
    const worth = netWorth({ wallets: 66750, savings: 160000, assets: 5720000, owedToYou: 125000, youOwe: -600000 });
    expect(worth.total).toBe(5471750);
    expect(worth.have).toBe(6071750);
    expect(worth.youOwe).toBe(600000);
    expect(worth.haveShare).toBe(91);
    expect(biggestPart(worth)).toBe("assets");
  });

  it("is all green with nothing owed, and has no biggest part when empty", () => {
    expect(netWorth({ wallets: 0, savings: 0, assets: 0, owedToYou: 0, youOwe: 0 }).haveShare).toBe(100);
    expect(biggestPart({ wallets: 0, savings: 0, assets: 0, owedToYou: 0, youOwe: 500 })).toBeNull();
  });
});

describe("periodLabels, rangeLabel and monthName", () => {
  it("names what is compared, down to the day", () => {
    expect(periodLabels({ dateFrom: "2026-10-01", dateTo: "2026-10-21" }, { dateFrom: "2026-09-01", dateTo: "2026-09-21" }, "this-month", "en")).toEqual({
      period: "1–21 October 2026",
      previous: "1–21 September",
      before: "1–21 Sep",
      now: "1–21 Oct",
      heads: ["1–21 Sep", "1–21 Oct"],
    });
    expect(periodLabels({ dateFrom: "2026-09-01", dateTo: "2026-09-30" }, { dateFrom: "2026-08-01", dateTo: "2026-08-31" }, "last-month", "en")).toEqual({
      period: "September 2026",
      previous: "August",
      before: "Aug",
      now: "Sep",
      heads: ["Aug", "Sep"],
    });
    expect(periodLabels({ dateFrom: "2026-08-01", dateTo: "2026-10-21" }, { dateFrom: "2026-05-01", dateTo: "2026-07-21" }, "last-3-months", "en")).toEqual({
      period: "1 August – 21 October 2026",
      previous: "1 May – 21 July",
      before: "1 May–21 Jul",
      now: "1 Aug–21 Oct",
      heads: ["1 May–21 Jul", "1 Aug–21 Oct"],
    });
  });

  it("gives the year its days in the sentences and the years as column heads", () => {
    expect(periodLabels({ dateFrom: "2026-01-01", dateTo: "2026-10-21" }, { dateFrom: "2025-01-01", dateTo: "2025-10-21" }, "this-year", "en")).toEqual({
      period: "1 January – 21 October 2026",
      previous: "1 January – 21 October 2025",
      before: "1 Jan–21 Oct 2025",
      now: "1 Jan–21 Oct 2026",
      heads: ["2025", "2026"],
    });
  });

  it("names both years when a range crosses New Year", () => {
    expect(rangeLabel("2026-11-01", "2027-01-31", "en")).toBe("November 2026 – January 2027");
    expect(rangeLabel("2026-11-01", "2027-01-21", "en")).toBe("1 November 2026 – 21 January 2027");
    expect(rangeLabel("2025-07-01", "2026-06-30", "en", "short")).toBe("Jul 2025–Jun 2026");
    expect(periodLabels({ dateFrom: "2027-01-01", dateTo: "2027-01-21" }, { dateFrom: "2026-12-01", dateTo: "2026-12-21" }, "this-month", "en").previous).toBe("1–21 December 2026");
  });

  it("speaks Bangla, with Bangla digits and the board's month names", () => {
    expect(monthName("2026-10", "bn")).toBe("অক্টোবর");
    expect(monthName("2026-09", "bn", "short")).toBe("সেপ্টে");
    expect(monthName("2026-10", "en", "short", true)).toBe("Oct 2026");
    expect(monthName("2026-10", "bn", "long", true)).toBe("অক্টোবর ২০২৬");
    expect(rangeLabel("2026-10-01", "2026-10-21", "bn")).toBe("১–২১ অক্টোবর ২০২৬");
    expect(periodLabels({ dateFrom: "2026-01-01", dateTo: "2026-10-21" }, { dateFrom: "2025-01-01", dateTo: "2025-10-21" }, "this-year", "bn").heads).toEqual(["২০২৫", "২০২৬"]);
  });
});

describe("insightPeriodFrom", () => {
  it("accepts the four periods and falls back to this month", () => {
    expect(insightPeriodFrom("this-year")).toBe("this-year");
    expect(insightPeriodFrom("all")).toBe("this-month");
    expect(insightPeriodFrom(undefined)).toBe("this-month");
  });
});
