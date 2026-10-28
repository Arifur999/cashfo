import type { AdminRole } from "./auth.types";

export const ADMIN_ROLES = ["SUPER_ADMIN", "SUPPORT_ADMIN", "FINANCE_ADMIN", "CONTENT_ADMIN"] as const satisfies readonly AdminRole[];

export const ADMIN_STATUSES = ["ACTIVE", "SUSPENDED"] as const;
export type AdminStatus = (typeof ADMIN_STATUSES)[number];

export interface IAdminAccount {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  lastLoginAt: string | null;
  createdAt: string;
  // Two-step sign-in is on (GET /admin/admins only; a write answers without it).
  twoFactorEnabled?: boolean;
}

// An invite not yet accepted or cancelled: PENDING while its link works,
// EXPIRED after its seven days (it can still be sent again).
export interface IAdminInvite {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  status: "PENDING" | "EXPIRED";
  invitedBy: { id: string; name: string } | null;
  createdAt: string;
  lastSentAt: string;
  expiresAt: string;
}

export interface ICreateAdminInvitePayload {
  name?: string;
  email: string;
  role: AdminRole;
}

// link: only while email is off -- the super admin passes it on themselves.
export type ICreatedAdminInvite = Pick<IAdminInvite, "id" | "email" | "name" | "role" | "expiresAt"> & { link?: string };

export interface ICreateAdminPayload {
  name: string;
  email: string;
  role: AdminRole;
}

export interface IUpdateAdminPayload {
  name: string;
  // Left out when editing yourself -- the API refuses a self role change.
  role?: AdminRole;
}

// The generated password is returned exactly once, never stored readable.
export interface ITemporaryPassword {
  temporaryPassword: string;
}

export type ICreatedAdmin = Pick<IAdminAccount, "id" | "name" | "email" | "role"> & ITemporaryPassword;
