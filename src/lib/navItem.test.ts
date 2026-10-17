import { describe, expect, it } from "vitest";
import { adminNavSections, getNavSectionsByRole, navBadgesFor } from "./navItem";

describe("navBadgesFor", () => {
  it("gives a super admin both counts", () => {
    expect(navBadgesFor(getNavSectionsByRole("SUPER_ADMIN"), "SUPER_ADMIN")).toEqual(["openTickets", "securityFlags"]);
  });

  it("gives a support admin the open tickets only: Security is not in their menu", () => {
    expect(navBadgesFor(getNavSectionsByRole("SUPPORT_ADMIN"), "SUPPORT_ADMIN")).toEqual(["openTickets"]);
  });

  it("gives no count on a page the role can only read", () => {
    expect(navBadgesFor(adminNavSections, "FINANCE_ADMIN")).toEqual(["securityFlags"]);
    expect(navBadgesFor(getNavSectionsByRole("CONTENT_ADMIN"), "CONTENT_ADMIN")).toEqual([]);
  });
});
