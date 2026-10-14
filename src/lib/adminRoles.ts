import type { AdminRole } from "@/types/auth.types";

// How the panel names each admin role, as English keys for translate().
export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super admin",
  SUPPORT_ADMIN: "Support admin",
  FINANCE_ADMIN: "Finance admin",
  CONTENT_ADMIN: "Content admin",
};

// The colour each role's name takes in the top bar and on badges.
export const ADMIN_ROLE_TONE: Record<AdminRole, string> = {
  SUPER_ADMIN: "text-emerald",
  SUPPORT_ADMIN: "text-info",
  FINANCE_ADMIN: "text-warning",
  CONTENT_ADMIN: "text-pillar-habits",
};

export const adminRoleLabel = (role: AdminRole): string => ADMIN_ROLE_LABELS[role] ?? role;
