import { describe, expect, it } from "vitest";
import { adminCrumb } from "./adminBreadcrumb";

describe("adminCrumb", () => {
  it("puts a page of its own under its menu group", () => {
    expect(adminCrumb("/admin/users")).toEqual({ parent: "People", page: "Users" });
    expect(adminCrumb("/admin/settings")).toEqual({ parent: "Platform", page: "Settings" });
    expect(adminCrumb("/admin/notifications/campaigns")).toEqual({ parent: "Support & content", page: "Campaigns" });
  });

  it("puts a tab under the page it belongs to", () => {
    expect(adminCrumb("/admin/security/logins")).toEqual({ parent: "Security", page: "Sign-ins" });
    expect(adminCrumb("/admin/system")).toEqual({ parent: "System", page: "Health and backups" });
    expect(adminCrumb("/admin/revenue")).toEqual({ parent: "Payments", page: "Revenue" });
  });

  it("ignores a trailing slash", () => {
    expect(adminCrumb("/admin/system/errors/")).toEqual({ parent: "System", page: "Errors" });
  });

  it("leaves My account's parent to the admin's own name", () => {
    expect(adminCrumb("/admin/account")).toEqual({ parent: null, page: "My account" });
  });

  it("names a payment or a ticket from its id", () => {
    expect(adminCrumb("/admin/payments/9f3c2a1b-0000-4000-8000-000000000000")).toEqual({ parent: "Payments", page: "PAY-9F3C2A1B", record: true });
    expect(adminCrumb("/admin/support/ab12cd34-0000")).toEqual({ parent: "Tickets", page: "#AB12C", record: true });
  });

  it("leaves a user's name or an invoice's number to the page", () => {
    expect(adminCrumb("/admin/users/u-1")).toEqual({ parent: "Users", page: null, record: true });
    expect(adminCrumb("/admin/invoices/inv-1")).toEqual({ parent: "Invoices", page: null, record: true });
  });

  it("knows nothing about other paths", () => {
    expect(adminCrumb("/admin/users/u-1/extra")).toBeNull();
    expect(adminCrumb("/admin/unknown")).toBeNull();
    expect(adminCrumb("/dashboard")).toBeNull();
  });
});
