import type { AdminRole } from "@/types/auth.types";

export const LOGIN_ROUTE = "/admin/login";
export const DEFAULT_DASHBOARD_ROUTE = "/admin/dashboard";

// The dashboard layout redirects to `${LOGIN_ROUTE}?reason=session-expired`
// when the backend rejects a token proxy.ts still considered valid; proxy.ts
// then clears the stale cookies instead of bouncing back (a redirect loop).
export const SESSION_EXPIRED_REASON = "session-expired";
export const SESSION_EXPIRED_LOGIN_ROUTE = `${LOGIN_ROUTE}?reason=${SESSION_EXPIRED_REASON}`;

export const authRoutes = [LOGIN_ROUTE];
export const isAuthRoute = (pathname: string) => authRoutes.includes(pathname);

export type RouteConfig = { exact: string[]; pattern: RegExp[] };

export const isRouteMatches = (pathname: string, routes: RouteConfig) => {
  if (routes.exact.includes(pathname)) {
    return true;
  }
  return routes.pattern.some((pattern) => pattern.test(pathname));
};

// The route ownership table -- the single source of truth for which role may
// open which section. proxy.ts does nothing but consult it. Security & Audit
// and System are SUPER_ADMIN only (the backend 403s every route under them
// too); every other /admin page is open to any signed-in admin.
export const superAdminRoutes: RouteConfig = {
  exact: [],
  pattern: [/^\/admin\/security(\/|$)/, /^\/admin\/system(\/|$)/],
};

// null means "any signed-in admin".
export const getRouteRoles = (pathname: string): AdminRole[] | null => {
  if (isRouteMatches(pathname, superAdminRoutes)) {
    return ["SUPER_ADMIN"];
  }
  return null;
};

export const canAccessRoute = (pathname: string, role: AdminRole) => {
  const roles = getRouteRoles(pathname);
  return roles === null || roles.includes(role);
};

// Guards the login page's ?redirect= param, so a crafted link can't bounce an
// admin off-site (open redirect) or onto a section their role can't open.
export const isValidRedirectForRole = (redirectPath: string, role: AdminRole) => {
  if (!redirectPath.startsWith("/admin/") || redirectPath.startsWith("//")) {
    return false;
  }
  const pathname = redirectPath.split(/[?#]/)[0];
  if (isAuthRoute(pathname)) {
    return false;
  }
  return canAccessRoute(pathname, role);
};

// Which roles may mutate each area. Pages read this to decide whether to show
// create/edit/delete controls; the backend enforces the same rules, so this
// is about not showing buttons that would only 403.
export const MANAGE_ROLES = {
  subscriptions: ["SUPER_ADMIN", "FINANCE_ADMIN"],
  payments: ["SUPER_ADMIN", "FINANCE_ADMIN"],
  content: ["SUPER_ADMIN", "CONTENT_ADMIN"],
  support: ["SUPER_ADMIN", "SUPPORT_ADMIN"],
  notificationTemplates: ["SUPER_ADMIN", "CONTENT_ADMIN"],
  notificationCampaigns: ["SUPER_ADMIN", "SUPPORT_ADMIN"],
  ownerData: ["SUPER_ADMIN"],
  settings: ["SUPER_ADMIN"],
  revenue: ["SUPER_ADMIN", "FINANCE_ADMIN"],
} satisfies Record<string, AdminRole[]>;

export type ManageArea = keyof typeof MANAGE_ROLES;

export const canManage = (role: AdminRole | null | undefined, area: ManageArea) =>
  Boolean(role && (MANAGE_ROLES[area] as AdminRole[]).includes(role));
