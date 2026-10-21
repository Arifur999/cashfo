import { describe, expect, it } from "vitest";
import { isAuditEntryId } from "./auditEntryId";

describe("isAuditEntryId", () => {
  it("takes an entry's UUID, in either case", () => {
    expect(isAuditEntryId("3f2b8c1e-9a4d-4e6f-8b2a-1c0d9e8f7a6b")).toBe(true);
    expect(isAuditEntryId("3F2B8C1E-9A4D-4E6F-8B2A-1C0D9E8F7A6B")).toBe(true);
  });

  it("turns away a mistyped tab and anything shaped like a path", () => {
    for (const value of ["login", "logins", "", "3f2b8c1e-9a4d-4e6f-8b2a", "../users", "3f2b8c1e-9a4d-4e6f-8b2a-1c0d9e8f7a6b/extra"]) {
      expect(isAuditEntryId(value), value).toBe(false);
    }
  });
});
