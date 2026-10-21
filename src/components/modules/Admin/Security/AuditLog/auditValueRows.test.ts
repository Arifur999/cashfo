import { describe, expect, it } from "vitest";
import { auditValueRows } from "./auditValueRows";

describe("auditValueRows", () => {
  it("leads with what moved and folds a moved timestamp away", () => {
    const rows = auditValueRows({ name: "Pro", updatedAt: "2026-10-01" }, { name: "Pro yearly", updatedAt: "2026-10-20" });
    expect(rows.changed.map((row) => row.field)).toEqual(["name"]);
    expect(rows.folded).toBe(1);
    expect(rows.foldedMoved).toBe(true);
  });

  it("never lists the sensitive mark as a change", () => {
    const rows = auditValueRows(null, { sensitive: true, reason: "Checking a sync bug" });
    expect(rows.changed.map((row) => row.field)).toEqual(["reason"]);
    expect(rows.all.find((row) => row.field === "sensitive")?.quiet).toBe(true);
  });

  it("labels a nested field the way the log's On column does", () => {
    const rows = auditValueRows({ featureLimits: { maxWorkspaces: 1 } }, { featureLimits: { maxWorkspaces: 3 } });
    expect(rows.changed).toHaveLength(1);
    expect(rows.changed[0]).toMatchObject({ field: "featureLimits.maxWorkspaces", label: "max workspaces", before: "1", after: "3" });
  });

  it("counts added and removed fields as changes", () => {
    const rows = auditValueRows({ note: "old" }, { code: "EID" });
    expect(rows.changed.map((row) => row.field)).toEqual(["note", "code"]);
  });

  it("folds the fields that stayed the same without calling them moved", () => {
    const rows = auditValueRows({ name: "A", trialDays: 7 }, { name: "A", trialDays: 14 });
    expect(rows.changed.map((row) => row.field)).toEqual(["trialDays"]);
    expect(rows.folded).toBe(1);
    expect(rows.foldedMoved).toBe(false);
  });

  it("is empty when nothing was saved", () => {
    expect(auditValueRows(null, undefined)).toEqual({ all: [], changed: [], folded: 0, foldedMoved: false });
  });
});
