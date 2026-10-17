import { describe, expect, it } from "vitest";
import type { IFailingNetwork, ILoginAttempt } from "@/types/loginAttempt.types";
import { attemptOutcome, busiestNetworkNote, groupLoginAttempts, networkNote, networkTone, pausedNote } from "./loginAttempts";

const now = new Date("2026-10-02T09:00:00Z"); // 3:00 pm in Dhaka

let seq = 0;
const attempt = (minute: number, overrides: Partial<ILoginAttempt> = {}): ILoginAttempt => ({
  id: `a${(seq += 1)}`,
  email: "admin@example.com",
  ipAddress: "198.51.100.77",
  userAgent: null,
  success: false,
  failureReason: "invalid_password",
  createdAt: new Date(Date.UTC(2026, 9, 2, 8, minute)).toISOString(),
  deviceLabel: "Firefox on Linux",
  account: null,
  signedInAt: null,
  ...overrides,
});

describe("groupLoginAttempts", () => {
  it("folds back-to-back failures from one email and network into one row", () => {
    const rows = groupLoginAttempts([
      attempt(47, { failureReason: "rate_limited" }),
      attempt(45),
      attempt(43, { email: "Admin@Example.com" }),
      attempt(30, { email: "nadia@example.com", success: true, failureReason: null }),
      attempt(29, { email: "nadia@example.com" }),
    ]);
    expect(rows.map((row) => row.attempts.length)).toEqual([3, 1, 1]);
    expect(rows[0].firstAt).toBe(new Date(Date.UTC(2026, 9, 2, 8, 43)).toISOString());
    expect(rows[0].lastAt).toBe(new Date(Date.UTC(2026, 9, 2, 8, 47)).toISOString());
  });

  it("keeps successes and other networks apart", () => {
    const rows = groupLoginAttempts([attempt(10, { success: true, failureReason: null }), attempt(9, { success: true, failureReason: null }), attempt(8, { ipAddress: "203.0.113.9" }), attempt(7)]);
    expect(rows).toHaveLength(4);
  });
});

describe("attemptOutcome", () => {
  it("counts the first reason and says what followed", () => {
    const [row] = groupLoginAttempts([attempt(47, { failureReason: "rate_limited" }), attempt(46, { failureReason: "rate_limited" }), attempt(45), attempt(44), attempt(43)]);
    expect(attemptOutcome(row, now)).toEqual({ text: "Wrong password ×3", note: "then paused ×2 · no account with this email", tone: "expense" });
  });

  it("notes an admin account, a suspension and a later sign-in", () => {
    const suspended = groupLoginAttempts([attempt(30, { failureReason: "account_suspended", account: { name: "Mehedi Hasan", role: "SUPPORT_ADMIN", status: "SUSPENDED" } })])[0];
    expect(attemptOutcome(suspended, now)).toEqual({ text: "Account suspended", note: "Admin account, suspended", tone: "warning" });

    const app = { name: "Shakil Ahmed", role: "USER" as const, status: "ACTIVE" };
    const quick = groupLoginAttempts([attempt(1, { account: app, signedInAt: new Date(Date.UTC(2026, 9, 2, 8, 2)).toISOString() })])[0];
    expect(attemptOutcome(quick, now).note).toBe("Signed in a minute later");
    const later = groupLoginAttempts([attempt(1, { account: app, signedInAt: new Date(Date.UTC(2026, 9, 2, 8, 30)).toISOString() })])[0];
    expect(attemptOutcome(later, now).note).toBe("Signed in at 2:30 pm");
  });

  it("calls a success a success", () => {
    const [row] = groupLoginAttempts([attempt(5, { success: true, failureReason: null })]);
    expect(attemptOutcome(row, now)).toEqual({ text: "Signed in", note: null, tone: "income" });
  });
});

describe("network and summary notes", () => {
  const network = (overrides: Partial<IFailingNetwork> = {}): IFailingNetwork => ({
    ipAddress: "198.51.100.77",
    count: 9,
    lastAt: "2026-10-02T08:47:00Z",
    emails: ["admin@example.com"],
    emailCount: 1,
    account: null,
    flagStatus: null,
    ...overrides,
  });

  it("says whose account a network went for, or how its flag ended", () => {
    expect(networkNote(network(), now)).toBe("Today · tried admin@example.com");
    expect(networkNote(network({ emailCount: 3 }), now)).toBe("Today · tried admin@example.com and 2 more");
    expect(networkNote(network({ lastAt: "2026-09-28T05:00:00Z", flagStatus: "RESOLVED" }), now)).toBe("28 Sep · flag resolved");
    expect(networkNote(network({ account: { name: "Mehedi Hasan", role: "SUPPORT_ADMIN", status: "SUSPENDED" } }), now)).toBe("Mehedi Hasan, suspended admin");
    expect(networkNote(network({ account: { name: "Tanzila Haque", role: "USER", status: "ACTIVE" } }), now)).toBe("App user");
  });

  it("colours a network by its flag", () => {
    expect(networkTone(network({ flagStatus: "OPEN" }))).toBe("danger");
    expect(networkTone(network({ flagStatus: "RESOLVED" }))).toBe("warning");
    expect(networkTone(network())).toBe("neutral");
  });

  it("words the two summary notes", () => {
    expect(busiestNetworkNote({ failedLast24h: 14, busiestNetworkToday: { ipAddress: "x", count: 9 } })).toBe("9 of them from one network");
    expect(busiestNetworkNote({ failedLast24h: 5, busiestNetworkToday: { ipAddress: "x", count: 5 } })).toBe("All of them from one network");
    expect(busiestNetworkNote({ failedLast24h: 0, busiestNetworkToday: null })).toBe("None in the last day");
    expect(pausedNote({ paused: [{ ipAddress: "x", email: "admin@example.com", until: "2026-10-02T09:02:00Z" }] })).toBe("admin@example.com · opens again at 3:02 pm");
    expect(pausedNote({ paused: [] })).toBe("Nobody is paused");
  });
});
