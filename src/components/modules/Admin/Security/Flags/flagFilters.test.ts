import { describe, expect, it } from "vitest";
import { DEFAULT_FLAG_FILTERS, readFlagFilters, showsFlag, withFlagFilters } from "./flagFilters";

describe("readFlagFilters", () => {
  it("opens on the flags that need a look, any severity", () => {
    expect(readFlagFilters(new URLSearchParams())).toEqual(DEFAULT_FLAG_FILTERS);
  });

  it("reads the view and every severity asked for", () => {
    expect(readFlagFilters(new URLSearchParams("status=closed&severity=HIGH&severity=CRITICAL"))).toEqual({ view: "closed", severities: ["HIGH", "CRITICAL"] });
  });

  it("drops what it doesn't know", () => {
    expect(readFlagFilters(new URLSearchParams("status=gone&severity=SCARY&severity=LOW"))).toEqual({ view: "open", severities: ["LOW"] });
  });
});

describe("withFlagFilters", () => {
  it("leaves the default view out of the URL", () => {
    expect(withFlagFilters(new URLSearchParams(), DEFAULT_FLAG_FILTERS).toString()).toBe("");
  });

  it("repeats severity and keeps the page's other params", () => {
    const params = withFlagFilters(new URLSearchParams("from=dashboard&severity=LOW"), { view: "all", severities: ["MEDIUM", "HIGH"] });
    expect(params.toString()).toBe("from=dashboard&status=all&severity=MEDIUM&severity=HIGH");
    expect(readFlagFilters(params)).toEqual({ view: "all", severities: ["MEDIUM", "HIGH"] });
  });
});

describe("showsFlag", () => {
  const open = { status: "OPEN" as const, severity: "HIGH" as const };
  const reviewing = { status: "REVIEWING" as const, severity: "LOW" as const };
  const resolved = { status: "RESOLVED" as const, severity: "CRITICAL" as const };

  it("keeps open and reviewed flags under Needs a look, closed ones under Closed", () => {
    expect(showsFlag(open, DEFAULT_FLAG_FILTERS)).toBe(true);
    expect(showsFlag(reviewing, DEFAULT_FLAG_FILTERS)).toBe(true);
    expect(showsFlag(resolved, DEFAULT_FLAG_FILTERS)).toBe(false);
    expect(showsFlag(resolved, { view: "closed", severities: [] })).toBe(true);
    expect(showsFlag(open, { view: "all", severities: [] })).toBe(true);
  });

  it("narrows by severity", () => {
    expect(showsFlag(open, { view: "open", severities: ["CRITICAL"] })).toBe(false);
    expect(showsFlag(open, { view: "open", severities: ["HIGH", "CRITICAL"] })).toBe(true);
  });
});
