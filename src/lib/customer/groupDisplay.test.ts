import { describe, expect, it } from "vitest";
import { inEnglish } from "@/lib/i18n/message";
import type { GroupContribution, GroupExpense, GroupMember, GroupSettlementMemberRow, GroupSettlementRecord, GroupSettlementResult } from "./api";
import {
  budgetStatus,
  cashInHand,
  categoryMembers,
  categorySplits,
  closedRecordFor,
  contributionTotals,
  contributionsByMember,
  countLabel,
  dayLabel,
  expenseShare,
  groupMonthOf,
  groupPickerMonths,
  groupTabFrom,
  groupTabsFor,
  hasActivity,
  inMonth,
  isDayClosed,
  isNewGroup,
  monthChoices,
  monthKeyFrom,
  monthRangeOf,
  paidIn,
  rangeLabel,
  recordDiffers,
  sharedCostEach,
  sharedEqually,
  shiftMonth,
  shortName,
  spendByCategory,
  spendByMonth,
  splitText,
  splitTotals,
  startDayOf,
  throughManager,
  unclosedPreviousMonth,
  whoPaysWhom,
} from "./groupDisplay";

const member = (id: string, name: string): GroupMember => ({ id, businessId: "g", name, phone: null, photoUrl: null, status: "ACTIVE", shareUnits: "1.00", joinedOn: null, leftOn: null, createdAt: "2025-01-05T00:00:00.000Z", updatedAt: "2025-01-05T00:00:00.000Z" });
const row = (id: string, balance: number): GroupSettlementMemberRow => ({ groupMemberId: id, name: id, sharing: true, grossDeposited: "0", returned: "0", contributed: "0", pocketPaid: "0", mealUnits: "0", mealCost: "0", otherShare: "0", share: "0", balance: balance.toFixed(2) });
const contribution = (memberId: string, amount: number, date = "2026-09-01"): GroupContribution => ({ id: `${memberId}-${amount}`, businessId: "g", groupMemberId: memberId, amount: amount.toFixed(2), kind: amount < 0 ? "RETURN" : "DEPOSIT", date, note: null, createdAt: date, groupMember: member(memberId, memberId) });
const expense = (category: string, amount: number, date: string, split: GroupExpense["split"] = "EQUAL", splits: GroupExpense["splits"] = []): GroupExpense => ({ id: `${category}-${date}`, businessId: "g", amount: amount.toFixed(2), date, category, description: null, paidByMemberId: null, paidByMember: null, paidFrom: "FUND", split, splits, createdAt: date });
const settlement = (over: Partial<GroupSettlementResult> = {}): GroupSettlementResult => ({ periodStart: "", periodEnd: "", totalExpense: "0.00", memberCount: 0, perMemberShare: "0.00", mealExpense: "0.00", mealUnits: "0.00", mealRate: "0", cashInHand: "0.00", members: [], ...over });
const record = (over: Partial<GroupSettlementRecord> = {}): GroupSettlementRecord => ({ id: "s", businessId: "g", periodStart: "2026-08-01T00:00:00.000Z", periodEnd: "2026-08-31T00:00:00.000Z", totalExpense: "0.00", memberCount: 2, perMemberShare: "0", mealExpense: "0", mealUnits: "0", mealRate: "0", cashInHand: "0.00", carriedForward: false, closedBy: "u", closedAt: "2026-09-01", members: [], ...over });

