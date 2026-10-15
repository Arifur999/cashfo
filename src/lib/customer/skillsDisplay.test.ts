import { describe, expect, it } from "vitest";
import type { Skill, SkillWeekDay } from "./api";
import { amountText, applyProgress, cellText, hoursInput, hoursText, lastActivity, namesLine, parseHours, progressPct, progressText, relativeDay, streakStart, weekSums, weekTotal } from "./skillsDisplay";

const t = (key: string) => key;

function skill(over: Partial<Skill> & { id: string }): Skill {
  return {
    name: over.id,
    source: "",
    unit: "LESSONS",
    target: 40,
    progress: 0,
    status: "WANT_TO_LEARN",
    color: "violet",
    icon: "code",
    startedAt: null,
    completedAt: null,
    completedYear: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...over,
  };
}

const TODAY = "2026-10-15";
const day = (date: string, bySkill: Record<string, number>, minutes = 0, lessons = 0): SkillWeekDay => ({ date, minutes, lessons, bySkill });
const WEEK = [day("2026-10-09", {}), day("2026-10-10", {}), day("2026-10-11", { react: 1, english: 30 }, 30, 1), day("2026-10-12", { react: 2, english: 60 }, 60, 2), day("2026-10-13", { react: 1 }, 0, 1), day("2026-10-14", { english: 90 }, 90, 0), day("2026-10-15", { react: 2 }, 0, 2)];

describe("units", () => {
  it("turns minutes into hours text and back", () => {
    expect(hoursText(90)).toBe("1.5");
    expect(hoursText(2400)).toBe("40");
    expect(hoursText(45)).toBe("0.8");
    expect(hoursInput(45)).toBe("0.75");
    expect(parseHours("1.5")).toBe(90);
    expect(parseHours(".5")).toBe(30);
    expect(parseHours("")).toBeNull();
    expect(parseHours("1.555")).toBeNull();
    expect(parseHours("abc")).toBeNull();
  });

  it("says an amount in words", () => {
    expect(amountText("LESSONS", 1, t)).toBe("1 lesson");
    expect(amountText("LESSONS", 2, t)).toBe("2 lessons");
    expect(amountText("HOURS", 30, t)).toBe("30 min");
    expect(amountText("HOURS", 60, t)).toBe("1 hour");
    expect(amountText("HOURS", 90, t)).toBe("1.5 hours");
    expect(cellText("LESSONS", 2)).toBe("2");
    expect(cellText("HOURS", 30)).toBe("30m");
    expect(cellText("HOURS", 90)).toBe("1.5h");
    expect(cellText("HOURS", 0)).toBe("");
    expect(progressText({ unit: "LESSONS", progress: 18, target: 40 }, t)).toBe("18 of 40 lessons");
    expect(progressText({ unit: "HOURS", progress: 720, target: 1800 }, t)).toBe("12 of 30 hours");
  });

  it("clamps the percentage", () => {
    expect(progressPct({ progress: 18, target: 40 })).toBe(45);
    expect(progressPct({ progress: 1, target: 0 })).toBe(0);
  });

  it("applies progress the way the server settles it", () => {
    const learning = skill({ id: "a", status: "LEARNING", progress: 10, target: 40 });
    expect(applyProgress(learning, 40, 2026)).toMatchObject({ status: "COMPLETED", progress: 40, completedYear: 2026 });
    expect(applyProgress(learning, 99, 2026).progress).toBe(40);
    expect(applyProgress({ ...learning, status: "COMPLETED", completedYear: 2026 }, 0, 2026)).toMatchObject({ status: "LEARNING", completedYear: null });
  });
});

describe("the week", () => {
  it("sums a skill's week and finds its latest day", () => {
    expect(weekTotal(WEEK, "react")).toBe(6);
    expect(weekTotal(WEEK, "english")).toBe(180);
    expect(weekTotal(WEEK, "nothing")).toBe(0);
    expect(lastActivity(WEEK, "react")).toEqual({ date: "2026-10-15", amount: 2 });
    expect(lastActivity(WEEK, "english")).toEqual({ date: "2026-10-14", amount: 90 });
    expect(lastActivity(WEEK, "nothing")).toBeNull();
    expect(weekSums(WEEK)).toEqual({ lessons: 6, minutes: 180 });
  });

  it("relates a day to today", () => {
    expect(relativeDay("2026-10-15", TODAY)).toBe("today");
    expect(relativeDay("2026-10-14", TODAY)).toBe("yesterday");
    expect(relativeDay("2026-10-11", TODAY)).toBe("earlier");
  });

  it("knows which day a streak began", () => {
    // Five days ending today (today has activity).
    expect(streakStart(5, WEEK, TODAY)).toBe("2026-10-11");
    // Today quiet so far: the streak runs through yesterday.
    const quiet = WEEK.map((d) => (d.date === TODAY ? day(TODAY, {}) : d));
    expect(streakStart(4, quiet, TODAY)).toBe("2026-10-11");
    expect(streakStart(0, WEEK, TODAY)).toBeNull();
  });

  it("joins names the way people say them", () => {
    expect(namesLine([], "and", "more")).toBe("");
    expect(namesLine(["React"], "and", "more")).toBe("React");
    expect(namesLine(["React", "English"], "and", "more")).toBe("React and English");
    expect(namesLine(["React", "English", "Python", "Canva"], "and", "more")).toBe("React, English and 2 more");
  });
});
