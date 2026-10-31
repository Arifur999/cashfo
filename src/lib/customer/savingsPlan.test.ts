import { describe, expect, it } from "vitest";
import type { SavingsGoal } from "./api";
import { addMoneyChips, behindFirst, catchUp, daysBetween, dueThisMonth, goalLook, goalsHero, monthEndAfter, monthlyAverage, monthlyFromNow, monthProgress, monthsToGo, planChart, splitLargestFirst, timeFraction } from "./savingsPlan";

const TODAY = "2026-10-31";
const goal = (over: Partial<SavingsGoal> = {}): SavingsGoal =>
  ({
    id: "g",
    name: "Emergency fund",
    status: "ACTIVE",
    targetAmount: "150000.00",
    currentAmount: "80000.00",
    targetDate: "2027-06-30T00:00:00.000Z",
    startDate: "2026-03-01",
    startAmount: "0.00",
    planStartDate: "2026-03-01",
    planStartAmount: "0.00",
    addedThisMonth: "10000.00",
    pace: { expected: "75309.00", difference: "4691.00", state: "AHEAD" },
    reachedAt: null,
    holdings: [],
    ...over,
  }) as SavingsGoal;

describe("days and months", () => {
  it("counts days and the months still to go", () => {
    expect(daysBetween("2026-10-01", "2026-10-31")).toBe(30);
    expect(monthsToGo("2027-06-30", TODAY)).toBe(8);
    expect(monthsToGo("2026-11-02", TODAY)).toBe(1);
    expect(monthsToGo("2026-09-01", TODAY)).toBe(1);
  });

  it("finds the end of a later month", () => {
    expect(monthEndAfter(TODAY, 1)).toBe("2026-11-30");
    expect(monthEndAfter(TODAY, 4)).toBe("2027-02-28");
  });
});

describe("monthly amounts", () => {
  it("spreads what is left over the months to go", () => {
    expect(monthlyFromNow(goal(), TODAY)).toBe(8750);
  });

  it("asks this month for what was left when it began", () => {
    // ৳80,000 now, ৳10,000 of it this month: ৳80,000 was left at the start.
    expect(dueThisMonth(goal(), TODAY)).toBe(10000);
  });

  it("says whether this month is covered", () => {
    expect(monthProgress(goal(), TODAY)).toEqual({ state: "done", got: 10000, due: 10000, percent: 100 });
    expect(monthProgress(goal({ addedThisMonth: "4000.00", currentAmount: "74000.00" }), TODAY)).toMatchObject({ state: "part", percent: 40 });
    expect(monthProgress(goal({ addedThisMonth: "0.00" }), TODAY).state).toBe("none");
  });
});

describe("time and average", () => {
  it("measures how much of the goal's time has gone", () => {
    expect(timeFraction(goal(), TODAY)).toBeCloseTo(244 / 486, 5);
    expect(timeFraction(goal({ startDate: "2026-11-15" }), TODAY)).toBe(0);
  });

  it("averages what was saved since the start, not what it began with", () => {
    expect(monthlyAverage(goal({ startAmount: "20000.00" }), TODAY)).toBe(Math.round(60000 / (244 / 30.44)));
    expect(monthlyAverage(goal({ startDate: "2026-10-20" }), TODAY)).toBe(0);
  });
});

describe("goalLook and order", () => {
  it("shows the pace while active and Achieved for a reached goal paid out", () => {
    expect(goalLook(goal())).toBe("AHEAD");
    expect(goalLook(goal({ pace: null }))).toBe("ON_TRACK");
    expect(goalLook(goal({ status: "WITHDRAWN", reachedAt: "2026-10-18T00:00:00.000Z" }))).toBe("ACHIEVED");
    expect(goalLook(goal({ status: "WITHDRAWN" }))).toBe("WITHDRAWN");
    expect(goalLook(goal({ status: "PAUSED" }))).toBe("PAUSED");
  });

  it("puts behind goals first and keeps the rest in order", () => {
    const behind = goal({ id: "b", pace: { expected: "1", difference: "-9000", state: "BEHIND" } });
    const list = behindFirst([goal({ id: "a" }), goal({ id: "c" }), behind]);
    expect(list.map((g) => g.id)).toEqual(["b", "a", "c"]);
  });
});