describe("months", () => {
  it("reads a month from the URL, or falls back to today's", () => {
    expect(monthKeyFrom("2026-09", "2026-10-15")).toBe("2026-09");
    expect(monthKeyFrom("2026-13", "2026-10-15")).toBe("2026-10");
    expect(monthRangeOf("2026-02")).toEqual({ key: "2026-02", year: 2026, month: 2, from: "2026-02-01", to: "2026-02-28" });
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", 2)).toBe("2027-01");
  });

  it("starts a group month on its start day", () => {
    expect(monthRangeOf("2026-09", 10)).toMatchObject({ from: "2026-09-10", to: "2026-10-09" });
    expect(monthRangeOf("2026-12", 5)).toMatchObject({ from: "2026-12-05", to: "2027-01-04" });
    expect(groupMonthOf("2026-10-05", 10)).toBe("2026-09");
    expect(groupMonthOf("2026-10-10", 10)).toBe("2026-10");
    expect(monthKeyFrom(undefined, "2026-10-05", 10)).toBe("2026-09");
    expect(monthChoices("2026-10-05", "2026-09-12", 10)).toEqual(["2026-09"]);
    expect(startDayOf(monthRangeOf("2026-09", 10))).toBe(10);
    expect(startDayOf(monthRangeOf("2026-09"))).toBe(1);
  });

  it("shows Meals only to a group that counts meals", () => {
    expect(groupTabsFor(false)).not.toContain("meals");
    expect(groupTabsFor(true)).toContain("meals");
  });

  it("offers the months back to the earliest entry, newest first", () => {
    expect(monthChoices("2026-10-15", "2026-08-03")).toEqual(["2026-10", "2026-09", "2026-08"]);
    expect(monthChoices("2026-10-15")).toHaveLength(12);
  });

  it("gives a group's picker a year at least, and always the month on show", () => {
    const october = monthRangeOf("2026-10");
    // Never closed a month: still the twelve up to this one.
    const year = groupPickerMonths("2026-10-15", [], october);
    expect(year).toHaveLength(12);
    expect([year[0], year.at(-1)]).toEqual(["2026-10", "2025-11"]);
    // Further back to the earliest closed month, or to the month on show.
    expect(groupPickerMonths("2026-10-15", [record({ periodStart: "2025-06-01T00:00:00.000Z" })], october).at(-1)).toBe("2025-06");
    expect(groupPickerMonths("2026-10-15", [], monthRangeOf("2025-03")).at(-1)).toBe("2025-03");
    // A month typed in from the future goes first: newest first, as ever.
    expect(groupPickerMonths("2026-10-15", [], monthRangeOf("2027-01")).slice(0, 2)).toEqual(["2027-01", "2026-10"]);
    // By the group's own months: on 5 Oct a month starting on the 10th is still September.
    const tenth = groupPickerMonths("2026-10-05", [], monthRangeOf("2026-09", 10), 10);
    expect([tenth[0], tenth.at(-1), tenth.length]).toEqual(["2026-09", "2025-10", 12]);
  });

  it("knows which months a settlement record closed", () => {
    const history = [record()];
    expect(closedRecordFor(history, monthRangeOf("2026-08"))?.id).toBe("s");
    expect(closedRecordFor(history, monthRangeOf("2026-09"))).toBeNull();
    expect(isDayClosed(history, "2026-08-12")).toBe(true);
    expect(isDayClosed(history, "2026-09-01")).toBe(false);
  });

  it("finds a last month left open while the group was running", () => {
    const october = monthRangeOf("2026-10");
    const old = [{ createdAt: "2026-08-20T09:00:00.000Z" }];
    expect(unclosedPreviousMonth([], old, october)).toMatchObject({ key: "2026-09", from: "2026-09-01", to: "2026-09-30" });
    expect(unclosedPreviousMonth([record({ periodStart: "2026-09-01T00:00:00.000Z", periodEnd: "2026-09-30T00:00:00.000Z" })], old, october)).toBeNull();
    // Started this month: there was no last month to close.
    expect(unclosedPreviousMonth([], [{ createdAt: "2026-10-02T09:00:00.000Z" }], october)).toBeNull();
    // ...unless money is dated into last month all the same (members added later, entries backdated).
    expect(unclosedPreviousMonth([], [{ createdAt: "2026-10-02T09:00:00.000Z" }], october, true)).toMatchObject({ key: "2026-09" });
    expect(unclosedPreviousMonth([record({ periodStart: "2026-09-01T00:00:00.000Z", periodEnd: "2026-09-30T00:00:00.000Z" })], old, october, true)).toBeNull();
    // A month starting on the 10th looks at 10 Aug – 9 Sep.
    expect(unclosedPreviousMonth([], old, monthRangeOf("2026-09", 10))).toMatchObject({ key: "2026-08", from: "2026-08-10", to: "2026-09-09" });
    // The start day moved from the 1st to the 10th after 1-30 Sep was closed:
    // 10 Sep - 9 Oct overlaps that record, and the server would refuse to close it.
    expect(unclosedPreviousMonth([record({ periodStart: "2026-09-01T00:00:00.000Z", periodEnd: "2026-09-30T00:00:00.000Z" })], old, monthRangeOf("2026-10", 10))).toBeNull();
  });

  it("tells a month with entries from an empty one", () => {
    expect(hasActivity(settlement())).toBe(false);
    expect(hasActivity(settlement({ totalExpense: "120.00" }))).toBe(true);
    expect(hasActivity(settlement({ members: [{ ...row("a", 0), grossDeposited: "500.00" }] }))).toBe(true);
    expect(hasActivity(settlement({ members: [{ ...row("a", 0), mealUnits: "2.50" }] }))).toBe(true);
  });
});

