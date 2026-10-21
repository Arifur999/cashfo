import { describe, expect, it } from "vitest";
import type { TodoList } from "./api";
import { fillText } from "@/lib/i18n/fill";
import { inEnglish, type Translate } from "@/lib/i18n/message";
import { translate } from "@/lib/i18n/translate";
import { timeLabel } from "./date";
import { byPriority, dayCount, dayCountText, dayLabel, dayOfMonthWord, doneItems, doneOfText, isDayKey, listFor, movedLabel, openItems, relativeName, repeatLabel, stripDays, upcoming, withList } from "./todoDisplay";

const t = inEnglish;
// The Bangla dictionary, the way useLocale().t reads it.
const bn: Translate = (key, values) => fillText(translate("bn", key), values ?? {});
const list = (id: string, date: string, items: [string, boolean][]): TodoList => ({ id, date, items: items.map(([text, completed], i) => ({ id: `${id}-${i}`, text, completed, priority: "MEDIUM", dueTime: null, movedFrom: null, repeat: null })) });

const TODAY = "2026-10-15";
const LISTS = [
  list("a", "2026-10-13", [["Old", true], ["Older", true]]),
  list("b", "2026-10-15", [["Pay the bill", false], ["Call Arif", false], ["Buy vegetables", true]]),
  list("c", "2026-10-16", [["Rent", false], ["Service the bike", false], ["Done already", true]]),
  list("d", "2026-10-18", [["Report", false]]),
  list("e", "2026-10-20", [["Doctor", false]]),
  list("f", "2026-10-23", [["Too far", false]]),
];

describe("days", () => {
  it("recognises a day key", () => {
    expect(isDayKey("2026-10-15")).toBe(true);
    expect(isDayKey("2026-13-45")).toBe(false);
    expect(isDayKey("yesterday")).toBe(false);
    expect(isDayKey(undefined)).toBe(false);
  });

  it("lays out the strip around the day picked", () => {
    const days = stripDays(TODAY);
    expect(days).toHaveLength(9);
    expect(days[0]).toBe("2026-10-13");
    expect(days[2]).toBe(TODAY);
    expect(days[8]).toBe("2026-10-21");
  });

  it("names a day relative to today", () => {
    expect(relativeName(TODAY, TODAY)).toBe("Today");
    expect(relativeName("2026-10-16", TODAY)).toBe("Tomorrow");
    expect(relativeName("2026-10-14", TODAY)).toBe("Yesterday");
    expect(relativeName("2026-10-20", TODAY)).toBeNull();
    expect(dayLabel(TODAY)).toBe("Thursday, 15 Oct");
    expect(dayLabel(TODAY, "en", "short")).toBe("Thu, 15 Oct");
  });

  // Bangla days come from fixed names and Bangla digits, never from English.
  it("names a day in Bangla", () => {
    expect(dayLabel(TODAY, "bn")).toBe("বৃহস্পতিবার, ১৫ অক্টো");
    expect(dayLabel(TODAY, "bn", "short")).toBe("বৃহস্পতি, ১৫ অক্টো");
  });
});

