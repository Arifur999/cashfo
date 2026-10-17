import { ADMIN_ROLES } from "@/types/adminAccount.types";
import type { AdminRole } from "@/types/auth.types";
import { canAccessRoute, canManage, type ManageArea } from "./authUtils";

// "do" = can do it, "look" = can only look, "none" = can't see it at all.
export type RoleAccess = "do" | "look" | "none";

export interface RolePermissionRow {
  area: string;
  note?: string;
  access: Record<AdminRole, RoleAccess>;
}

const each = (decide: (role: AdminRole) => RoleAccess) => Object.fromEntries(ADMIN_ROLES.map((role) => [role, decide(role)])) as Record<AdminRole, RoleAccess>;

// Every admin can open the page; only the area's managers can change things.
const manage = (area: string, managed: ManageArea, note?: string): RolePermissionRow => ({
  area,
  note,
  access: each((role) => (canManage(role, managed) ? "do" : "look")),
});

// Only the roles the route table lets in can open the page at all.
const page = (area: string, path: string, note?: string): RolePermissionRow => ({
  area,
  note,
  access: each((role) => (canAccessRoute(path, role) ? "do" : "none")),
});

// Security > Roles, "What each role can do". Worked out from MANAGE_ROLES
// and the route table -- the same rules proxy.ts and the pages follow, which
// the API enforces too -- so the page can't drift from what is allowed.
export const ROLE_PERMISSIONS: RolePermissionRow[] = [
  {
    area: "Open every page except Security and System",
    note: "Users, money, support, content, analytics, settings. Revenue has its own row.",
    access: each(() => "do"),
  },
  manage("Suspend a user or turn them back on", "ownerStatus"),
  manage("Change a user's plan", "ownerPlan"),
  manage("Reset an owner's data", "ownerData", "Deletes their money records"),
  {
    area: "View the app as a customer",
    note: "Read-only, and every visit is in the audit log",
    access: each((role) => (canManage(role, "ownerView") ? "do" : "none")),
  },
  manage("Plans and coupons", "subscriptions"),
  manage("Payments: refund and retry", "payments"),
  page("Revenue and MRR", "/admin/revenue"),
  manage("Tickets and feature requests", "support"),
  manage("Campaigns: send and cancel", "notificationCampaigns", "Anyone can write a draft"),
  manage("Message templates", "notificationTemplates"),
  manage("Announcements, legal pages, translations, categories", "content"),
  manage("Platform settings", "settings", "Support email, currency, maintenance, referral reward"),
  page("Admin team, audit log, sign-ins, flags", "/admin/security", "The Security area"),
  page("Backups, feature flags, errors, rate limits", "/admin/system", "The System area"),
];

export const ROLE_ACCESS_LABEL: Record<RoleAccess, string> = {
  do: "can do it",
  look: "can only look",
  none: "can't see it",
};
