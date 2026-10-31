import { describe, expect, it } from "vitest";
import { inEnglish } from "@/lib/i18n/message";
import { groupPeriodFrom, monthsIn, periodLabel, periodQuery, periodRange, weekOf } from "./groupPeriod";

const ALL = ["today", "week", "month", "year", "all", "custom"] as const;
const t = inEnglish;

describe("group period", () => {
  it("reads the address, keeping only the page's own choices", () => {
    expect(groupPeriodFrom({ period: "year" }, ALL)).toEqual({ kind: "year" });
    expect(groupPeriodFrom({ period: "today" }, ["month", "year", "custom"])).toEqual({ kind: "month" });
    expect(groupPeriodFrom({ period: "custom", from: "2026-09" }, ALL)).toEqual({ kind: "custom", from: "2026-09", to: "2026-09" });
    expect(groupPeriodFrom({ period: "custom", from: "2026-09", to: "2026-06" }, ALL)).toEqual({ kind: "custom", from: "2026-06", to: "2026-09" });
    expect(groupPeriodFrom({ period: "custom", from: "Sep" }, ALL, { kind: "all" })).toEqual({ kind: "all" });
  });

  it("writes it back, leaving the default month out", () => {
    expect(periodQuery({ kind: "month" })).toEqual({});
    expect(periodQuery({ kind: "custom", from: "2026-06", to: "2026-09" })).toEqual({ period: "custom", from: "2026-06", to: "2026-09" });
    expect(periodQuery({ kind: "custom", from: "2026-09", to: "2026-09" })).toEqual({ period: "custom", from: "2026-09" });
  });

  it("runs a week Saturday to Friday", () => {
    // 30 Oct 2026 is a Friday.
    expect(weekOf("2026-10-30")).toEqual({ from: "2026-10-24", to: "2026-10-30" });
    expect(weekOf("2026-10-24")).toEqual({ from: "2026-10-24", to: "2026-10-30" });
  });

  it("covers the group's own months", () => {
    expect(periodRange({ kind: "month" }, "2026-10-30")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(periodRange({ kind: "month" }, "2026-10-05", 10)).toEqual({ from: "2026-09-10", to: "2026-10-09" });
    expect(periodRange({ kind: "year" }, "2026-10-30")).toEqual({ from: "2026-01-01", to: "2026-12-31" });
    expect(periodRange({ kind: "custom", from: "2026-06", to: "2026-09" }, "2026-10-30")).toEqual({ from: "2026-06-01", to: "2026-09-30" });
    expect(periodRange({ kind: "all" }, "2026-10-30", 1, "2025-04-12")).toEqual({ from: "2025-04-12", to: "2026-10-31" });
    expect(monthsIn({ from: "2026-06-01", to: "2026-09-30" })).toEqual(["2026-06", "2026-07", "2026-08", "2026-09"]);
  });

  it("names it the way the boards do", () => {
    expect(periodLabel({ kind: "today" }, "2026-10-30", 1, t, "en")).toBe("Today · 30 Oct 2026");
    expect(periodLabel({ kind: "week" }, "2026-10-30", 1, t, "en")).toBe("This week · 24–30 Oct 2026");
    expect(periodLabel({ kind: "month" }, "2026-10-30", 1, t, "en")).toBe("October 2026");
    expect(periodLabel({ kind: "year" }, "2026-10-30", 1, t, "en")).toBe("This year · 2026");
    expect(periodLabel({ kind: "custom", from: "2026-09", to: "2026-09" }, "2026-10-30", 1, t, "en")).toBe("Sep 2026");
    expect(periodLabel({ kind: "custom", from: "2026-06", to: "2026-09" }, "2026-10-30", 1, t, "en")).toBe("Jun – Sep 2026");
  });
});
