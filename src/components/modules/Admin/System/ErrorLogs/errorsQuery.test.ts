import { describe, expect, it } from "vitest";
import { DEFAULT_ERROR_FILTERS, errorsQueryString, narrowsErrors, readErrorFilters, withErrorFilters } from "./errorsQuery";

describe("readErrorFilters", () => {
  it("opens on what isn't fixed, from any time", () => {
    expect(readErrorFilters(new URLSearchParams())).toEqual(DEFAULT_ERROR_FILTERS);
    expect(DEFAULT_ERROR_FILTERS).toEqual({ status: "open", within: "all" });
  });

  it("reads the chips from the address bar", () => {
    const filters = readErrorFilters(new URLSearchParams("status=fixed&source=BACKEND_API&severity=HIGH&within=7d"));
    expect(filters).toEqual({ status: "fixed", source: "BACKEND_API", severity: "HIGH", within: "7d" });
  });

  it("reads a page's searchParams record, repeated keys included", () => {
    expect(readErrorFilters({ status: ["all", "fixed"], within: "24h" })).toEqual({ status: "all", source: undefined, severity: undefined, within: "24h" });
  });

  it("drops values the API would refuse", () => {
    const filters = readErrorFilters(new URLSearchParams("status=broken&source=PRINTER&severity=huge&within=forever"));
    expect(filters).toEqual(DEFAULT_ERROR_FILTERS);
  });
});

describe("withErrorFilters", () => {
  it("writes only what differs from the defaults", () => {
    expect(withErrorFilters(new URLSearchParams(), DEFAULT_ERROR_FILTERS).toString()).toBe("");
    expect(withErrorFilters(new URLSearchParams(), { status: "fixed", severity: "LOW", within: "24h" }).toString()).toBe("status=fixed&severity=LOW&within=24h");
  });

  it("keeps the page's other params and replaces the old chips", () => {
    const params = withErrorFilters(new URLSearchParams("from=dashboard&status=fixed&source=BACKEND_API"), { status: "all", within: "all" });
    expect(params.toString()).toBe("from=dashboard&status=all");
  });

  it("round-trips through the reader", () => {
    const filters = { status: "all" as const, source: "ADMIN_FRONTEND" as const, severity: "CRITICAL" as const, within: "30d" };
    expect(readErrorFilters(withErrorFilters(new URLSearchParams(), filters))).toEqual(filters);
  });
});

describe("narrowsErrors", () => {
  it("is false for the default view and true once a chip narrows it", () => {
    expect(narrowsErrors(DEFAULT_ERROR_FILTERS)).toBe(false);
    expect(narrowsErrors({ ...DEFAULT_ERROR_FILTERS, status: "fixed" })).toBe(false);
    expect(narrowsErrors({ ...DEFAULT_ERROR_FILTERS, within: "24h" })).toBe(true);
    expect(narrowsErrors({ ...DEFAULT_ERROR_FILTERS, source: "BACKGROUND_JOB" })).toBe(true);
  });
});

describe("errorsQueryString", () => {
  it("asks for the open errors of any time by default, the same scope as the tab's count", () => {
    expect(errorsQueryString()).toBe("page=1&limit=100&resolved=false&within=all");
  });

  it("builds the same string on the server and in the board", () => {
    const fromPage = errorsQueryString(readErrorFilters({ status: "fixed", within: "7d" }));
    const fromBoard = errorsQueryString(readErrorFilters(new URLSearchParams("status=fixed&within=7d")));
    expect(fromPage).toBe(fromBoard);
    expect(fromPage).toBe("page=1&limit=100&resolved=true&within=7d");
  });
});
