import { describe, expect, it } from "vitest";
import { cleanDayText, dayText, dayTextProblem, parseDayText } from "./dayText";

describe("dayText", () => {
  it("writes a day as DD/MM/YYYY", () => {
    expect(dayText("2026-10-28")).toBe("28/10/2026");
    expect(dayText("")).toBe("");
  });

  it("reads DD/MM/YYYY with any of the three separators", () => {
    expect(parseDayText("28/10/2026")).toBe("2026-10-28");
    expect(parseDayText("1.2.2026")).toBe("2026-02-01");
    expect(parseDayText(" 05-11-2026 ")).toBe("2026-11-05");
  });

  it("reads Bangla digits", () => {
    expect(parseDayText("২৮/১০/২০২৬")).toBe("2026-10-28");
  });

  it("refuses a day the calendar doesn't have", () => {
    expect(parseDayText("31/02/2026")).toBe("");
    expect(parseDayText("29/02/2025")).toBe("");
    expect(parseDayText("29/02/2028")).toBe("2028-02-29");
    expect(parseDayText("00/10/2026")).toBe("");
  });

  it("keeps digits and separators, and writes eight digits out", () => {
    expect(cleanDayText("28102026")).toBe("28/10/2026");
    expect(cleanDayText("28a/10")).toBe("28/10");
    expect(cleanDayText("২৮/১০")).toBe("28/10");
  });

  it("says why the box holds no day", () => {
    expect(dayTextProblem("")).toBe("empty");
    expect(dayTextProblem("28/10")).toBe("shape");
    expect(dayTextProblem("31/02/2026")).toBe("missing");
    expect(dayTextProblem("28/10/2026")).toBeNull();
  });
});
