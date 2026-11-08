import { describe, expect, it } from "vitest";
import { formatCompactAmount, formatCurrency, formatGrouped, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate as formatCustomerDate, timeLabel } from "@/lib/customer/date";
import { formatDate, formatRelativeDay } from "@/lib/date";
import { banglaDayMonth, banglaShortDay } from "./banglaDates";
import { formatCount, toLocaleDigits } from "./digits";
import { datePattern, fmtOf, langOf, redigit, resolveFmt, takaSign, weekdayOrder, weekStartOf, withLocale, writeDigits, type FormatPreferences } from "./formatPrefs";
import { inEnglish, plural } from "./message";

const NBSP = " ";
const DEFAULTS: FormatPreferences = { digitStyle: null, numberGrouping: "LAKH", dateStyle: "D_MMM_YYYY", weekStart: "SATURDAY" };
const at = "2026-10-02T06:00:00.000Z";

describe("resolveFmt", () => {
  it("reads no preferences as the language's own way", () => {
    expect(resolveFmt(null, "en")).toEqual({ locale: "en", digits: "latin", grouping: "lakh", dateStyle: "D_MMM_YYYY", weekStart: 6, round: false });
    expect(resolveFmt(undefined, "bn")).toEqual({ locale: "bn", digits: "bengali", grouping: "lakh", dateStyle: "D_MMM_YYYY", weekStart: 6, round: false });
  });

  // The defaults are the plain value itself, so nothing moves for a reader
  // who chose nothing.
  it("gives the plain value for the default preferences", () => {
    expect(resolveFmt(DEFAULTS, "en")).toBe(fmtOf("en"));
    expect(resolveFmt(DEFAULTS, "bn")).toBe(fmtOf("bn"));
  });

  it("follows each choice", () => {
    expect(resolveFmt({ ...DEFAULTS, digitStyle: "BENGALI" }, "en").digits).toBe("bengali");
    expect(resolveFmt({ ...DEFAULTS, digitStyle: "LATIN" }, "bn").digits).toBe("latin");
    expect(resolveFmt({ ...DEFAULTS, numberGrouping: "INTERNATIONAL" }, "en").grouping).toBe("international");
    expect(resolveFmt({ ...DEFAULTS, dateStyle: "DD_MM_YYYY" }, "en").dateStyle).toBe("DD_MM_YYYY");
    expect(resolveFmt({ ...DEFAULTS, weekStart: "SUNDAY" }, "en").weekStart).toBe(0);
    expect(resolveFmt({ ...DEFAULTS, weekStart: "MONDAY" }, "en").weekStart).toBe(1);
  });

  it("falls back for a missing or unknown field", () => {
    expect(resolveFmt({}, "bn")).toBe(fmtOf("bn"));
    expect(resolveFmt({ dateStyle: "WEIRD" as never, weekStart: "FRIDAY" as never }, "en")).toBe(fmtOf("en"));
  });
});

describe("takaSign", () => {
  it("follows the language, not the digits", () => {
    expect(takaSign("en")).toBe("TK");
    expect(takaSign("bn")).toBe("৳");
    expect(takaSign(resolveFmt({ digitStyle: "BENGALI" }, "en"))).toBe("TK");
    expect(takaSign(resolveFmt({ digitStyle: "LATIN" }, "bn"))).toBe("৳");
    expect(takaSign(null)).toBe("TK");
  });
});

describe("fmtOf, langOf, withLocale", () => {
  it("takes a plain Locale or a Fmt", () => {
    const fmt = resolveFmt({ digitStyle: "BENGALI" }, "en");
    expect(fmtOf(fmt)).toBe(fmt);
    expect(fmtOf("bn").digits).toBe("bengali");
    expect(fmtOf(undefined)).toBe(fmtOf("en"));
    expect(langOf(fmt)).toBe("en");
    expect(langOf("bn")).toBe("bn");
  });

  it("keeps the choices in another language", () => {
    const fmt = resolveFmt({ digitStyle: "LATIN", weekStart: "MONDAY" }, "en");
    expect(withLocale(fmt, "bn")).toEqual({ ...fmt, locale: "bn" });
    expect(withLocale("en", "bn")).toBe(fmtOf("bn"));
  });
});

describe("writeDigits", () => {
  it("follows the digits, not the language", () => {
    expect(writeDigits("1,234", "en")).toBe("1,234");
    expect(writeDigits("1,234", "bn")).toBe("১,২৩৪");
    expect(writeDigits("1,234", resolveFmt({ digitStyle: "BENGALI" }, "en"))).toBe("১,২৩৪");
    expect(writeDigits("1,234", resolveFmt({ digitStyle: "LATIN" }, "bn"))).toBe("1,234");
  });
});