describe("goalsHero", () => {
  it("adds up open goals and this month's money", () => {
    const hero = goalsHero(
      [
        goal(),
        goal({ id: "p", status: "PAUSED", currentAmount: "40000.00", addedThisMonth: "0.00" }),
        goal({ id: "w", status: "WITHDRAWN", currentAmount: "0.00", addedThisMonth: "0.00" }),
        goal({ id: "b", pace: { expected: "1", difference: "-9000", state: "BEHIND" }, addedThisMonth: "0.00" }),
      ],
      TODAY,
    );
    expect(hero).toMatchObject({ saved: 200000, target: 450000, toGo: 250000, active: 2, behind: 1, gotMoney: 1, monthSaved: 10000 });
    expect(hero.monthTarget).toBe(10000 + 8750);
  });
});

describe("addMoneyChips", () => {
  it("suggests what this month still needs, then round figures and the rest", () => {
    expect(addMoneyChips(goal({ addedThisMonth: "0.00" }), TODAY)).toEqual([
      { kind: "suggested", amount: 8750 },
      { kind: "round", amount: 5000 },
      { kind: "round", amount: 10000 },
      { kind: "rest", amount: 70000 },
    ]);
  });

  it("offers next month once this one is covered, and nothing past the target", () => {
    expect(addMoneyChips(goal(), TODAY)[0]).toEqual({ kind: "covered", amount: 8750 });
    expect(addMoneyChips(goal({ currentAmount: "147000.00", addedThisMonth: "0.00" }), TODAY)).toEqual([
      { kind: "suggested", amount: 375 },
      { kind: "rest", amount: 3000 },
    ]);
  });
});

describe("catchUp", () => {
  const behind = goal({ currentAmount: "60000.00", pace: { expected: "75309.00", difference: "-15309.00", state: "BEHIND" } });
  it("works out the three ways back", () => {
    const plan = catchUp(behind, TODAY);
    expect(plan).toMatchObject({ expected: 75309, gap: 15309, addNow: 15309, perMonth: 11250 });
    // ৳1,50,000 over 486 days is about ৳9,395 a month: ৳90,000 takes 10 months.
    expect(plan.originalPace).toBe(9395);
    expect(plan.newEnd).toBe("2027-08-31");
    expect(plan.monthsLater).toBe(2);
  });

  it("never offers an end date before the one it has", () => {
    const plan = catchUp(goal({ currentAmount: "140000.00", pace: { expected: "145000", difference: "-5000", state: "BEHIND" } }), TODAY);
    expect(plan.newEnd > "2027-06-30").toBe(true);
  });
});

describe("splitLargestFirst", () => {
  it("takes from the biggest wallet first", () => {
    const holdings = [
      { accountId: "d", name: "DPS", amount: "25000.00" },
      { accountId: "f", name: "FDR", amount: "55000.00" },
    ];
    expect(splitLargestFirst(holdings, 60000)).toEqual([
      { name: "FDR", amount: 55000 },
      { name: "DPS", amount: 5000 },
    ]);
  });
});

describe("planChart", () => {
  it("draws the plan from its start and the money as steps to today", () => {
    const chart = planChart(goal({ currentAmount: "15000.00", planStartDate: "2026-03-01", planStartAmount: "0.00" }), [
      { type: "CONTRIBUTION", amount: "20000.00", date: "2026-04-30T00:00:00.000Z" },
      { type: "TRANSFER_OUT", amount: "5000.00", date: "2026-09-15T00:00:00.000Z" },
    ], TODAY);
    expect(chart.planPoints).toBe("34,120 530,20");
    expect(chart.savedPoints.split(" ")).toHaveLength(6);
    expect(chart.now).toEqual({ x: chart.todayX, y: 110 });
  });
});