describe("a new group", () => {
  it("is new only while nothing was ever recorded", () => {
    expect(isNewGroup({ history: [], recentExpenses: [], contributions: [], meals: [] })).toBe(true);
    expect(isNewGroup({ history: [record()], recentExpenses: [], contributions: [], meals: [] })).toBe(false);
    expect(isNewGroup({ history: [], recentExpenses: [expense("Rent", 100, "2026-08-01")], contributions: [], meals: [] })).toBe(false);
    expect(isNewGroup({ history: [], recentExpenses: [], contributions: [], meals: [{}] })).toBe(false);
  });
});

describe("closed records", () => {
  const closed = record({ totalExpense: "900.00", cashInHand: "100.00", members: [{ id: "1", settlementId: "s", groupMemberId: "a", contributed: "500.00", pocketPaid: "0.00", mealUnits: "0", mealCost: "0", share: "450.00", balance: "50.00", groupMember: member("a", "Arif") }] });

  it("notices when the live figures moved after closing", () => {
    expect(recordDiffers(closed, settlement({ totalExpense: "900.00", cashInHand: "100.00", members: [row("a", 50)] }))).toBe(false);
    expect(recordDiffers(closed, settlement({ totalExpense: "1000.00", cashInHand: "100.00", members: [row("a", 50)] }))).toBe(true);
    expect(recordDiffers(closed, settlement({ totalExpense: "900.00", cashInHand: "100.00", members: [row("a", 0), row("b", 50)] }))).toBe(true);
  });
});

describe("money", () => {
  it("adds the balances up to the cash in hand", () => {
    expect(cashInHand(settlement({ memberCount: 3, cashInHand: "800.00", members: [row("a", 2000), row("b", -800), row("c", -400)] }))).toBe(800);
  });

  it("counts own-pocket money as paid in", () => {
    expect(paidIn({ contributed: "5000.00", pocketPaid: "800.00" })).toBe(5800);
  });

  it("splits deposits from returns and sums them by member", () => {
    const rows = [contribution("a", 5000), contribution("b", 3000), contribution("a", -1000)];
    expect(contributionTotals(rows)).toEqual({ deposited: 8000, returned: 1000, net: 7000 });
    expect(contributionsByMember(rows, [member("a", "Arif"), member("b", "Bithi"), member("c", "Chy")]).map((r) => [r.member.name, r.amount])).toEqual([["Arif", 4000], ["Bithi", 3000]]);
  });

  it("finds the fewest payments that make everyone even", () => {
    expect(whoPaysWhom([row("khaled", 2000), row("arif", -800), row("rakib", -400), row("sumon", -800)])).toEqual([
      { fromId: "arif", toId: "khaled", amount: 800 },
      { fromId: "sumon", toId: "khaled", amount: 800 },
      { fromId: "rakib", toId: "khaled", amount: 400 },
    ]);
    expect(whoPaysWhom([row("a", 500), row("b", -300), row("c", 200), row("d", -400)])).toEqual([
      { fromId: "d", toId: "a", amount: 400 },
      { fromId: "b", toId: "a", amount: 100 },
      { fromId: "b", toId: "c", amount: 200 },
    ]);
    expect(whoPaysWhom([row("a", 0)])).toEqual([]);
  });

  it("colours the budget from 90% and once over", () => {
    expect(budgetStatus(65000, 66000)).toEqual({ budget: 65000, spent: 66000, percent: 101.5, left: -1000, tone: "over" });
    expect(budgetStatus(42000, 40870).tone).toBe("warning");
    expect(budgetStatus(42000, 20000).tone).toBe("ok");
  });
});