describe("redigit", () => {
  it("writes a dictionary sentence's own digits in the reader's", () => {
    expect(redigit("গত ৬ মাস", "bn")).toBe("গত ৬ মাস");
    expect(redigit("গত ৬ মাস", resolveFmt({ digitStyle: "LATIN" }, "bn"))).toBe("গত 6 মাস");
    expect(redigit("Last 6 months", resolveFmt({ digitStyle: "BENGALI" }, "en"))).toBe("Last ৬ months");
    expect(redigit("Last 6 months", "en")).toBe("Last 6 months");
  });
});

describe("datePattern", () => {
  const dmy = resolveFmt({ dateStyle: "DD_MM_YYYY" }, "en");
  const iso = resolveFmt({ dateStyle: "YYYY_MM_DD" }, "en");

  it("leaves every pattern as written in the default style", () => {
    for (const pattern of ["d MMM yyyy", "MMM dd, yyyy", "d MMM", "EEEE, d MMMM yyyy"]) expect(datePattern(pattern, "en")).toBe(pattern);
  });

  it("rewrites a full date, keeping a weekday or a time around it", () => {
    expect(datePattern("d MMM yyyy", dmy)).toBe("dd/MM/yyyy");
    expect(datePattern("dd MMM yyyy", iso)).toBe("yyyy-MM-dd");
    expect(datePattern("MMM dd, yyyy", dmy)).toBe("dd/MM/yyyy");
    expect(datePattern("MMM dd, yyyy, hh:mm a", iso)).toBe("yyyy-MM-dd, hh:mm a");
    expect(datePattern("EEE, d MMM yyyy", dmy)).toBe("EEE, dd/MM/yyyy");
  });

  it("leaves short and long-month dates alone", () => {
    expect(datePattern("d MMM", dmy)).toBe("d MMM");
    expect(datePattern("EEEE, d MMMM yyyy", dmy)).toBe("EEEE, d MMMM yyyy");
    expect(datePattern("MMMM yyyy", iso)).toBe("MMMM yyyy");
    expect(datePattern("yyyy-MM-dd'T'HH:mm", dmy)).toBe("yyyy-MM-dd'T'HH:mm");
  });
});

describe("week start", () => {
  it("orders the weekdays from the reader's first day", () => {
    expect(weekStartOf("en")).toBe(6);
    expect(weekdayOrder("bn")).toEqual([6, 0, 1, 2, 3, 4, 5]);
    expect(weekdayOrder(resolveFmt({ weekStart: "SUNDAY" }, "en"))).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(weekdayOrder(resolveFmt({ weekStart: "MONDAY" }, "bn"))).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });
});

