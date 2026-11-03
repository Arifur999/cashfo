import { describe, expect, it } from "vitest";
import { monthLabel } from "@/components/modules/Customer/Budget/MonthSwitcher";
import { formatDay } from "@/lib/date";
import { resolveFmt } from "@/lib/i18n/formatPrefs";
import { inEnglish } from "@/lib/i18n/message";
import type { HabitMonthLog } from "./api";
import { booksDate, booksRange } from "./booksDisplay";
import { dayLabel, rangeLabel as groupRange, weekdayLabel } from "./groupDisplay";
import { dayText, hijriDate, monthGrid, plannedCount, weekOf } from "./habitDisplay";
import { doneThisWeek } from "./habitsHome";
import { monthName, percentLabel, rangeLabel } from "./insights";
import { hijriRange } from "./namazDisplay";
import { friendDay } from "./referralDisplay";
import { dayOfMonthWord } from "./todoDisplay";
import { dayHeading, recordTimeLabel, transactionDayLabel } from "./transactionRows";

// The customer app's own date and week helpers with the reader's Settings
// choices (lib/i18n/formatPrefs.ts). A plain Locale keeps what they always
// wrote; the tests next to each helper pin that down.
const bnDigitsEn = resolveFmt({ digitStyle: "BENGALI" }, "en");
const latinBn = resolveFmt({ digitStyle: "LATIN" }, "bn");
const dmy = resolveFmt({ dateStyle: "DD_MM_YYYY" }, "en");
const isoBn = resolveFmt({ dateStyle: "YYYY_MM_DD", digitStyle: "LATIN" }, "bn");
const sunday = resolveFmt({ weekStart: "SUNDAY" }, "en");
const monday = resolveFmt({ weekStart: "MONDAY" }, "en");

describe("formatDay", () => {
  it("writes a calendar day as a plain Locale always did", () => {
    expect(formatDay("2026-10-02", "EEE, d MMM yyyy", "en")).toBe("Fri, 2 Oct 2026");
    expect(formatDay("2026-10-02", "EEE, d MMM yyyy", "bn")).toBe("শুক্র, ২ অক্টো ২০২৬");
    expect(formatDay("not a day", "d MMM", "en")).toBe("not a day");
  });

  it("follows the digits and the date style", () => {
    expect(formatDay("2026-10-02", "EEE, d MMM yyyy", dmy)).toBe("Fri, 02/10/2026");
    expect(formatDay("2026-10-02", "d MMM yyyy", isoBn)).toBe("2026-10-02");
    expect(formatDay("2026-10-02", "d MMM", latinBn)).toBe("2 অক্টো");
    expect(formatDay("2026-10-02", "d MMM", bnDigitsEn)).toBe("২ Oct");
  });
});

