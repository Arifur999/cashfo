import { describe, expect, it } from "vitest";
import { auditChangeSummary, auditFieldLabel, auditOnText, auditRecordHref, auditRecordName, auditRecordTypeLabel } from "./auditRecords";

const entry = (overrides: Partial<Parameters<typeof auditOnText>[0]> = {}) => ({
  action: "PLAN_UPDATED",
  entityType: "SubscriptionPlan",
  entityId: "b7e2c4a1-5d3f-4e8a-9c21-6f0d8a3e1b55",
  entityLabel: "Yearly Pro",
  oldValue: { name: "Yearly Pro", trialDays: 7 },
  newValue: { name: "Yearly Pro", trialDays: 14 },
  ...overrides,
});

describe("auditRecordName", () => {
  it("names the record the way a person would", () => {
    expect(auditRecordName(entry())).toBe("Yearly Pro");
    expect(auditRecordName(entry({ entityType: "Payment", entityId: "1a2b3c4d-0000", entityLabel: "Mahbub Alam" }))).toBe("PAY-1A2B3C4D · Mahbub Alam");
    expect(auditRecordName(entry({ entityType: "SupportTicket", entityId: "4f2a1abc", entityLabel: "Can't add bKash" }))).toBe("#4F2A1 · Can't add bKash");
    expect(auditRecordName(entry({ entityType: "LegalDocument", entityLabel: "PRIVACY_POLICY" }))).toBe("Privacy policy");
  });

  it("falls back to the saved snapshot, then to the kind of record", () => {
    expect(auditRecordName(entry({ entityType: "Coupon", entityLabel: null, oldValue: { code: "PUJA25" }, newValue: null }))).toBe("PUJA25");
    expect(auditRecordName(entry({ entityType: "PlatformSetting", entityId: null, entityLabel: null, oldValue: {}, newValue: {} }))).toBe("Platform settings");
    expect(auditRecordTypeLabel("SomeNewThing")).toBe("Some new thing");
  });
});

describe("auditChangeSummary", () => {
  it("prefers the reason an admin gave", () => {
    expect(auditChangeSummary({ oldValue: { status: "ACTIVE" }, newValue: { status: "SUSPENDED", reason: "spam invites" } })).toBe("spam invites");
  });

  it("spells out one change and counts several", () => {
    expect(auditChangeSummary(entry())).toBe("trial days 7 → 14");
    expect(auditChangeSummary({ oldValue: { a: 1, b: 2 }, newValue: { a: 2, b: 3 } })).toBe("a and b changed");
    expect(auditChangeSummary({ oldValue: { a: 1, b: 2, c: 3 }, newValue: { a: 2, b: 3, c: 4 } })).toBe("3 fields changed");
    expect(auditChangeSummary({ oldValue: { maxSeats: null }, newValue: { maxSeats: 5 } })).toBe("max seats none → 5");
  });

  it("ignores bookkeeping fields and one-sided snapshots", () => {
    expect(auditChangeSummary({ oldValue: { updatedAt: "x" }, newValue: { updatedAt: "y", sensitive: true } })).toBeNull();
    expect(auditChangeSummary({ oldValue: null, newValue: { code: "PUJA25" } })).toBeNull();
    expect(auditFieldLabel("featureLimits.maxWorkspaces")).toBe("max workspaces");
  });
});

describe("auditOnText / auditRecordHref", () => {
  it("joins the record and the change, and shows a dash for sign-ins", () => {
    expect(auditOnText(entry())).toBe("Yearly Pro · trial days 7 → 14");
    expect(auditOnText(entry({ action: "ADMIN_LOGIN", entityType: "AdminUser" }))).toBe("—");
  });

  it("links to the record's own page, or the list it lives in", () => {
    expect(auditRecordHref({ action: "USER_SUSPENDED", entityType: "User", entityId: "u-1" })).toBe("/admin/users/u-1");
    expect(auditRecordHref({ action: "PLAN_UPDATED", entityType: "SubscriptionPlan", entityId: "p-1" })).toBe("/admin/plans");
    expect(auditRecordHref({ action: "USER_UPDATED", entityType: "PlatformUser", entityId: "pu-1" })).toBeNull();
    expect(auditRecordHref({ action: "ADMIN_LOGIN", entityType: "AdminUser", entityId: "a-1" })).toBeNull();
  });
});
