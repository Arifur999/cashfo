import { describe, expect, it } from "vitest";
import type { IErrorLog } from "@/types/system.types";
import { errorFrequency, errorRequest, groupErrors, shortenIds } from "./errorGroups";

const now = new Date("2026-10-02T09:00:00Z"); // 3:00 pm in Dhaka

let seq = 0;
const log = (minute: number, overrides: Partial<IErrorLog> = {}): IErrorLog => ({
  id: `e${(seq += 1)}`,
  source: "BACKEND_API",
  message: "TypeError: Cannot read properties of undefined (reading 'toNumber')",
  stackTrace: null,
  severity: "HIGH",
  metadata: { path: "/api/businesses/6f1c2a3b-0000-4000-8000-000000000001/contacts", method: "GET" },
  resolved: false,
  resolvedBy: null,
  resolvedAt: null,
  createdAt: new Date(Date.UTC(2026, 9, 2, 6, minute)).toISOString(),
  ...overrides,
});

describe("groupErrors", () => {
  it("puts the same message from the same place together, newest problem first", () => {
    const groups = groupErrors([log(40), log(30, { source: "ADMIN_FRONTEND", severity: "MEDIUM" }), log(20, { severity: "CRITICAL" }), log(10)]);
    expect(groups.map((group) => [group.source, group.logs.length])).toEqual([
      ["BACKEND_API", 3],
      ["ADMIN_FRONTEND", 1],
    ]);
    expect(groups[0].severity).toBe("CRITICAL");
    expect(groups[0].firstAt).toBe(new Date(Date.UTC(2026, 9, 2, 6, 10)).toISOString());
    expect(groups[0].lastAt).toBe(new Date(Date.UTC(2026, 9, 2, 6, 40)).toISOString());
  });
});

describe("error wording", () => {
  it("shortens ids in a request so similar ones read the same", () => {
    expect(errorRequest(log(1))).toBe("GET /api/businesses/…/contacts");
    expect(errorRequest(log(1), 4)).toBe("GET /api/businesses/6f1c…/contacts");
    expect(errorRequest(log(1, { metadata: null }))).toBeNull();
    expect(shortenIds("/admin/users/6f1c2a3b-0000-4000-8000-000000000001")).toBe("/admin/users/…");
  });

  it("says how often a problem happened", () => {
    const [many] = groupErrors([log(40), log(14)]);
    expect(errorFrequency(many, { now })).toBe("2 times · first 12:14 pm, last 12:40 pm");
    const [once] = groupErrors([log(2)]);
    expect(errorFrequency(once, { now })).toBe("Once · 12:02 pm");
  });
});
