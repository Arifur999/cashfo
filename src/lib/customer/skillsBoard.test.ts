import { describe, expect, it } from "vitest";
import { agoText, amountOf, calendarWeeks, categoryOf, daysAt, levelOf, linkHost, normalizeLink, pace14, parseCount, parseWhole, perDayToTarget, periodDays, periodParam, progressOf, readSkillsPeriod, skillWeek, stateInput, stateOf, streakOf, targetLine, weekStartDay } from "./skillsBoard";

describe("units and amounts", () => {
  it("writes lessons, chapters and hours from minutes", () => {
    expect(amountOf("LESSONS", 1)).toBe("1 lesson");
    expect(amountOf("CHAPTERS", 3)).toBe("3 chapters");
    expect(amountOf("HOURS", 90)).toBe("1h 30m");
    expect(amountOf("HOURS", 120)).toBe("2h");
    expect(amountOf("HOURS", 45)).toBe("45m");
  });

  it("reads totals as typed, hours to minutes", () => {
    expect(parseCount("40", "LESSONS")).toEqual({ value: 40 });
    expect(parseCount("2.5", "HOURS")).toEqual({ value: 150 });
    expect(parseCount("2.5", "LESSONS")).toEqual({ problem: "whole" });
    expect(parseCount("", "LESSONS")).toEqual({ problem: "empty" });
    expect(parseCount("", "LESSONS", { allowZero: true })).toEqual({ value: 0 });
    expect(parseCount("0", "LESSONS")).toEqual({ problem: "number" });
    expect(parseCount("5001", "CHAPTERS")).toEqual({ problem: "big" });
    expect(parseWhole("৩০")).toBe(30);
    expect(parseWhole("0")).toBeNull();
  });
});

describe("states", () => {
  it("shows a paused skill apart and says how to get each state", () => {
    expect(stateOf({ status: "LEARNING", pausedAt: "2026-11-01T00:00:00.000Z" })).toBe("paused");
    expect(stateOf({ status: "LEARNING", pausedAt: null })).toBe("learning");
    expect(stateOf({ status: "COMPLETED" })).toBe("done");
    expect(stateInput("paused")).toEqual({ status: "LEARNING", paused: true });
    expect(stateInput("learning")).toEqual({ status: "LEARNING", paused: false });
    expect(categoryOf("nope").id).toBe("life");
  });
});

describe("progress and pace", () => {
  const today = "2026-11-08";
  const logs = [
    { skillId: "a", date: "2026-11-08", amount: 2 },
    { skillId: "a", date: "2026-11-01", amount: 5 },
    { skillId: "a", date: "2026-10-20", amount: 9 },
  ];

  it("counts a completed skill as done and the pace over 14 days", () => {
    expect(progressOf({ progress: 18, target: 40, status: "LEARNING" })).toEqual({ done: 18, total: 40, left: 22, pct: 45 });
    expect(progressOf({ progress: 10, target: 40, status: "COMPLETED" }).pct).toBe(100);
    expect(pace14(logs, today)).toBe(0.5);
    expect(daysAt(22, 0.5)).toBe(44);
    expect(daysAt(22, 0)).toBe(0);
  });

  it("lays out the last seven days", () => {
    const week = skillWeek(logs, today);
    expect(week[0]).toEqual({ date: "2026-11-02", amount: 0 });
    expect(week[6]).toEqual({ date: "2026-11-08", amount: 2 });
  });

  it("tells a target date's standing", () => {
    expect(targetLine(null, 10, 1, today)).toEqual({ tone: "none", hint: "" });
    expect(targetLine("2026-12-31", 0, 0, today).hint).toBe("reached");
    expect(targetLine("2026-11-01", 5, 1, today)).toEqual({ tone: "late", hint: "date passed" });
    expect(targetLine("2026-12-31", 22, 1, today)).toEqual({ tone: "good", hint: "on track" });
    expect(targetLine("2026-11-18", 22, 1, today)).toEqual({ tone: "behind", hint: "behind by about 12 days" });
    expect(targetLine("2026-11-18", 22, 0, today).hint).toBe("behind, start practising");
    expect(perDayToTarget("LESSONS", 22, "2026-11-18", today)).toBe("about 2.2 lessons a day");
    expect(perDayToTarget("HOURS", 300, "2026-11-18", today)).toBe("about 30 minutes a day");
  });
});

describe("links", () => {
  it("adds https and takes only web addresses", () => {
    expect(normalizeLink("udemy.com/x")).toBe("https://udemy.com/x");
    expect(normalizeLink("")).toBe("");
    expect(normalizeLink("not a link")).toBeNull();
    expect(linkHost("https://www.react.dev/learn")).toBe("react.dev");
  });
});

describe("days", () => {
  it("says how long ago and counts the streak", () => {
    expect(agoText("2026-11-08", "2026-11-08")).toBe("Today");
    expect(agoText("2026-11-07", "2026-11-08")).toBe("Yesterday");
    expect(agoText("2026-11-05", "2026-11-08")).toBe("3 days ago");
    expect(agoText("2026-10-01", "2026-11-08")).toBe("1 October 2026");
    expect(streakOf(["2026-11-06", "2026-11-07"], "2026-11-08")).toBe(2);
  });

  it("lays out a calendar from the reader's first day", () => {
    // Sunday 8 November 2026; weeks from Saturday.
    expect(weekStartDay("2026-11-08", 6)).toBe("2026-11-07");
    const weeks = calendarWeeks("2026-11-08", 2, 6);
    expect(weeks[0][0]).toBe("2026-10-31");
    expect(weeks[1][1]).toBe("2026-11-08");
    expect(weeks[1][2]).toBeNull();
    expect(levelOf(0, 5)).toBe(0);
    expect(levelOf(5, 5)).toBe(4);
    expect(levelOf(1, 5)).toBe(1);
  });
});

describe("the dashboard's period", () => {
  const today = "2026-11-08";

  it("reads the address, this month by default", () => {
    expect(readSkillsPeriod(undefined, today)).toEqual({ kind: "month", year: 2026, month: 11 });
    expect(readSkillsPeriod("lm", "2026-01-10")).toEqual({ kind: "month", year: 2025, month: 12 });
    expect(readSkillsPeriod("ly", today)).toEqual({ kind: "year", year: 2025 });
    expect(readSkillsPeriod("2026-03", today)).toEqual({ kind: "month", year: 2026, month: 3 });
    expect(readSkillsPeriod("2026-12", today)).toEqual({ kind: "month", year: 2026, month: 11 });
    expect(readSkillsPeriod("2024", today)).toEqual({ kind: "year", year: 2024 });
  });

  it("writes it back and gives its days", () => {
    expect(periodParam({ kind: "month", year: 2026, month: 11 }, today)).toBe("tm");
    expect(periodParam({ kind: "month", year: 2026, month: 10 }, today)).toBe("lm");
    expect(periodParam({ kind: "year", year: 2026 }, today)).toBe("ty");
    expect(periodParam({ kind: "month", year: 2026, month: 3 }, today)).toBe("2026-03");
    expect(periodDays({ kind: "month", year: 2028, month: 2 })).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });
});
