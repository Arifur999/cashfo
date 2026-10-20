import { describe, expect, it } from "vitest";
import type { IAdminFeedItem } from "@/types/adminFeed.types";
import { adminFeedRow } from "./adminFeedDisplay";

const now = new Date("2026-10-02T10:00:00.000Z");
const row = (kind: IAdminFeedItem["kind"], data: IAdminFeedItem["data"]): IAdminFeedItem => ({ id: "x", group: "SYSTEM", kind, data, at: now.toISOString(), href: "/admin" });

describe("adminFeedRow", () => {
  it("words a failed payment", () => {
    expect(adminFeedRow(row("PAYMENT_FAILED", { name: "Nusrat Jahan", plan: "Monthly Pro", gateway: "BKASH", reason: "not enough balance", amount: "299.00" }))).toEqual({
      title: "Payment failed: Nusrat Jahan",
      body: "Monthly Pro · bKash · not enough balance",
      tone: "expense",
    });
  });

  it("counts how long a ticket has waited, in hours then days", () => {
    const waiting = (since: string) => adminFeedRow(row("TICKET_WAITING", { ticketId: "4f2a1abc", subject: "Charged twice", category: "BILLING", since }), undefined, now);
    expect(waiting("2026-10-02T04:00:00.000Z")).toEqual({ title: "Ticket #4F2A1 waiting 6 hours", body: 'Billing · "Charged twice"', tone: "info" });
    expect(waiting("2026-09-29T09:00:00.000Z").title).toBe("Ticket #4F2A1 waiting 3 days");
  });

  it("words a security flag, paused sign-ins and the day's errors", () => {
    expect(adminFeedRow(row("SECURITY_FLAG", { type: "MULTIPLE_FAILED_LOGINS", description: "9 failed sign-ins from 10.0.0.7", severity: "HIGH" })).title).toBe("Security flag: Many failed sign-ins");
    expect(adminFeedRow(row("SIGN_INS_PAUSED", { email: "admin@example.com", ipAddress: "10.0.0.7", until: "2026-10-02T07:20:00.000Z" })).body).toBe("Too many tries from 10.0.0.7; open again at 1:20 pm");
    expect(adminFeedRow(row("ERRORS", { count: 12, high: 9, top: "/api/reports" }))).toEqual({ title: "12 new errors in 24 hours", body: "9 high · most from /api/reports", tone: "neutral" });
    expect(adminFeedRow(row("ERRORS", { count: 1, high: 0, top: "BACKEND_API" })).body).toBe("most from Backend API");
  });
});
