import { describe, expect, it } from "vitest";
import { diffAuditValues, flattenAuditValue, isSensitiveAuditEntry } from "./auditDiff";

describe("flattenAuditValue", () => {
  it("flattens nested objects into dotted paths", () => {
    expect(flattenAuditValue({ name: "Pro", featureLimits: { maxWorkspaces: 2, pdfExport: true } })).toEqual({
      name: "Pro",
      "featureLimits.maxWorkspaces": "2",
      "featureLimits.pdfExport": "true",
    });
  });

  it("keeps arrays and nulls readable", () => {
    expect(flattenAuditValue({ appliesTo: ["PERSONAL", "BUSINESS"], endAt: null })).toEqual({
      appliesTo: '["PERSONAL","BUSINESS"]',
      endAt: "null",
    });
  });

  it("wraps a bare value and ignores a missing one", () => {
    expect(flattenAuditValue("SUSPENDED")).toEqual({ value: "SUSPENDED" });
    expect(flattenAuditValue(undefined)).toEqual({});
  });
});

describe("diffAuditValues", () => {
  it("marks only fields whose value changed on both sides", () => {
    const rows = diffAuditValues({ status: "ACTIVE", name: "Rina" }, { status: "SUSPENDED", name: "Rina", reason: "fraud" });

    expect(rows).toEqual([
      { field: "status", before: "ACTIVE", after: "SUSPENDED", changed: true },
      { field: "name", before: "Rina", after: "Rina", changed: false },
      { field: "reason", before: undefined, after: "fraud", changed: false },
    ]);
  });

  it("returns nothing when neither side recorded detail", () => {
    expect(diffAuditValues(null, null)).toEqual([]);
  });
});

describe("isSensitiveAuditEntry", () => {
  it("reads the sensitive marker on the new value", () => {
    expect(isSensitiveAuditEntry({ sensitive: true, userId: "u1" })).toBe(true);
    expect(isSensitiveAuditEntry({ sensitive: "true" })).toBe(false);
    expect(isSensitiveAuditEntry(null)).toBe(false);
  });
});
