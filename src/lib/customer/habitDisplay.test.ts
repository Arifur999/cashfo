import { describe, expect, it } from "vitest";
import { fillText } from "@/lib/i18n/fill";
import type { Translate } from "@/lib/i18n/message";
import { translate } from "@/lib/i18n/translate";
import type { Habit, HabitMonthLog } from "./api";
import {
  actionError,
  amountLabel,
  bestStreak,
  completionRate,
  countStep,
  countTone,
  dailyLogMonths,
  dayMark,
  dayText,
  habitStart,
  hijriDate,
  hijriParts,
  instantText,
  isPlannedOn,
  lastDays,
  latinDigits,
  monthGrid,
  monthsBetween,
  monthShort,
  nextRamadan,
  parseAmount,
  perfectDays,
  plannedCount,
  quickAmounts,
  ruleLabel,
  streakText,
  streakWord,
  unitKey,
  unitLabel,
  WEEKDAY_INITIAL,
  WEEKDAY_MIN,
  weekOf,
} from "./habitDisplay";

// The Bangla dictionary, the way useLocale().t reads it.
const bn: Translate = (key, values) => fillText(translate("bn", key), values ?? {});

const habit = (overrides: Partial<Habit>): Habit => ({
  id: "h",
  userId: "u",
  name: "Habit",
  category: "Others",
  icon: "droplet",
  color: "blue",
  frequencyType: "DAILY",
  weeklyDays: [],
  weeklyCount: null,
  targetValue: null,
  unit: null,
  isArchived: false,
  createdAt: "2026-08-03T00:00:00.000Z",
  updatedAt: "2026-08-03T00:00:00.000Z",
  ...overrides,
});
const log = (habitId: string, date: string, completed = true): HabitMonthLog => ({ habitId, date: `${date}T00:00:00.000Z`, completed, value: null });

