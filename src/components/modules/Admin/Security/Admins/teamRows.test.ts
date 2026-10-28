import { describe, expect, it } from "vitest";
import type { IAdminAccount, IAdminInvite } from "@/types/adminAccount.types";
import { teamRows, twoStepCoverage } from "./teamRows";

const admin = (id: string, name: string, status: IAdminAccount["status"] = "ACTIVE", twoFactorEnabled = false): IAdminAccount => ({
  id,
  name,
  email: `${id}@example.com`,
  role: "SUPPORT_ADMIN",
  status,
  lastLoginAt: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  twoFactorEnabled,
});

const invite = (id: string, createdAt: string): IAdminInvite => ({
  id,
  email: `${id}@example.com`,
  name: null,
  role: "FINANCE_ADMIN",
  status: "PENDING",
  invitedBy: null,
  createdAt,
  lastSentAt: createdAt,
  expiresAt: createdAt,
});

describe("teamRows", () => {
  it("puts you first, then the active, then the suspended, then the invites newest first", () => {
    const rows = teamRows(
      [admin("b", "Bina", "SUSPENDED"), admin("c", "Chandan"), admin("me", "Zara"), admin("a", "Abir")],
      [invite("old", "2026-10-01T00:00:00.000Z"), invite("new", "2026-10-02T00:00:00.000Z")],
      "me",
    );
    expect(rows.map((row) => row.id)).toEqual(["me", "a", "c", "b", "invite-new", "invite-old"]);
  });
});

describe("twoStepCoverage", () => {
  it("counts only the admins who can sign in", () => {
    expect(twoStepCoverage([admin("a", "A", "ACTIVE", true), admin("b", "B"), admin("c", "C", "SUSPENDED", true)])).toEqual({ using: 1, total: 2 });
  });
});
