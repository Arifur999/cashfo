import { describe, expect, it } from "vitest";
import { inEnglish as t } from "@/lib/i18n/message";
import { answerOf, type AiWords, happeningText, heroText, questionOf, todoLink, todoText, wayText } from "./aiInsightsDisplay";
import type { AiReport } from "./aiInsightsTypes";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const w: AiWords = {
  t,
  money: (paisa) => `৳ ${(paisa / 100).toLocaleString("en-IN")}`,
  month: (key) => MONTHS[Number(key.slice(5, 7)) - 1],
  day: (day) => `${Number(day.slice(8))} ${MONTHS[Number(day.slice(5, 7)) - 1]}`,
  count: String,
};
const TK = (taka: number) => taka * 100;

const report: AiReport = {
  generatedAt: "2026-11-07T01:00:00.000Z",
  summary: { month: "2026-10", previous: "2026-09", income: TK(85_000), expenses: TK(52_300), kept: TK(32_700), keptPercent: 38, spentChange: -4, biggest: { name: "Food & Dining", amount: TK(16_800) }, mood: "good" },
  todos: [
    { kind: "budget", key: "b", name: "Shopping", spent: TK(4_400), limit: TK(4_500), left: TK(100), over: false },
    { kind: "owed", key: "o", contactId: "c1", name: "Karim Traders", amount: TK(70_000), months: 4 },
  ],
  happened: [
    { tone: "good", kind: "kept", percent: 38, before: 31, previous: "2026-09" },
    { tone: "info", kind: "income", name: "Salary", amount: TK(85_000), date: "2026-10-01" },
  ],
  ways: [
    { key: "e", tip: "eatOut", name: "Food & Dining", perMonth: TK(3_000) },
    { key: "r", tip: "ride", name: "Transport", perMonth: TK(1_200) },
  ],
  answers: {
    spend: { name: "Food & Dining", total: TK(47_100), perMonth: TK(15_700), months: [{ month: "2026-08", amount: TK(15_900) }, { month: "2026-09", amount: TK(14_400) }, { month: "2026-10", amount: TK(16_800) }], highest: "2026-10" },
    afford: { amount: TK(25_000), keptAverage: TK(30_000), goals: TK(33_750), verdict: "slow", waitUntil: "2026-12" },
    owed: { count: 3, total: TK(125_000), people: [{ contactId: "c1", name: "Karim Traders", amount: TK(70_000) }], quiet: { name: "Karim Traders", months: 4 } },
  },
};

describe("aiInsightsDisplay", () => {
  it("writes the hero as the board does", () => {
    const hero = heroText(report.summary, report.todos.length, w);
    expect(hero.kicker).toBe("Your October, 1 to 31");
    expect(hero.title).toBe("October was a good month");
    expect(hero.sub).toBe("You kept ৳ 32,700 of what you earned. A few small things need your attention, listed below.");
    expect(hero.tiles.map((tile) => tile.sub)).toEqual(["38% of your income", "4% less than September", "Food & Dining"]);
  });

  it("words each to-do and where it opens", () => {
    expect(todoText(report.todos[0], w)).toEqual({ title: "Shopping budget is almost used up", text: "৳ 4,400 of ৳ 4,500 spent. Only ৳ 100 left this month." });
    expect(todoText(report.todos[1], w).text).toBe("No payment for 4 months. A friendly reminder might help.");
    expect(todoLink(report.todos[1]).href).toBe("/loan-management/ledger?contactId=c1");
  });

  it("says what happened and the ways to save", () => {
    expect(happeningText(report.happened[0], w)).toBe("You saved 38% of your income, up from 31% in September.");
    expect(happeningText(report.happened[1], w)).toBe("Your biggest income, ৳ 85,000 from Salary, came in on 1 October.");
    expect(wayText(report.ways[1], w)).toBe("Walk or take a rickshaw for rides under 3 km");
  });

  it("answers the suggested questions from the report", () => {
    expect(questionOf("spend", report, w)).toBe("How much did I spend on Food & Dining in the last 3 months?");
    const spend = answerOf("spend", report, w);
    expect(spend.lines[0]).toBe("You spent ৳ 47,100 on Food & Dining in the last 3 months, about ৳ 15,700 a month. October was the highest.");
    expect(spend.chart.map((bar) => bar.highest)).toEqual([false, false, true]);
    expect(answerOf("cut", report, w).lines[0]).toBe("2 places to look, about ৳ 4,200 a month in all:");
    expect(answerOf("afford", report, w).lines).toEqual([
      "Yes, but it would slow your goals.",
      "After your usual spending you have about ৳ 30,000 left each month, and your goals need about ৳ 33,750 of it.",
      "If you can wait until December, it fits without touching your savings.",
    ]);
    expect(answerOf("owed", report, w).lines[0]).toBe("3 people owe you ৳ 1,25,000 in total.");
    expect(answerOf("owed", { ...report, answers: { ...report.answers, owed: null } }, w).lines[0]).toMatch(/Turn it on in AI settings/);
  });
});