describe("weeks and days", () => {
  it("runs the week Saturday to Friday", () => {
    expect(weekOf("2026-10-02")).toEqual(["2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
    expect(weekOf("2026-09-26")[0]).toBe("2026-09-26");
    expect(lastDays("2026-10-02", 3)).toEqual(["2026-09-30", "2026-10-01", "2026-10-02"]);
  });

  it("knows which days a habit is planned for", () => {
    const sunToThu = habit({ frequencyType: "WEEKLY_DAYS", weeklyDays: [0, 1, 2, 3, 4] });
    expect(isPlannedOn(sunToThu, "2026-10-02")).toBe(false); // Friday
    expect(isPlannedOn(sunToThu, "2026-10-04")).toBe(true); // Sunday
    expect(isPlannedOn(habit({ frequencyType: "WEEKLY_COUNT", weeklyCount: 3 }), "2026-10-02")).toBe(true);
  });

  it("lays a month out in whole Saturday-first weeks", () => {
    const grid = monthGrid(2026, 9);
    // September 2026 starts on a Tuesday: three blanks first.
    expect(grid.slice(0, 4)).toEqual([null, null, null, "2026-09-01"]);
    expect(grid.length % 7).toBe(0);
    expect(grid.filter(Boolean)).toHaveLength(30);
  });
});

describe("ruleLabel", () => {
  it("reads a range, a list, a count and an amount", () => {
    expect(ruleLabel(habit({ frequencyType: "WEEKLY_DAYS", weeklyDays: [0, 1, 2, 3, 4] }))).toEqual({ days: "Sunday to Thursday", amount: null });
    expect(ruleLabel(habit({ frequencyType: "WEEKLY_DAYS", weeklyDays: [6, 0, 1] })).days).toBe("Saturday to Monday");
    expect(ruleLabel(habit({ frequencyType: "WEEKLY_DAYS", weeklyDays: [1, 3] })).days).toBe("Mon, Wed");
    expect(ruleLabel(habit({ frequencyType: "WEEKLY_COUNT", weeklyCount: 3, targetValue: 30, unit: "minutes" }))).toEqual({ days: "3 times a week", amount: "30 minutes" });
    expect(ruleLabel(habit({ targetValue: 8, unit: "glasses" }))).toEqual({ days: "Every day", amount: "8 glasses" });
    expect(ruleLabel(habit({ frequencyType: "WEEKLY_COUNT", weeklyCount: 1 })).days).toBe("1 time a week");
  });

  // Each part through its own key, so nothing English is left in Bangla.
  it("reads every rule and unit in Bangla", () => {
    expect(ruleLabel(habit({ frequencyType: "WEEKLY_DAYS", weeklyDays: [0, 1, 2, 3, 4] }), bn, "bn").days).toBe("রবিবার থেকে বৃহস্পতিবার");
    expect(ruleLabel(habit({ frequencyType: "WEEKLY_DAYS", weeklyDays: [1, 3] }), bn, "bn").days).toBe("সোম, বুধ");
    expect(ruleLabel(habit({ frequencyType: "WEEKLY_COUNT", weeklyCount: 3, targetValue: 30, unit: "minutes" }), bn, "bn")).toEqual({ days: "সপ্তাহে ৩ বার", amount: "৩০ মিনিট" });
    expect(ruleLabel(habit({ targetValue: 10000, unit: "steps" }), bn, "bn").amount).toBe("১০,০০০ কদম");
    // A unit typed by hand stays as typed.
    expect(amountLabel(2, "rakat", bn, "bn")).toBe("২ rakat");
  });

  it("saves a chip's unit as its key, whatever language it was typed in", () => {
    expect(unitKey("মিনিট", bn)).toBe("minutes");
    expect(unitKey(" minutes ")).toBe("minutes");
    expect(unitKey("rakat", bn)).toBe("rakat");
    expect(unitLabel("glasses", bn)).toBe("গ্লাস");
    expect(unitLabel(null)).toBe("");
  });
});

describe("days in words", () => {
  it("writes a day in English", () => {
    expect(dayText("2026-10-21", "en", "full")).toBe("Wednesday, 21 October 2026");
    expect(dayText("2026-10-21", "en")).toBe("Wed, 21 Oct");
    expect(dayText("2026-10-21", "en", "dayMonthYear")).toBe("21 Oct 2026");
  });

  // The weekday and month in Bangla, with Bangla digits: no English left.
  it("writes a day in Bangla", () => {
    expect(dayText("2026-10-21", "bn", "full")).toBe("বুধবার, ২১ অক্টোবর ২০২৬");
    expect(dayText("2026-10-21", "bn", "long")).toBe("বুধবার, ২১ অক্টো");
    expect(dayText("2026-10-21", "bn")).toBe("বুধ, ২১ অক্টো");
    expect(dayText("2026-10-21", "bn", "dayMonth")).toBe("২১ অক্টো");
    expect(dayText("2026-10-21", "bn", "weekday")).toBe("বুধবার");
    expect(monthShort(10, "bn")).toBe("অক্টো");
    expect(monthShort(4, "en")).toBe("Apr");
  });

  it("reads a moment as its day in Dhaka", () => {
    // 20:00 UTC on the 14th is already the 15th in Dhaka.
    expect(instantText("2026-10-14T20:00:00.000Z", "en")).toBe("15 Oct");
  });

  // A cut word gave Friday and Saturday the same "শ".
  it("tells every weekday apart in its short heads", () => {
    const initials = WEEKDAY_INITIAL.map((key) => bn(key));
    expect(new Set(initials).size).toBe(7);
    expect(new Set(WEEKDAY_MIN.map((key) => bn(key))).size).toBe(7);
  });
});

describe("counted amounts", () => {
  it("moves a small goal by one and a large one by a round tenth", () => {
    expect(countStep(1)).toBe(1);
    expect(countStep(8)).toBe(1);
    expect(countStep(30)).toBe(2);
    expect(countStep(60)).toBe(5);
    expect(countStep(10000)).toBe(1000);
  });

  it("offers two round amounts to add", () => {
    expect(quickAmounts(30)).toEqual([5, 10]);
    expect(quickAmounts(8)).toEqual([1, 2]);
    expect(quickAmounts(10000)).toEqual([1000, 2000]);
    expect(quickAmounts(1)).toEqual([]);
  });

  it("reads an amount typed in either language's digits", () => {
    expect(latinDigits("১২৩")).toBe("123");
    expect(parseAmount("৩০")).toBe(30);
    expect(parseAmount(" 45 ")).toBe(45);
    expect(parseAmount("4.5")).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("9999999")).toBeNull();
  });

  it("says a streak with its number", () => {
    expect(streakText(habit({}), 5)).toBe("5 days");
    expect(streakText(habit({ frequencyType: "WEEKLY_COUNT" }), 1, undefined, "en", true)).toBe("1 week in a row");
    expect(streakText(habit({}), 5, bn, "bn", true)).toBe("টানা ৫ দিন");
  });
});

describe("actionError", () => {
  it("words a refusal the dictionaries know, and keeps the rest", () => {
    expect(actionError(undefined, "Failed to check in", bn, "bn")).toBe("চেক-ইন করতে ব্যর্থ");
    expect(actionError('"Taraweeh" is already on this sheet', "Failed", bn, "bn")).toBe('"Taraweeh" এই শিটে আগে থেকেই আছে');
    expect(actionError("A sheet can have at most 20 habits", "Failed", bn, "bn")).toBe("একটি শিটে সর্বোচ্চ ২০টি সারি রাখা যায়");
    expect(actionError("Network Error", "Failed")).toBe("Network Error");
  });

  it("words the server's limits and its request limit", () => {
    expect(actionError("ThrottlerException: Too Many Requests", "Failed")).toBe("Too many changes at once. Wait a minute and try again.");
    expect(actionError("ThrottlerException: Too Many Requests", "Failed", bn, "bn")).toBe("একসাথে অনেক বেশি পরিবর্তন হয়েছে। এক মিনিট অপেক্ষা করে আবার চেষ্টা করুন।");
    expect(actionError("You can keep up to 100 challenges", "Failed", bn, "bn")).toBe("সর্বোচ্চ ১০০টি চ্যালেঞ্জ রাখা যায়");
    expect(actionError("You can keep up to 500 books", "Failed", bn, "bn")).toBe("সর্বোচ্চ ৫০০টি বই রাখা যায়");
    expect(actionError("You can keep up to 200 skills", "Failed", bn, "bn")).toBe("সর্বোচ্চ ২০০টি দক্ষতা রাখা যায়");
    expect(actionError("You can keep at most 1000 to-do lists. Delete some old ones first.", "Failed", bn, "bn")).toBe("সর্বোচ্চ ১,০০০টি করণীয় তালিকা রাখা যায়। আগে কিছু পুরোনো তালিকা মুছে ফেলুন।");
    expect(actionError("You can keep at most 100 repeating tasks.", "Failed", bn, "bn")).toBe("সর্বোচ্চ ১০০টি পুনরাবৃত্ত কাজ রাখা যায়।");
    expect(actionError("You can keep up to 1000 books", "Failed")).toBe("You can keep up to 1,000 books");
  });
});

describe("the months Daily habits reads", () => {
  it("lists every month between two, across a year", () => {
    expect(monthsBetween("2026-11", "2027-02")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(monthsBetween("2026-10", "2026-10")).toEqual(["2026-10"]);
    expect(monthsBetween("2026-10", "2026-09")).toEqual([]);
  });

  it("reads the day's week and 30 days, and today's 60 days for the best streak", () => {
    // Wednesday 21 October: the month before, and back to 23 August for the best streak.
    expect(dailyLogMonths("2026-10-21", "2026-10-21")).toEqual({ dayMonths: ["2026-09", "2026-10"], bestMonths: ["2026-08", "2026-09", "2026-10"] });
    // The week of 30 September runs to Friday 2 October, a day already lived.
    expect(dailyLogMonths("2026-09-30", "2026-10-21").dayMonths).toEqual(["2026-08", "2026-09", "2026-10"]);
    // The week of Saturday 31 October runs into November, which hasn't come.
    expect(dailyLogMonths("2026-10-31", "2026-10-31").dayMonths).toEqual(["2026-09", "2026-10"]);
    // 30 days back from 1 March reach 31 January.
    expect(dailyLogMonths("2026-03-01", "2026-03-01").dayMonths).toEqual(["2026-01", "2026-02", "2026-03"]);
    // An earlier day shown still counts the best streak back from today.
    expect(dailyLogMonths("2026-05-10", "2026-10-21").bestMonths).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(dailyLogMonths("2027-01-05", "2027-01-05")).toEqual({ dayMonths: ["2026-12", "2027-01"], bestMonths: ["2026-11", "2026-12", "2027-01"] });
  });
});

describe("rates, marks and streaks", () => {
  const days = lastDays("2026-10-02", 7);
  const daily = habit({ id: "d" });
  const logs = [log("d", "2026-09-26"), log("d", "2026-09-29"), log("d", "2026-09-30"), log("d", "2026-10-01"), log("d", "2026-10-02")];

  it("rates against the planned days, not 30", () => {
    expect(plannedCount(daily, days)).toBe(7);
    expect(plannedCount(habit({ frequencyType: "WEEKLY_COUNT", weeklyCount: 3 }), days)).toBe(3);
    expect(completionRate(daily, logs, days)).toBe(71);
    expect(completionRate(habit({ id: "x", frequencyType: "WEEKLY_DAYS", weeklyDays: [] }), logs, days)).toBeNull();
  });

  it("marks each day", () => {
    expect(dayMark(daily, logs, "2026-09-26", "2026-10-02")).toBe("done");
    expect(dayMark(daily, logs, "2026-09-27", "2026-10-02")).toBe("missed");
    expect(dayMark(daily, [], "2026-10-02", "2026-10-02")).toBe("open");
    expect(dayMark(daily, [], "2026-10-03", "2026-10-02")).toBe("future");
    expect(dayMark(habit({ id: "d", frequencyType: "WEEKLY_DAYS", weeklyDays: [0, 1, 2, 3, 4] }), [], "2026-10-02", "2026-10-02")).toBe("rest");
    expect(dayMark(daily, [], "2026-08-01", "2026-10-02")).toBe("rest"); // before it existed
    expect(habitStart(daily, [log("d", "2026-07-20")])).toBe("2026-07-20");
    expect(dayMark(daily, [log("d", "2026-07-20")], "2026-07-21", "2026-10-02")).toBe("missed");
  });

  it("finds the best streak, skipping rest days", () => {
    expect(bestStreak(daily, logs, "2026-10-02", 10)).toBe(4);
    const weekdays = habit({ id: "w", frequencyType: "WEEKLY_DAYS", weeklyDays: [0, 1, 2, 3, 4] });
    const run = [log("w", "2026-09-30"), log("w", "2026-10-01"), log("w", "2026-10-04")]; // Fri 2, Sat 3 rest
    expect(bestStreak(weekdays, run, "2026-10-04", 10)).toBe(3);
  });

  it("counts the weeks a few-times-a-week habit met its count", () => {
    const twice = habit({ id: "c", frequencyType: "WEEKLY_COUNT", weeklyCount: 2 });
    // Two in each of the weeks of 12 and 19 Sep, one so far this week.
    const run = ["2026-09-12", "2026-09-14", "2026-09-20", "2026-09-22", "2026-09-27"].map((day) => log("c", day));
    expect(bestStreak(twice, run, "2026-10-02", 28)).toBe(2);
    expect(bestStreak(twice, [...run, log("c", "2026-10-01")], "2026-10-02", 28)).toBe(3);
    expect(streakWord(twice, 1)).toBe("week");
    expect(streakWord(habit({ id: "d" }), 3, true)).toBe("days in a row");
  });

  it("counts perfect days", () => {
    const two = [daily, habit({ id: "e" })];
    const both = [...logs, log("e", "2026-10-01"), log("e", "2026-10-02")];
    expect(perfectDays(two, both, days)).toBe(2);
  });

  it("colours a counted day", () => {
    expect(countTone(4, 8)).toBe("low");
    expect(countTone(6, 8)).toBe("near");
    expect(countTone(8, 8)).toBe("full");
  });
});

describe("Hijri", () => {
  it("writes the date in both languages without the era word", () => {
    expect(hijriDate("2026-10-02", "en")).toMatch(/^\d+ .+ 1448 AH$/);
    expect(hijriDate("2026-10-02", "bn")).toMatch(/হিজরি$/);
    expect(hijriParts("2026-10-02")).toMatchObject({ year: 1448 });
  });

  it("counts the days to the next Ramadan", () => {
    const next = nextRamadan("2026-10-02");
    expect(next.year).toBe(1448);
    expect(next.daysToGo).toBeGreaterThan(100);
    expect(next.daysToGo).toBeLessThan(160);
    expect(hijriParts(next.startsOn)).toMatchObject({ month: 9, day: 1 });
    expect(nextRamadan(next.startsOn).daysToGo).toBe(0);
  });
});
