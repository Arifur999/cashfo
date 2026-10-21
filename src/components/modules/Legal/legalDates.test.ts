import { describe, expect, it } from "vitest";
import { inEnglish } from "@/lib/i18n/message";
import { translate } from "@/lib/i18n/translate";
import { effectiveDateText } from "./legalDates";

const bangla = (key: string) => translate("bn", key);

describe("effectiveDateText", () => {
  it("writes the day in English", () => {
    expect(effectiveDateText("2026-10-12T06:00:00.000Z", "en", inEnglish)).toBe("12 October 2026");
  });

  it("writes the month in Bangla words and the digits in Bangla", () => {
    expect(effectiveDateText("2026-10-12T06:00:00.000Z", "bn", bangla)).toBe("১২ অক্টোবর ২০২৬");
  });

  it("counts the day on the app's calendar, not UTC's", () => {
    // 20:00 UTC on the 11th is already 02:00 on the 12th in Dhaka.
    expect(effectiveDateText("2026-10-11T20:00:00.000Z", "en", inEnglish)).toBe("12 October 2026");
    expect(effectiveDateText("2026-12-31T19:30:00.000Z", "bn", bangla)).toBe("১ জানুয়ারি ২০২৭");
  });

  it("shows a dash for a date it can't read", () => {
    expect(effectiveDateText("not a date", "en", inEnglish)).toBe("—");
    expect(effectiveDateText("not a date", "bn", bangla)).toBe("—");
  });
});
