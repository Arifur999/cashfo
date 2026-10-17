import { describe, expect, it } from "vitest";
import { ROLE_PERMISSIONS } from "./rolePermissions";

const row = (area: string) => {
  const found = ROLE_PERMISSIONS.find((item) => item.area === area);
  if (!found) throw new Error(`no row ${area}`);
  return found.access;
};

describe("ROLE_PERMISSIONS", () => {
  it("lets a super admin do everything", () => {
    expect(ROLE_PERMISSIONS.every((item) => item.access.SUPER_ADMIN === "do")).toBe(true);
  });

  it("keeps Security and System away from every other role", () => {
    for (const area of ["Admin team, audit log, sign-ins, flags", "Backups, feature flags, errors, rate limits"]) {
      expect(row(area)).toEqual({ SUPER_ADMIN: "do", SUPPORT_ADMIN: "none", FINANCE_ADMIN: "none", CONTENT_ADMIN: "none" });
    }
  });

  it("matches each area to the roles that manage it", () => {
    expect(row("Suspend a user or turn them back on")).toEqual({ SUPER_ADMIN: "do", SUPPORT_ADMIN: "do", FINANCE_ADMIN: "look", CONTENT_ADMIN: "look" });
    expect(row("Revenue and MRR")).toEqual({ SUPER_ADMIN: "do", SUPPORT_ADMIN: "none", FINANCE_ADMIN: "do", CONTENT_ADMIN: "none" });
    expect(row("Message templates")).toEqual({ SUPER_ADMIN: "do", SUPPORT_ADMIN: "look", FINANCE_ADMIN: "look", CONTENT_ADMIN: "do" });
    expect(row("View the app as a customer").SUPPORT_ADMIN).toBe("none");
  });
});
