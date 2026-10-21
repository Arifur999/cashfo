import { describe, expect, it } from "vitest";
import type { LoginAttemptGroup } from "@/lib/loginAttempts";
import { markPageEdges } from "./loginAttemptRows";

const group = (id: string, success = false): LoginAttemptGroup => ({
  id,
  email: "rahim@example.com",
  ipAddress: "10.0.0.7",
  deviceLabel: "Chrome on Windows",
  account: null,
  success,
  attempts: [],
  firstAt: "2026-10-20T10:00:00.000Z",
  lastAt: "2026-10-20T10:05:00.000Z",
  signedInAt: null,
});

describe("markPageEdges", () => {
  it("marks nothing on a page that holds the whole list", () => {
    const rows = markPageEdges([group("a"), group("b")], { hasNewer: false, hasOlder: false });
    expect(rows.map((row) => row.clipped)).toEqual([false, false]);
  });

  it("marks the last row when an older page follows, and the first when a newer one comes before", () => {
    expect(markPageEdges([group("a"), group("b"), group("c")], { hasNewer: false, hasOlder: true }).map((row) => row.clipped)).toEqual([false, false, true]);
    expect(markPageEdges([group("a"), group("b"), group("c")], { hasNewer: true, hasOlder: false }).map((row) => row.clipped)).toEqual([true, false, false]);
  });

  it("marks a lone row at both edges", () => {
    expect(markPageEdges([group("a")], { hasNewer: true, hasOlder: true })[0].clipped).toBe(true);
  });

  it("never marks a successful sign-in, which is always a row of its own", () => {
    expect(markPageEdges([group("a", true)], { hasNewer: true, hasOlder: true })[0].clipped).toBe(false);
  });

  it("keeps the group as it was", () => {
    const [row] = markPageEdges([group("a")], { hasNewer: false, hasOlder: false });
    expect(row).toMatchObject({ id: "a", email: "rahim@example.com", ipAddress: "10.0.0.7" });
  });
});
