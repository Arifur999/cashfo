import { describe, expect, it } from "vitest";
import { fillText } from "@/lib/i18n/fill";
import { inEnglish, type Translate } from "@/lib/i18n/message";
import { translate } from "@/lib/i18n/translate";
import type { Reminder } from "./api";
import {
  activeReminderRows,
  appPath,
  draftFromReminder,
  minutesBeforeLabel,
  nextReminderTime,
  normalizeTimes,
  normalizeWeekdays,
  reminderHref,
  reminderInput,
  reminderSummary,
  reminderTargetName,
  weekdaysLabel,
} from "./reminderDisplay";

const inBangla: Translate = (key, values) => fillText(translate("bn", key), values ?? {});

const reminder = (overrides: Partial<Reminder>): Reminder => ({
  id: "r1",
  kind: "HABIT",
  targetKey: "h1",
  enabled: true,
  times: ["07:00"],
  weekdays: [],
  minutesBefore: 0,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

describe("normalizeTimes", () => {
  it("keeps valid times once each, earliest first, six at most", () => {
    expect(normalizeTimes(["21:00", "07:00", "07:00", "25:00", "7:00", ""])).toEqual(["07:00", "21:00"]);
    expect(normalizeTimes(["01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00"])).toHaveLength(6);
  });
});

describe("normalizeWeekdays", () => {
  it("sorts, drops repeats and strays, and treats all seven as every day", () => {
    expect(normalizeWeekdays([5, 0, 5, 7, -1, 2.5])).toEqual([0, 5]);
    expect(normalizeWeekdays([0, 1, 2, 3, 4, 5, 6])).toEqual([]);
  });
});

describe("nextReminderTime", () => {
  it("starts at the fallback, then an hour after the latest", () => {
    expect(nextReminderTime([])).toBe("08:00");
    expect(nextReminderTime([], "21:30")).toBe("21:30");
    expect(nextReminderTime(["07:00", "09:30"])).toBe("10:30");
  });

  it("wraps to the first free hour from 6 am late at night, and stops at six", () => {
    expect(nextReminderTime(["23:30"])).toBe("06:00");
    expect(nextReminderTime(["06:00", "23:15"])).toBe("07:00");
    expect(nextReminderTime(["01:00", "02:00", "03:00", "04:00", "05:00", "06:00"])).toBeNull();
  });
});

describe("draftFromReminder and reminderInput", () => {
  it("starts an unsaved reminder off, with one time or ten minutes before", () => {
    expect(draftFromReminder("HABIT", null)).toEqual({ enabled: false, times: ["08:00"], weekdays: [], minutesBefore: 0 });
    expect(draftFromReminder("BOOK", undefined, "21:00").times).toEqual(["21:00"]);
    expect(draftFromReminder("NAMAZ", null)).toEqual({ enabled: false, times: [], weekdays: [], minutesBefore: 10 });
  });

  it("copies a saved one", () => {
    expect(draftFromReminder("HABIT", reminder({ times: ["06:30", "20:00"], weekdays: [1, 3] }))).toEqual({ enabled: true, times: ["06:30", "20:00"], weekdays: [1, 3], minutesBefore: 0 });
  });

  it("sends only the fields the kind uses", () => {
    const draft = { enabled: true, times: ["20:00", "06:30", "06:30"], weekdays: [0, 1, 2, 3, 4, 5, 6], minutesBefore: 15 };
    expect(reminderInput("SKILL", "s1", draft)).toEqual({ kind: "SKILL", targetKey: "s1", enabled: true, times: ["06:30", "20:00"], weekdays: [] });
    expect(reminderInput("NAMAZ", "fajr", draft)).toEqual({ kind: "NAMAZ", targetKey: "fajr", enabled: true, minutesBefore: 15 });
    expect(reminderInput("RAMADAN", "sehri", { ...draft, minutesBefore: 500 }).minutesBefore).toBe(120);
  });
});

describe("labels", () => {
  it("words minutes before, in the reader's digits", () => {
    expect(minutesBeforeLabel(0, inEnglish)).toBe("At the time");
    expect(minutesBeforeLabel(10, inEnglish)).toBe("10 min before");
    expect(minutesBeforeLabel(15, inBangla, "bn")).toBe("১৫ মিনিট আগে");
  });

  it("words the days", () => {
    expect(weekdaysLabel([], inEnglish)).toBe("Every day");
    expect(weekdaysLabel([0, 1, 2, 3, 4], inEnglish)).toBe("Sunday to Thursday");
    expect(weekdaysLabel([1, 3], inEnglish)).toBe("Mon, Wed");
  });

  it("sums a reminder up", () => {
    expect(reminderSummary(reminder({ times: ["21:00", "07:00"], weekdays: [] }), inEnglish)).toBe("7:00 am, 9:00 pm · Every day");
    expect(reminderSummary(reminder({ kind: "NAMAZ", targetKey: "fajr", times: [], minutesBefore: 10 }), inEnglish)).toBe("10 min before");
    expect(reminderSummary(reminder({ times: ["07:00"] }), inBangla, "bn")).toBe("৭:০০ পূর্বাহ্ণ · প্রতিদিন");
  });

  it("names what it is about", () => {
    expect(reminderTargetName("NAMAZ", "maghrib", {}, inEnglish)).toBe("Maghrib");
    expect(reminderTargetName("NAMAZ", "fajr", {}, inBangla)).toBe("ফজর");
    expect(reminderTargetName("RAMADAN", "iftar", {}, inEnglish)).toBe("Iftar");
    expect(reminderTargetName("HABIT", "h1", { h1: "Walk" }, inEnglish)).toBe("Walk");
    expect(reminderTargetName("BOOK", "gone", {}, inEnglish)).toBe("A book");
    expect(reminderTargetName("HABIT", "constructor", {}, inEnglish)).toBe("A habit");
  });
});

describe("reminderHref and appPath", () => {
  it("links each kind to where it is edited", () => {
    expect(reminderHref("HABIT", "h1")).toBe("/habit-tracker/daily");
    expect(reminderHref("CHALLENGE", "c 1")).toBe("/habit-tracker/habits/others/c%201");
    expect(reminderHref("TODO", "t1")).toBe("/habit-tracker/todos");
    expect(reminderHref("NAMAZ", "fajr")).toBe("/habit-tracker/habits?category=Namaz");
    expect(reminderHref("RAMADAN", "sehri")).toBe("/habit-tracker/habits?category=Ramadan");
    expect(reminderHref("BOOK", "b1")).toBe("/habit-tracker/habits?category=Book");
    expect(reminderHref("SKILL", "s1")).toBe("/habit-tracker/habits?category=Course");
  });

  it("follows only the app's own paths", () => {
    expect(appPath("/habit-tracker/daily")).toBe("/habit-tracker/daily");
    expect(appPath("//evil.example")).toBeNull();
    expect(appPath("/\\evil.example")).toBeNull();
    expect(appPath("https://evil.example")).toBeNull();
    expect(appPath(null)).toBeNull();
  });
});

describe("activeReminderRows", () => {
  it("lists the ones that are on, prayers first in the day's order", () => {
    const rows = activeReminderRows(
      [
        reminder({ id: "a", kind: "BOOK", targetKey: "b1", times: ["21:00"] }),
        reminder({ id: "b", kind: "NAMAZ", targetKey: "isha", times: [], minutesBefore: 0 }),
        reminder({ id: "c", kind: "NAMAZ", targetKey: "fajr", times: [], minutesBefore: 10 }),
        reminder({ id: "d", kind: "HABIT", targetKey: "h1", enabled: false }),
        reminder({ id: "e", kind: "HABIT", targetKey: "h2" }),
      ],
      { b1: "Atomic Habits", h2: "Walk" },
      inEnglish,
    );
    expect(rows.map((row) => [row.id, row.kindLabel, row.name, row.summary, row.href])).toEqual([
      ["c", "Namaz", "Fajr", "10 min before", "/habit-tracker/habits?category=Namaz"],
      ["b", "Namaz", "Isha", "At the time", "/habit-tracker/habits?category=Namaz"],
      ["e", "Daily habit", "Walk", "7:00 am · Every day", "/habit-tracker/daily"],
      ["a", "Book", "Atomic Habits", "9:00 pm · Every day", "/habit-tracker/habits?category=Book"],
    ]);
  });
});