describe("spend", () => {
  const expenses = [expense("Rent", 15000, "2026-09-01"), expense("Bazar", 2000, "2026-09-05"), expense("Bazar", 3000, "2026-08-20"), expense("Maid", 1000, "2026-09-30")];

  it("groups by category, biggest first, with shares", () => {
    expect(spendByCategory(inMonth(expenses, monthRangeOf("2026-09"))).map((c) => [c.name, c.amount, c.share])).toEqual([
      ["Rent", 15000, 83.3],
      ["Bazar", 2000, 11.1],
      ["Maid", 1000, 5.6],
    ]);
  });

  it("totals each month asked for", () => {
    expect(spendByMonth(expenses, ["2026-07", "2026-08", "2026-09"])).toEqual([
      { month: "2026-07", amount: 0 },
      { month: "2026-08", amount: 3000 },
      { month: "2026-09", amount: 18000 },
    ]);
  });

  it("buckets by the group's own month", () => {
    // From the 10th: 5 Sep belongs to August's month, 20 Aug too.
    expect(spendByMonth(expenses, ["2026-08", "2026-09"], 10)).toEqual([
      { month: "2026-08", amount: 20000 },
      { month: "2026-09", amount: 1000 },
    ]);
  });

  it("sends the old category tab to settings", () => {
    expect(groupTabFrom("category")).toBe("categories");
    expect(groupTabFrom("members")).toBe("members");
    expect(groupTabFrom(undefined)).toBe("dashboard");
  });

  it("says how each category was shared this month", () => {
    const month = [expense("Bazar", 500, "2026-09-02", "MEALS"), expense("Rent", 9000, "2026-09-01", "SHARES"), expense("Wifi", 900, "2026-09-03"), expense("Wifi", 100, "2026-09-04", "EXACT")];
    expect(categorySplits(month, true)).toEqual({ Bazar: "MEALS", Rent: "SHARES", Wifi: "MIXED" });
    // No meal rate: by-meals costs are shared equally.
    expect(categorySplits(month, false).Bazar).toBe("EQUAL");
  });
});

describe("splitText", () => {
  const family = [{ ...member("k", "Khaled"), shareUnits: "3.00" }, { ...member("a", "Arif"), shareUnits: "1.00" }, { ...member("r", "Rakib"), shareUnits: "4.00" }] as GroupMember[];
  const split = (groupMemberId: string, units: string | null = null) => ({ id: groupMemberId, expenseId: "e", groupMemberId, units, amount: null });
  it("says how an expense is shared", () => {
    expect(splitText({ split: "SHARES", splits: [] }, family)).toEqual({ kind: "SHARES", detail: "3 : 1 : 4", only: null });
    expect(splitText({ split: "EQUAL", splits: [] }, family)).toEqual({ kind: "EQUAL", detail: "÷ 3", only: null });
    expect(splitText({ split: "EQUAL", splits: [split("r")] }, family)).toEqual({ kind: "EQUAL", detail: null, only: "Rakib" });
    expect(splitText({ split: "SHARES", splits: [split("k", "2.00"), split("r", "1.00")] }, family).detail).toBe("2 : 1");
    expect(splitText({ split: "MEALS", splits: [] }, family)).toEqual({ kind: "MEALS", detail: null, only: null });
  });
});

describe("throughManager", () => {
  it("has the debtors pay the manager, who returns what others are owed", () => {
    const rows = [row("k", 578), row("t", -1174), row("a", -351), row("s", 774), row("r", 853)];
    expect(throughManager(rows, "k")).toEqual([
      { fromId: "t", toId: "k", amount: 1174, owes: true },
      { fromId: "a", toId: "k", amount: 351, owes: true },
      { fromId: "k", toId: "r", amount: 853, owes: false },
      { fromId: "k", toId: "s", amount: 774, owes: false },
    ]);
  });
});

