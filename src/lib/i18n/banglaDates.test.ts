import { describe, expect, it } from "vitest";
import { BN_AM, BN_MONTHS_LONG, BN_MONTHS_SHORT, BN_PM, BN_WEEKDAYS_LONG, BN_WEEKDAYS_SHORT, banglaDayMonth, banglaMonthShort, banglaShortDay, toBanglaDigits } from "./banglaDates";
import { bnDictionary } from "./dictionary";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

describe("toBanglaDigits", () => {
  it("swaps only the digits", () => {
    expect(toBanglaDigits(30)).toBe("৩০");
    expect(toBanglaDigits("1–20 of 2026")).toBe("১–২০ of ২০২৬");
  });
});

describe("banglaDayMonth / banglaShortDay", () => {
  it("writes a day with Bangla digits and the board's short names", () => {
    expect(banglaDayMonth("2026-09-30")).toBe("৩০ সেপ্টে");
    expect(banglaShortDay("2026-10-01")).toBe("বৃহস্পতি, ১ অক্টো");
  });
});

describe("banglaMonthShort", () => {
  it("names the month of a month key or a day", () => {
    expect(banglaMonthShort("2026-10")).toBe("অক্টো");
    expect(banglaMonthShort("2026-01")).toBe("জানু");
    expect(banglaMonthShort("2026-09-30")).toBe("সেপ্টে");
  });

  it("gives back what is not a month", () => {
    expect(banglaMonthShort("2026-13")).toBe("2026-13");
    expect(banglaMonthShort("")).toBe("");
  });
});

describe("the Bangla names", () => {
  it("names every month and weekday", () => {
    expect(BN_MONTHS_SHORT).toHaveLength(12);
    expect(BN_MONTHS_LONG).toHaveLength(12);
    expect(BN_WEEKDAYS_SHORT).toHaveLength(7);
    expect(BN_WEEKDAYS_LONG).toHaveLength(7);
  });

  // A date written in Bangla and t("October") beside it must read one word.
  it("words the long names and am/pm as the dictionary does", () => {
    MONTHS.forEach((month, index) => expect(BN_MONTHS_LONG[index], month).toBe(bnDictionary[month]));
    WEEKDAYS.forEach((day, index) => expect(BN_WEEKDAYS_LONG[index], day).toBe(bnDictionary[day]));
    expect(BN_AM).toBe(bnDictionary.am);
    expect(BN_PM).toBe(bnDictionary.pm);
  });
});
