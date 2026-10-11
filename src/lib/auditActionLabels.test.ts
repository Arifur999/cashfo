import { describe, expect, it } from "vitest";
import { AUDIT_ACTION_OPTIONS, auditActionLabel } from "./auditActionLabels";

describe("auditActionLabel", () => {
  it("phrases known actions as sentences", () => {
    expect(auditActionLabel("USER_SUSPENDED")).toBe("Suspended a user");
    expect(auditActionLabel("PAYMENT_REFUNDED")).toBe("Refunded a payment");
  });

  it("still reads sensibly for an action it doesn't know", () => {
    expect(auditActionLabel("REPORT_EXPORTED")).toBe("Report exported");
  });
});

describe("AUDIT_ACTION_OPTIONS", () => {
  it("is sorted by wording and has no duplicate values", () => {
    const labels = AUDIT_ACTION_OPTIONS.map((option) => option.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
    expect(new Set(AUDIT_ACTION_OPTIONS.map((option) => option.value)).size).toBe(AUDIT_ACTION_OPTIONS.length);
  });
});
