import { describe, expect, it } from "vitest";
import type { GroupContribution, GroupExpense, GroupMember, GroupSettlementMemberRow, GroupSettlementRecord } from "./api";
import { budgetStatus, cashInHand, closedRecordFor, contributionTotals, contributionsByMember, groupTabFrom, inMonth, isDayClosed, monthChoices, monthKeyFrom, monthRangeOf, shiftMonth, spendByCategory, spendByMonth, whoPaysWhom } from "./groupDisplay";

const member = (id: string, name: string): GroupMember => ({ id, businessId: "g", name, phone: null, photoUrl: null, status: "ACTIVE", createdAt: "2025-01-05T00:00:00.000Z", updatedAt: "2025-01-05T00:00:00.000Z" });
const row = (id: string, balance: number): GroupSettlementMemberRow => ({ groupMemberId: id, name: id, grossDeposited: "0", returned: "0", contributed: "0", share: "0", balance: balance.toFixed(2) });
const contribution = (memberId: string, amount: number, date = "2026-09-01"): GroupContribution => ({ id: `${memberId}-${amount}`, businessId: "g", groupMemberId: memberId, amount: amount.toFixed(2), date, note: null, createdAt: date, groupMember: member(memberId, memberId) });
const expense = (category: string, amount: number, date: string): GroupExpense => ({ id: `${category}-${date}`, businessId: "g", amount: amount.toFixed(2), date, category, description: null, paidByMemberId: null, paidByMember: null, createdAt: date });

describe("months", () => {
  it("reads a month from the URL, or falls back to today's", () => {
    expect(monthKeyFrom("2026-09", "2026-10-15")).toBe("2026-09");
    expect(monthKeyFrom("2026-13", "2026-10-15")).toBe("2026-10");
    expect(monthRangeOf("2026-02")).toEqual({ key: "2026-02", year: 2026, month: 2, from: "2026-02-01", to: "2026-02-28" });
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", 2)).toBe("2027-01");
  });

  it("offers the months back to the earliest entry, newest first", () => {
    expect(monthChoices("2026-10-15", "2026-08-03")).toEqual(["2026-10", "2026-09", "2026-08"]);
    expect(monthChoices("2026-10-15")).toHaveLength(12);
  });

  it("knows which months a settlement record closed", () => {
    const history: GroupSettlementRecord[] = [{ id: "s", businessId: "g", periodStart: "2026-08-01T00:00:00.000Z", periodEnd: "2026-08-31T00:00:00.000Z", totalExpense: "0", memberCount: 2, perMemberShare: "0", closedBy: "u", closedAt: "2026-09-01", members: [] }];
    expect(closedRecordFor(history, monthRangeOf("2026-08"))?.id).toBe("s");
    expect(closedRecordFor(history, monthRangeOf("2026-09"))).toBeNull();
    expect(isDayClosed(history, "2026-08-12")).toBe(true);
    expect(isDayClosed(history, "2026-09-01")).toBe(false);
  });
});

describe("money", () => {
  it("adds the balances up to the cash in hand", () => {
    expect(cashInHand({ periodStart: "", periodEnd: "", totalExpense: "0", memberCount: 3, perMemberShare: "0", members: [row("a", 2000), row("b", -800), row("c", -400)] })).toBe(800);
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
    expect(budgetStatus(65000, 66000)).toEqual({ budget: 65000, spent: 66000, percent: 102, left: -1000, tone: "over" });
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

  it("sends the old category tab to settings", () => {
    expect(groupTabFrom("category")).toBe("settings");
    expect(groupTabFrom("members")).toBe("members");
    expect(groupTabFrom(undefined)).toBe("dashboard");
  });
});
