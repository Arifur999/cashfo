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
}

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
