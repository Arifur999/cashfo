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

// The Security area's role chips say just "Support", "Finance", "Content":
// the column already says Role.
export const ADMIN_ROLE_SHORT_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super admin",
  SUPPORT_ADMIN: "Support",
  FINANCE_ADMIN: "Finance",
  CONTENT_ADMIN: "Content",
};

// A role chip: each role in its own soft tile.
export const ADMIN_ROLE_CHIP: Record<AdminRole, string> = {
  SUPER_ADMIN: "bg-mint-50 text-brand-ink",
  SUPPORT_ADMIN: "bg-info-soft text-info",
  FINANCE_ADMIN: "bg-warning-soft text-warning",
  CONTENT_ADMIN: "bg-pillar-habits-soft text-pillar-habits",
};

// An admin's initials in their role's colours; a super admin's in forest.
export const ADMIN_ROLE_AVATAR: Record<AdminRole, string> = {
  SUPER_ADMIN: "bg-forest text-white",
  SUPPORT_ADMIN: "bg-info-soft text-info",
  FINANCE_ADMIN: "bg-warning-soft text-warning",
  CONTENT_ADMIN: "bg-pillar-habits-soft text-pillar-habits",
};
