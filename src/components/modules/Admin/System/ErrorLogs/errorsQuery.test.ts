import { describe, expect, it } from "vitest";
import { DEFAULT_ERROR_FILTERS, errorsQueryString, narrowsErrors, readErrorFilters, withErrorFilters, withoutNarrowing } from "./errorsQuery";

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
    const filters = readErrorFilters(new URLSearchParams("status=broken&source=PRINTER&severity=huge&within=forever&app=admin"));
    expect(filters).toEqual(DEFAULT_ERROR_FILTERS);
  });

  it("reads the customer app and a reference, trimmed", () => {
    expect(readErrorFilters(new URLSearchParams("app=customer&digest=%20%202338712345%20"))).toEqual({ ...DEFAULT_ERROR_FILTERS, app: "customer", digest: "2338712345" });
  });

  it("drops a blank reference or one longer than the API takes", () => {
    expect(readErrorFilters(new URLSearchParams("digest=%20%20")).digest).toBeUndefined();
    expect(readErrorFilters(new URLSearchParams(`digest=${"9".repeat(65)}`)).digest).toBeUndefined();
    expect(readErrorFilters(new URLSearchParams(`digest=${"9".repeat(64)}`)).digest).toBe("9".repeat(64));
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
    const filters = { status: "all" as const, source: "ADMIN_FRONTEND" as const, app: "customer" as const, severity: "CRITICAL" as const, within: "30d", digest: "2338712345" };
    expect(readErrorFilters(withErrorFilters(new URLSearchParams(), filters))).toEqual(filters);
  });
});

describe("narrowsErrors", () => {
  it("is false for the default view and true once a chip narrows it", () => {
    expect(narrowsErrors(DEFAULT_ERROR_FILTERS)).toBe(false);
    expect(narrowsErrors({ ...DEFAULT_ERROR_FILTERS, status: "fixed" })).toBe(false);
    expect(narrowsErrors({ ...DEFAULT_ERROR_FILTERS, within: "24h" })).toBe(true);
    expect(narrowsErrors({ ...DEFAULT_ERROR_FILTERS, source: "BACKGROUND_JOB" })).toBe(true);
    expect(narrowsErrors({ ...DEFAULT_ERROR_FILTERS, app: "customer" })).toBe(true);
    expect(narrowsErrors({ ...DEFAULT_ERROR_FILTERS, digest: "2338712345" })).toBe(true);
  });
});

describe("withoutNarrowing", () => {
  it("clears every narrowing chip and keeps Status", () => {
    const cleared = withoutNarrowing({ status: "fixed", source: "BACKEND_API", app: "customer", severity: "HIGH", within: "7d", digest: "123" });
    expect(cleared).toEqual({ status: "fixed", within: "all" });
    // Merged over the current chips, as the board merges a change.
    expect({ ...readErrorFilters(new URLSearchParams("source=BACKEND_API&app=customer&digest=1")), ...cleared }).toStrictEqual(cleared);
    expect(narrowsErrors(cleared)).toBe(false);
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

  it("passes the app and the reference on to the API", () => {
    expect(errorsQueryString({ ...DEFAULT_ERROR_FILTERS, app: "customer", digest: "2338712345" })).toBe("page=1&limit=100&resolved=false&app=customer&within=all&digest=2338712345");
  });
});