describe("a day's list", () => {
  it("splits open from done and counts them", () => {
    const today = listFor(LISTS, TODAY);
    expect(openItems(today).map((i) => i.text)).toEqual(["Pay the bill", "Call Arif"]);
    expect(doneItems(today).map((i) => i.text)).toEqual(["Buy vegetables"]);
    expect(dayCount(today)).toEqual({ total: 3, done: 1 });
    expect(dayCount(null)).toEqual({ total: 0, done: 0 });
    expect(listFor(LISTS, "2026-10-17")).toBeNull();
  });

  it("says the count the way the strip does", () => {
    expect(dayCountText({ total: 0, done: 0 }, t)).toBe("");
    expect(dayCountText({ total: 4, done: 4 }, t)).toBe("4 done");
    expect(dayCountText({ total: 5, done: 3 }, t)).toBe("3 of 5");
    expect(dayCountText({ total: 3, done: 0 }, t)).toBe("3 tasks");
    expect(dayCountText({ total: 1, done: 0 }, t)).toBe("1 task");
  });

  // "3 of 5" must keep its numbers in the right places in Bangla too.
  it("says the count as one Bangla sentence, in Bangla digits", () => {
    expect(dayCountText({ total: 5, done: 3 }, bn, "bn")).toBe("৫টির মধ্যে ৩টি");
    expect(dayCountText({ total: 4, done: 4 }, bn, "bn")).toBe("৪টি হয়েছে");
    expect(doneOfText(2, 5, t)).toBe("2 of 5 done");
    expect(doneOfText(2, 5, bn, "bn")).toBe("৫টির মধ্যে ২টি শেষ");
  });

  it("finds tomorrow and the open tasks later in the week", () => {
    const next = upcoming(LISTS, TODAY);
    expect(next.tomorrow?.id).toBe("c");
    expect(next.later.map((x) => `${x.day} ${x.item.text}`)).toEqual(["2026-10-18 Report", "2026-10-20 Doctor"]);
  });

  it("replaces or adds a list", () => {
    const changed = withList(LISTS, list("b", TODAY, [["Only one", false]]));
    expect(changed).toHaveLength(LISTS.length);
    expect(listFor(changed, TODAY)?.items).toHaveLength(1);
    expect(withList(LISTS, list("z", "2026-11-01", []))).toHaveLength(LISTS.length + 1);
  });
});

describe("a task's priority, time and repeating", () => {
  const task = (id: string, priority: "HIGH" | "MEDIUM" | "LOW", dueTime: string | null) => ({ id, text: id, completed: false, priority, dueTime, movedFrom: null, repeat: null });

  it("puts high priority first, then the earlier time, then untimed tasks", () => {
    const sorted = byPriority([task("low", "LOW", null), task("med-late", "MEDIUM", "18:00"), task("med-any", "MEDIUM", null), task("high", "HIGH", null), task("med-early", "MEDIUM", "09:30")]);
    expect(sorted.map((item) => item.id)).toEqual(["high", "med-early", "med-late", "med-any", "low"]);
  });

  it("writes times on a 12-hour clock", () => {
    expect(timeLabel("17:00", inEnglish)).toBe("5:00 pm");
    expect(timeLabel("00:05", inEnglish)).toBe("12:05 am");
    expect(timeLabel("12:30", inEnglish)).toBe("12:30 pm");
  });

  it("words the day of the month for each language", () => {
    expect(["1", "2", "3", "4", "11", "12", "13", "21", "22", "31"].map((day) => dayOfMonthWord(Number(day), "en"))).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "31st"]);
    expect(dayOfMonthWord(3, "bn")).toBe("৩");
  });

  it("reads a repeat rule as the board does", () => {
    expect(repeatLabel({ kind: "WEEKLY", weekdays: [5], monthDay: null }, inEnglish, "en")).toBe("Every Friday");
    expect(repeatLabel({ kind: "WEEKLY", weekdays: [3, 0], monthDay: null }, inEnglish, "en", true)).toBe("every Sun, Wed");
    expect(repeatLabel({ kind: "MONTHLY", weekdays: [], monthDay: 3 }, inEnglish, "en")).toBe("Monthly, on the 3rd");
    expect(repeatLabel({ kind: "MONTHLY", weekdays: [], monthDay: 3 }, inEnglish, "en", true)).toBe("every month on the 3rd");
    expect(repeatLabel({ kind: "DAILY", weekdays: [], monthDay: null }, inEnglish, "en")).toBe("Every day");
  });

  it("says where a moved task came from", () => {
    expect(movedLabel("2026-10-14", TODAY, inEnglish)).toBe("Moved from yesterday");
    expect(movedLabel("2026-10-12", TODAY, inEnglish)).toBe("Moved from Mon, 12 Oct");
    expect(movedLabel("2026-10-12", TODAY, bn, "bn")).toBe("সোম, ১২ অক্টো থেকে সরানো");
  });
});