describe("expenseShare", () => {
  const sep = { from: "2026-09-01", to: "2026-09-30" };
  const people = [{ ...member("k", "Khaled"), shareUnits: "3.00" }, { ...member("a", "Arif"), shareUnits: "1.00", joinedOn: "2026-09-16" }, { ...member("r", "Rakib"), shareUnits: "4.00" }] as GroupMember[];
  const cost = (amount: number, date: string, split: GroupExpense["split"] = "EQUAL", splits: GroupExpense["splits"] = []) => ({ amount: amount.toFixed(2), date, split, splits });
  it("works out one member's part the way the settlement does", () => {
    expect(expenseShare(cost(900, "2026-09-05"), "k", people, sep, false)).toBe(450);
    expect(expenseShare(cost(900, "2026-09-05"), "a", people, sep, false)).toBe(0);
    expect(expenseShare(cost(800, "2026-09-20", "SHARES"), "r", people, sep, false)).toBe(400);
    expect(expenseShare(cost(1000, "2026-09-20", "EXACT", [{ id: "1", expenseId: "e", groupMemberId: "k", units: null, amount: "700.00" }, { id: "2", expenseId: "e", groupMemberId: "r", units: null, amount: "300.00" }]), "k", people, sep, false)).toBe(700);
    expect(expenseShare(cost(600, "2026-09-20", "MEALS"), "k", people, sep, true)).toBe(0);
    expect(expenseShare(cost(600, "2026-09-20", "MEALS"), "k", people, sep, false)).toBe(200);
  });

  it("adds up each member's part of the costs shared one way", () => {
    const month = [expense("Bazar", 800, "2026-09-20", "SHARES"), expense("Rent", 900, "2026-09-05")];
    expect(splitTotals(month, "SHARES", people, sep, false)).toEqual({ k: 300, a: 100, r: 400 });
  });

  it("calls the shared cost one figure only when everyone pays it", () => {
    const whole = people.map((p) => ({ ...p, joinedOn: null }));
    expect(sharedEqually([cost(900, "2026-09-05"), cost(600, "2026-09-06", "MEALS")], true, whole, sep)).toBe(true);
    expect(sharedEqually([cost(900, "2026-09-05", "SHARES")], true, whole, sep)).toBe(false);
    expect(sharedEqually([cost(900, "2026-09-05", "EQUAL", [{ id: "1", expenseId: "e", groupMemberId: "k", units: null, amount: null }])], true, whole, sep)).toBe(false);
    // Arif joined on the 16th, so the costs before it were split among two.
    expect(sharedEqually([cost(900, "2026-09-05")], true, people, sep)).toBe(false);
  });

  it("works out the shared cost each from the costs outside the meal pool", () => {
    expect(sharedCostEach(settlement({ totalExpense: "20000.00", memberCount: 3 }))).toBeCloseTo(6666.667, 3);
    expect(sharedCostEach(settlement({ totalExpense: "30000.00", mealExpense: "18000.00", memberCount: 4 }))).toBe(3000);
    expect(sharedCostEach(settlement({ totalExpense: "500.00", memberCount: 0 }))).toBe(0);
  });
});

describe("words", () => {
  it("shortens a name past its title", () => {
    expect(shortName("Md. Arif Hossain")).toBe("Arif");
    expect(shortName("Md Arif")).toBe("Arif");
    expect(shortName("Md.Rakib Hasan")).toBe("Rakib");
    expect(shortName("Mohammad Khaled")).toBe("Khaled");
    expect(shortName("মোঃ আরিফ হোসেন")).toBe("আরিফ");
    expect(shortName("Sumon Ahmed")).toBe("Sumon");
    expect(shortName("Md.")).toBe("Md.");
    expect(shortName(undefined)).toBe("?");
  });

  it("writes days and a month's range in the reader's language", () => {
    expect(dayLabel("2026-10-05", "en")).toBe("5 Oct");
    expect(dayLabel("2026-10-05T00:00:00.000Z", "en", true)).toBe("5 Oct 2026");
    expect(dayLabel("2026-10-05", "bn", true)).toBe("৫ অক্টো ২০২৬");
    expect(rangeLabel(monthRangeOf("2026-09", 10), "en")).toBe("10 Sep – 9 Oct 2026");
    expect(rangeLabel(monthRangeOf("2026-12", 5), "en")).toBe("5 Dec 2026 – 4 Jan 2027");
    expect(rangeLabel(monthRangeOf("2026-10"), "bn")).toBe("১ অক্টো – ৩১ অক্টো ২০২৬");
  });

  it("counts in the reader's digits", () => {
    expect(countLabel(inEnglish, "en", 1, "{count} member", "{count} members")).toBe("1 member");
    expect(countLabel(inEnglish, "en", 1200, "{count} member", "{count} members")).toBe("1,200 members");
    expect(countLabel(inEnglish, "bn", 3, "{count} member", "{count} members")).toBe("৩ members");
  });
});

describe("categoryMembers", () => {
  const khaled = member("k", "Khaled");
  const rakib = member("r", "Rakib");
  it("gives the chosen members still in the group, in the group's order", () => {
    expect(categoryMembers({ defaultMemberIds: ["r", "gone", "k"] }, [khaled, rakib])).toEqual([khaled, rakib]);
  });
  it("means everyone when none is chosen, none is left, or the API is older", () => {
    expect(categoryMembers({ defaultMemberIds: [] }, [khaled, rakib])).toBeNull();
    expect(categoryMembers({ defaultMemberIds: ["gone"] }, [khaled, rakib])).toBeNull();
    expect(categoryMembers({}, [khaled])).toBeNull();
    expect(categoryMembers(undefined, [khaled])).toBeNull();
  });
});