// Each central formatter with each preference.
describe("the formatters with a Fmt", () => {
  const bnDigitsEn = resolveFmt({ digitStyle: "BENGALI" }, "en");
  const latinBn = resolveFmt({ digitStyle: "LATIN" }, "bn");
  const intl = resolveFmt({ numberGrouping: "INTERNATIONAL" }, "en");
  const intlBn = resolveFmt({ numberGrouping: "INTERNATIONAL" }, "bn");
  const dmy = resolveFmt({ dateStyle: "DD_MM_YYYY" }, "en");
  const isoBn = resolveFmt({ dateStyle: "YYYY_MM_DD" }, "bn");

  it("writes a plain Locale and its default Fmt alike", () => {
    for (const locale of ["en", "bn"] as const) {
      const fmt = resolveFmt(DEFAULTS, locale);
      expect(formatCurrency(1250000, "BDT", fmt)).toBe(formatCurrency(1250000, "BDT", locale));
      expect(formatDate(at, "d MMM yyyy, h:mm aaa", "—", fmt)).toBe(formatDate(at, "d MMM yyyy, h:mm aaa", "—", locale));
      expect(formatCount(1234567, fmt)).toBe(formatCount(1234567, locale));
      expect(formatCompactAmount(150000, fmt)).toBe(formatCompactAmount(150000, locale));
    }
  });

  it("toLocaleDigits and formatCount follow the digits", () => {
    expect(toLocaleDigits("1–20", bnDigitsEn)).toBe("১–২০");
    expect(toLocaleDigits("1–20", latinBn)).toBe("1–20");
    expect(formatCount(1234, bnDigitsEn)).toBe("১,২৩৪");
    expect(formatCount(1234, latinBn)).toBe("1,234");
    // Counts stay in threes whatever the grouping.
    expect(formatCount(1234567, intl)).toBe("1,234,567");
  });

  it("formatCurrency follows the digits and the grouping", () => {
    expect(formatCurrency(1250000, "BDT", bnDigitsEn)).toBe(`TK${NBSP}১২,৫০,০০০`);
    expect(formatCurrency(1250000, "BDT", latinBn)).toBe(`৳${NBSP}12,50,000`);
    expect(formatCurrency(1250000, "BDT", intl)).toBe(`TK${NBSP}1,250,000`);
    expect(formatCurrency(1250000, "BDT", intlBn)).toBe(`৳${NBSP}১,২৫০,০০০`);
    // The paisa only when there are some, either way.
    expect(formatCurrency(2699.1, "BDT", intl)).toBe(`TK${NBSP}2,699.10`);
    expect(formatCurrency(-1500, "BDT", intl)).toBe(`-TK${NBSP}1,500`);
    // Other currencies keep their own grouping.
    expect(formatCurrency(1250000, "USD", "en")).toBe(`$${NBSP}1,250,000`);
  });

  it("formatSignedCurrency and formatGrouped follow them too", () => {
    expect(formatSignedCurrency(1250000, "BDT", intl)).toBe(`+ TK${NBSP}1,250,000`);
    expect(formatSignedCurrency(-52300, "BDT", bnDigitsEn)).toBe(`− TK${NBSP}৫২,৩০০`);
    expect(formatGrouped(1250000, "BDT", intl)).toBe("1,250,000");
    expect(formatGrouped(1250000, "BDT", latinBn)).toBe("12,50,000");
  });

  it("formatCompactAmount shortens in the reader's units", () => {
    expect(formatCompactAmount(150000, intl)).toBe("150K");
    expect(formatCompactAmount(1200000, intl)).toBe("1.2M");
    expect(formatCompactAmount(2500000000, intl)).toBe("2.5B");
    expect(formatCompactAmount(1200000, intlBn)).toBe("১.২ মি");
    expect(formatCompactAmount(150000, latinBn)).toBe("1.5 লা");
  });

  it("formatDate follows the date style and the digits", () => {
    expect(formatDate(at, "d MMM yyyy", "—", dmy)).toBe("02/10/2026");
    expect(formatDate(at, "d MMM yyyy", "—", isoBn)).toBe("২০২৬-১০-০২");
    expect(formatDate(at, "EEE, d MMM yyyy", "—", dmy)).toBe("Fri, 02/10/2026");
    expect(formatDate(at, "d MMM yyyy", "—", bnDigitsEn)).toBe("২ Oct ২০২৬");
    expect(formatDate(at, "d MMM yyyy, h:mm aaa", "—", latinBn)).toBe("2 অক্টো 2026, 12:00 অপরাহ্ণ");
    // A short date keeps its words.
    expect(formatDate(at, "d MMM", "—", dmy)).toBe("2 Oct");
    expect(formatCustomerDate(at, undefined, dmy)).toBe("02/10/2026");
  });

  it("the relative dates and the Bangla day helpers follow the digits", () => {
    const now = new Date("2026-10-28T06:00:00.000Z");
    expect(formatRelativeDay("2025-06-02T06:00:00.000Z", { now, locale: dmy })).toBe("02/06/2025");
    expect(formatRelativeDay(at, { now, locale: latinBn })).toBe("2 অক্টো");
    expect(banglaDayMonth("2026-10-02")).toBe("২ অক্টো");
    expect(banglaDayMonth("2026-10-02", latinBn)).toBe("2 অক্টো");
    expect(banglaShortDay("2026-10-02", latinBn)).toBe("শুক্র, 2 অক্টো");
    expect(timeLabel("17:30", inEnglish, bnDigitsEn)).toBe("৫:৩০ pm");
    expect(plural(inEnglish, 3, "{count} entry", "{count} entries", undefined, bnDigitsEn)).toBe("৩ entries");
  });
});

describe("rounded amounts", () => {
  it("are whole taka for a reader who asked, to the paisa otherwise", async () => {
    const { formatCurrency } = await import("@/lib/customer/currency");
    expect(formatCurrency(1840.75, "BDT", resolveFmt({ roundAmounts: true }, "en"))).toBe(formatCurrency(1841, "BDT", "en"));
    expect(formatCurrency(1840.75, "BDT", resolveFmt({ roundAmounts: false }, "en"))).not.toBe(formatCurrency(1841, "BDT", "en"));
  });
});
