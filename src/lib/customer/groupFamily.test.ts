import { describe, expect, it } from "vitest";
import type { GroupContribution, GroupExpenseCategoryOption, GroupMember, GroupMonthlyBudget, GroupSettlementMemberRow } from "./api";
import { addsUpToHundred, budgetMonths, budgetPageMonths, budgetTotals, categoryRows, costShares, mainAccountantId, monthEndOf, settlementCards, settleProgress, spendByMonthKey } from "./groupFamily";

const member = (id: string, extra: Partial<GroupMember> = {}): GroupMember => ({
  id,
  businessId: "b1",
  name: id,
  phone: null,
  photoUrl: null,
  status: "ACTIVE",
  shareUnits: "1",
  joinedOn: null,
  leftOn: null,
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
  ...extra,
});

const row = (id: string, balance: number, share = 4000, contributed = 0): GroupSettlementMemberRow => ({
  groupMemberId: id,
  name: id,
  grossDeposited: String(contributed),
  returned: "0",
  contributed: String(contributed),
  sharing: true,
  pocketPaid: "0",
  mealUnits: "0",
  mealCost: "0",
  otherShare: String(share),
  share: String(share),
  balance: String(balance),
});

const settle = (id: string, memberId: string, amount: number, groupId: string): GroupContribution => ({
  id,
  businessId: "b1",
  groupMemberId: memberId,
  amount: String(amount),
  kind: "SETTLE",
  date: "2026-10-28",
  note: null,
  createdAt: "2026-10-28T00:00:00.000Z",
  groupMember: member(memberId),
  settleGroupId: groupId,
});

describe("accountants and cost shares", () => {
  const members = [member("khaled", { role: "ACCOUNTANT", isOwner: true, costPercent: "50" }), member("arif", { costPercent: "25" }), member("rakib", { role: "ACCOUNTANT", costPercent: "25" }), member("gone", { status: "ARCHIVED" })];

  it("settles through the cash holder, else the first accountant", () => {
    expect(mainAccountantId({ cashHolderMemberId: "rakib" }, members)).toBe("rakib");
    expect(mainAccountantId({ cashHolderMemberId: null }, members)).toBe("khaled");
  });

  it("shares costs equally or by each percent, leaving inactive members out", () => {
    expect(costShares(members, { costSplit: "EQUAL" })).toEqual({ khaled: 100 / 3, arif: 100 / 3, rakib: 100 / 3 });
    expect(costShares(members, { costSplit: "CUSTOM" })).toEqual({ khaled: 50, arif: 25, rakib: 25 });
    expect(addsUpToHundred([33.33, 33.33, 33.34])).toBe(true);
    expect(addsUpToHundred([50, 25, 20])).toBe(false);
  });
});

describe("settlement cards", () => {
  // Khaled holds the cash and is owed 5000; Arif gets 2000 back; Rakib owes 4000.
  const rows = [row("khaled", 5000, 4000, 9000), row("arif", 2000, 4000, 6000), row("rakib", -4000)];

  it("says who pays and who gets back, through the accountant", () => {
    const cards = settlementCards(rows, [], "khaled");
    expect(cards.map((card) => card.state)).toEqual([{ kind: "holder" }, { kind: "gets", amount: 2000 }, { kind: "pays", amount: 4000 }]);
    expect(settleProgress(cards)).toEqual({ done: 0, total: 2 });
  });

  it("marks a member settled by a payment, keeping the balance before it", () => {
    const paid = [settle("c1", "rakib", 4000, "s1"), settle("c2", "khaled", -4000, "s1")];
    const after = [row("khaled", 1000, 4000, 5000), row("arif", 2000, 4000, 6000), row("rakib", 0, 4000, 4000)];
    const cards = settlementCards(after, paid, "khaled");
    expect(cards[2].state).toEqual({ kind: "paid", pair: { settleGroupId: "s1", fromId: "rakib", toId: "khaled", amount: 4000, date: "2026-10-28" } });
    expect(cards[2].before).toBe(-4000);
    expect(cards[2].gave).toBe(0);
    expect(cards[0].before).toBe(5000);
    expect(settleProgress(cards)).toEqual({ done: 1, total: 2 });
  });
});

describe("budget by month", () => {
  const budgets: GroupMonthlyBudget[] = [
    { id: "1", businessId: "b1", month: 9, year: 2026, budgetAmount: "65000", createdAt: "", updatedAt: "" },
    { id: "2", businessId: "b1", month: 8, year: 2026, budgetAmount: "65000", createdAt: "", updatedAt: "" },
  ];
  const spent = spendByMonthKey([
    { date: "2026-09-03", amount: "66000" },
    { date: "2026-08-10", amount: "60000" },
    { date: "2026-10-02", amount: "18450" },
  ]);

  it("tells over, left and running apart, and adds up only the months with a budget", () => {
    const months = budgetMonths(["2026-08", "2026-09", "2026-10", "2026-11"], budgets, spent, "2026-10");
    expect(months.map((m) => m.result)).toEqual([{ kind: "left", amount: 5000 }, { kind: "over", amount: 1000 }, { kind: "running" }, { kind: "none" }]);
    const totals = budgetTotals(months);
    expect(totals).toEqual({ budget: 130000, spent: 126000, used: (126000 / 130000) * 100, withBudget: 2, over: 1 });
  });

  it("lists next month back to the first", () => {
    expect(budgetPageMonths("2026-10", "2026-08")).toEqual(["2026-11", "2026-10", "2026-09", "2026-08"]);
    expect(monthEndOf("2026-10-14")).toBe("2026-10-31");
    expect(monthEndOf("2026-10-05", 10)).toBe("2026-10-09");
  });
});

describe("category rows", () => {
  const category = (name: string, hidden = false): GroupExpenseCategoryOption => ({ id: name, businessId: "b1", name, icon: null, color: "teal", displayOrder: 0, defaultSplit: "EQUAL", hidden, createdAt: "", updatedAt: "" });

  it("shows every category, highest first, and hidden ones only when spent in", () => {
    const rows = categoryRows([{ category: "Rent", amount: "12000" }, { category: "Bazar & grocery", amount: "3000" }, { category: "Old name", amount: "1000" }], [category("Bazar & grocery"), category("Rent"), category("Maid"), category("Gas", true)]);
    expect(rows.map((r) => [r.name, r.amount, r.count, Math.round(r.share)])).toEqual([
      ["Rent", 12000, 1, 75],
      ["Bazar & grocery", 3000, 1, 19],
      ["Old name", 1000, 1, 6],
      ["Maid", 0, 0, 0],
    ]);
  });
});