describe("habit days and weeks", () => {
  it("dayText keeps its styles and follows the choices", () => {
    expect(dayText("2026-10-02", "en", "full")).toBe("Friday, 2 October 2026");
    expect(dayText("2026-10-02", "bn", "long")).toBe("শুক্রবার, ২ অক্টো");
    expect(dayText("2026-10-02", dmy, "shortYear")).toBe("Fri, 02/10/2026");
    expect(dayText("2026-10-02", latinBn, "short")).toBe("শুক্র, 2 অক্টো");
  });

  it("weekOf starts the week on the reader's day", () => {
    // 2026-10-28 is a Wednesday.
    expect(weekOf("2026-10-28")[0]).toBe("2026-10-24");
    expect(weekOf("2026-10-28", "bn")[0]).toBe("2026-10-24");
    expect(weekOf("2026-10-28", sunday)[0]).toBe("2026-10-25");
    expect(weekOf("2026-10-28", monday)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
  });

  it("monthGrid leads with the reader's first day", () => {
    // 1 October 2026 is a Thursday.
    expect(monthGrid(2026, 10).indexOf("2026-10-01")).toBe(5);
    expect(monthGrid(2026, 10, sunday).indexOf("2026-10-01")).toBe(4);
    expect(monthGrid(2026, 10, monday).indexOf("2026-10-01")).toBe(3);
  });

  it("a few times a week counts the reader's weeks", () => {
    const habit = { frequencyType: "WEEKLY_COUNT" as const, weeklyDays: [], weeklyCount: 2 };
    // Fri 23 and Sat 24 Oct fall in two Saturday weeks, but in one Monday week.
    expect(plannedCount(habit, ["2026-10-23", "2026-10-24"])).toBe(4);
    expect(plannedCount(habit, ["2026-10-23", "2026-10-24"], monday)).toBe(2);
    const logs = [{ habitId: "h", date: "2026-10-25T00:00:00.000Z", completed: true }] as HabitMonthLog[];
    expect(doneThisWeek("h", logs, "2026-10-26")).toBe(1);
    expect(doneThisWeek("h", logs, "2026-10-26", monday)).toBe(0);
  });

  it("the Hijri date follows the digits", () => {
    expect(hijriDate("2026-10-02", latinBn)).toMatch(/^\d+ .+ \d+ হিজরি$/);
    expect(hijriDate("2026-10-02", bnDigitsEn)).toMatch(/^[০-৯]+ .+ [০-৯]+ AH$/);
    expect(hijriRange(2026, 10, latinBn)).toMatch(/\d{4}$/);
  });
});

describe("list days in the date style", () => {
  it("transactions", () => {
    expect(transactionDayLabel("2026-10-02", "bn")).toBe("শুক্র, ২ অক্টো ২০২৬");
    expect(transactionDayLabel("2026-10-02", dmy)).toBe("Fri, 02/10/2026");
    expect(dayHeading("2026-10-02", "2026-10-28", inEnglish, "en")).toBe("Fri, 2 Oct");
    // A numbered style always names the year.
    expect(dayHeading("2026-10-02", "2026-10-28", inEnglish, dmy)).toBe("Fri, 02/10/2026");
    expect(recordTimeLabel("2026-10-02T11:30:00.000Z", dmy, inEnglish)).toBe("02/10/2026, 5:30 PM");
    expect(recordTimeLabel("2026-10-02T11:30:00.000Z", latinBn, (key) => (key === "pm" ? "অপরাহ্ণ" : key))).toBe("2 অক্টো 2026, 5:30 অপরাহ্ণ");
  });

  it("books, groups and referrals", () => {
    expect(booksDate("2026-06-03T12:00:00.000Z", "en", { today: "2026-10-28" })).toBe("3 Jun");
    expect(booksDate("2026-06-03T12:00:00.000Z", dmy, { today: "2026-10-28", weekday: true })).toBe("Wed, 03/06/2026");
    expect(booksRange("2026-09-01", "2026-10-02", "en")).toBe("1 Sep – 2 Oct 2026");
    expect(booksRange("2026-09-01", "2026-10-02", dmy)).toBe("01/09/2026 – 02/10/2026");
    expect(dayLabel("2026-10-05", "bn", true)).toBe("৫ অক্টো ২০২৬");
    expect(dayLabel("2026-10-05", isoBn, true)).toBe("2026-10-05");
    expect(groupRange({ from: "2026-10-01", to: "2026-10-31" }, dmy)).toBe("01/10/2026 – 31/10/2026");
    expect(weekdayLabel("2026-09-30", "en")).toBe("Wed, 30 Sep 2026");
    expect(weekdayLabel("2026-09-30", bnDigitsEn)).toBe("Wed, ৩০ Sep ২০২৬");
    expect(friendDay("2025-08-14", "2026-10-28", dmy)).toBe("14/08/2025");
  });
});

describe("headings follow the digits only", () => {
  it("months, ranges and percents", () => {
    expect(monthName("2026-10", bnDigitsEn, "long", true)).toBe("October ২০২৬");
    expect(monthName("2026-10", latinBn, "long", true)).toBe("অক্টোবর 2026");
    expect(rangeLabel("2026-10-01", "2026-10-21", latinBn)).toBe("1–21 অক্টোবর 2026");
    expect(percentLabel(42, bnDigitsEn)).toBe("৪২%");
    expect(monthLabel(10, 2026, "bn")).toBe("অক্টোবর ২০২৬");
    expect(monthLabel(10, 2026, latinBn)).toBe("অক্টোবর 2026");
    expect(dayOfMonthWord(3, "en")).toBe("3rd");
    expect(dayOfMonthWord(3, bnDigitsEn)).toBe("৩rd");
    expect(dayOfMonthWord(3, latinBn)).toBe("3");
  });
});
