import { describe, expect, it } from "vitest";
import type { ISecurityFlag } from "@/types/securityFlag.types";
import { flagClosedBy, flagDetails, flagNextStep, flagTriesLink, isOpenFlag } from "./securityFlags";

const now = new Date("2026-10-02T09:00:00Z"); // 3:00 pm in Dhaka

const flag = (overrides: Partial<ISecurityFlag> = {}): ISecurityFlag => ({
  id: "f1",
  type: "MULTIPLE_FAILED_LOGINS",
  description: "9 failed sign-ins from 198.51.100.77 within 15 minutes.",
  relatedAdminId: null,
  relatedIp: "198.51.100.77",
  severity: "HIGH",
  status: "OPEN",
  reviewedBy: null,
  reviewedAt: null,
  createdAt: "2026-10-02T08:48:00Z",
  relatedAdmin: null,
  reviewer: null,
  ...overrides,
});

describe("flagNextStep", () => {
  it("closes failed sign-ins straight away and reviews anything else first", () => {
    expect(flagNextStep(flag())).toEqual({ label: "Mark resolved", status: "RESOLVED" });
    expect(flagNextStep(flag({ type: "UNUSUAL_LOGIN_LOCATION" }))).toEqual({ label: "Start a review", status: "REVIEWING" });
    expect(flagNextStep(flag({ type: "MASS_DATA_ACCESS", status: "REVIEWING" }))).toEqual({ label: "Mark resolved", status: "RESOLVED" });
    expect(flagNextStep(flag({ status: "RESOLVED" }))).toBeNull();
  });
});

describe("flagTriesLink", () => {
  it("links an open failed-sign-ins flag to that network's tries", () => {
    expect(flagTriesLink(flag(), undefined, { now })).toEqual({ href: "/admin/security/logins?ipAddress=198.51.100.77&success=false&within=7d", label: "See the 9 tries" });
    expect(flagTriesLink(flag({ status: "FALSE_POSITIVE" }), undefined, { now })).toBeNull();
    expect(flagTriesLink(flag({ type: "OTHER" }), undefined, { now })).toBeNull();
  });

  it("opens Sign-ins on a window that still holds the tries", () => {
    const within = (createdAt: string | undefined) => new URLSearchParams(flagTriesLink(flag({ createdAt }), undefined, { now })?.href.split("?")[1]).get("within");
    // The tries are the 15 minutes before the flag, so a flag just inside
    // 7 days needs the 30.
    expect(within("2026-09-25T09:20:00Z")).toBe("7d");
    expect(within("2026-09-25T09:05:00Z")).toBe("30d");
    expect(within("2026-09-10T09:00:00Z")).toBe("30d");
    expect(within("2026-08-20T09:00:00Z")).toBe("all");
    expect(within("not a date")).toBe("all");
    expect(within(undefined)).toBe("all");
  });

  it("counts the tries in the reader's digits", () => {
    const t = (key: string, values?: Record<string, string | number>) => `${key}|${values?.count ?? ""}`;
    expect(flagTriesLink(flag(), t, { now, locale: "bn" })?.label).toBe("See the {count} tries|৯");
  });
});

describe("flag lines", () => {
  const nadia = { id: "n", name: "Nadia Rahman" };

  it("says who is looking into an open flag, and who closed one", () => {
    expect(flagDetails(flag({ status: "REVIEWING", reviewer: nadia, reviewedAt: "2026-10-02T03:15:00Z" }), { now })).toBe(
      "IP 198.51.100.77 · Nadia Rahman is looking into it since 9:15 am",
    );
    expect(flagClosedBy(flag({ status: "RESOLVED", reviewer: nadia, reviewedAt: "2026-09-28T05:00:00Z" }), { now })).toBe("Nadia Rahman · 28 Sep");
    expect(flagClosedBy(flag({ reviewer: nadia }), { now })).toBeNull();
    expect(isOpenFlag(flag({ status: "REVIEWING" }))).toBe(true);
  });
});
