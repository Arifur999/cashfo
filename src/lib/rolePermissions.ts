import { ADMIN_ROLES } from "@/types/adminAccount.types";
import type { AdminRole } from "@/types/auth.types";
import { canAccessRoute, canManage, type ManageArea } from "./authUtils";

// What each admin role can do, can only look at, or can't see -- the one
// list the admin menu's locks (lib/navItem) and Security > Roles' grid both
// read, so they can never disagree. It is worked out from the two tables in
// lib/authUtils that mirror the API's own rules: MANAGE_ROLES (who may
// change an area, the controllers' @Roles()) and the route table (who may
// open a page at all: Security and System are super admin only, Revenue is
// for the money roles).
//
// "do" = can do it, "look" = can only look, "none" = can't see it at all.
export type RoleAccess = "do" | "look" | "none";

export interface AccessRule {
  // The page it lives on: a role the route table keeps out can't see it.
  path?: string;
  // What a role must be allowed to change to act there: one area, or any of
  // several. None = there is nothing to change, so opening it is doing it.
  manage?: ManageArea | readonly ManageArea[];
  // Nothing to look at: a role that can't do it doesn't see it either.
  noLook?: boolean;
}

const areasOf = (manage: AccessRule["manage"]): readonly ManageArea[] => (manage === undefined ? [] : typeof manage === "string" ? [manage] : manage);

// One role's access to one rule.
export const roleAccess = (role: AdminRole, { path, manage, noLook = false }: AccessRule): RoleAccess => {
  if (path !== undefined && !canAccessRoute(path, role)) return "none";
  const areas = areasOf(manage);
  if (areas.length === 0 || areas.some((area) => canManage(role, area))) return "do";
  return noLook ? "none" : "look";
};

const each = (rule: AccessRule) => Object.fromEntries(ADMIN_ROLES.map((role) => [role, roleAccess(role, rule)])) as Record<AdminRole, RoleAccess>;

export interface RolePermissionRow {
  area: string;
  note?: string;
  access: Record<AdminRole, RoleAccess>;
}

const row = (area: string, rule: AccessRule, note?: string): RolePermissionRow => ({ area, note, access: each(rule) });

// Security > Roles, "What each role can do", in the AdminRoles board's order
// and words. The grid draws these rows as they are. ("View the app as a
// customer" is a super admin's alone, on a person's page; the board leaves
// it out, and no menu lock reads it.)
export const ROLE_PERMISSIONS: RolePermissionRow[] = [
  row("Open every page except Security and System", {}, "Users, money, support, content, analytics, settings"),
  row("Suspend a user or turn them back on", { manage: "ownerStatus" }),
  row("Change a user's plan", { manage: "ownerPlan" }),
  row("Reset an owner's data", { manage: "ownerData" }, "Deletes their money records"),
  row("Plans and coupons", { manage: "subscriptions" }),
  row("Payments: refund and retry", { manage: "payments" }),
  row("Revenue and MRR", { path: "/admin/revenue" }),
  row("Referral payouts", { manage: "referralPayouts" }, "Proposed, same as payments"),
  row("Tickets and feature requests", { manage: "support" }),
  row("Campaigns: send and cancel", { manage: "notificationCampaigns" }, "Anyone can write a draft"),
  row("Message templates", { manage: "notificationTemplates" }),
  row("Announcements, legal pages, translations, categories", { manage: "content" }),
  row("Platform settings", { manage: "settings" }, "Support email, currency, maintenance"),
  row("Admin team, audit log, sign-ins, flags", { path: "/admin/security" }, "The Security area"),
  row("Backups, feature flags, error log", { path: "/admin/system" }, "The System area"),
];

export const ROLE_ACCESS_LABEL: Record<RoleAccess, string> = {
  do: "can do it",
  look: "can only look",
  none: "can't see it",
};
