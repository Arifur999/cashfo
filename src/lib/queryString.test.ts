import { describe, expect, it } from "vitest";
import { buildListQueryString, buildQueryString } from "./queryString";

describe("buildQueryString", () => {
  it("keeps only whitelisted keys (the API rejects unknown params)", () => {
    expect(buildQueryString({ status: "OPEN", utm_source: "mail" }, ["status"])).toBe("status=OPEN");
  });

  it("keeps repeated keys and drops empty values", () => {
    const params = new URLSearchParams("gateway=BKASH&gateway=NAGAD&search=");
    expect(buildQueryString(params, ["gateway", "search"])).toBe("gateway=BKASH&gateway=NAGAD");
  });

  it("widens dateFrom/dateTo days to whole days in Dhaka", () => {
    const query = new URLSearchParams(buildQueryString({ dateFrom: "2026-10-01", dateTo: "2026-10-31" }, ["dateFrom", "dateTo"]));
    expect(query.get("dateFrom")).toBe("2026-09-30T18:00:00.000Z");
    expect(query.get("dateTo")).toBe("2026-10-31T17:59:59.999Z");
  });

  it("passes non-day date values through untouched", () => {
    expect(buildQueryString({ dateTo: "2026-10-31T12:00:00.000Z" }, ["dateTo"])).toBe("dateTo=2026-10-31T12%3A00%3A00.000Z");
  });
});

describe("buildListQueryString", () => {
  it("always pins page and limit", () => {
    expect(buildListQueryString({}, [], 20)).toBe("page=1&limit=20");
  });

  it("caps the limit at the API maximum of 100", () => {
    expect(buildListQueryString({ page: "3", limit: "500" }, [])).toBe("page=3&limit=100");
  });

  it("falls back on invalid page/limit values", () => {
    expect(buildListQueryString({ page: "-2", limit: "abc" }, [], 10)).toBe("page=1&limit=10");
  });
});
