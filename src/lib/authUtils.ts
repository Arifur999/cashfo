import type { AdminRole, Role, TokenAudience } from "@/types/auth.types";

// One sign-in for the whole site (backend: POST /api/auth/sign-in). The
// account's role decides where it lands: admins in /admin, customers in the
// app.
export const LOGIN_ROUTE = "/login";
export const REGISTER_ROUTE = "/register";
export const FORGOT_PASSWORD_ROUTE = "/forgot-password";
export const RESET_PASSWORD_ROUTE = "/reset-password";
// Where Google sign-in returns to: trades better-auth's session cookie for
// the site's own tokens (app/(auth)/login/google/route.ts).
export const GOOGLE_SIGN_IN_ROUTE = "/login/google";
// Where customers are sent while maintenance mode is on (app/maintenance).
export const MAINTENANCE_ROUTE = "/maintenance";
// The admin-maintained legal pages, readable without an account.
export const LEGAL_ROUTES = ["/terms", "/privacy", "/refund-policy", "/faq"];

// Where a PIN-locked workspace asks for its PIN (app/unlock-workspace).
export const UNLOCK_WORKSPACE_ROUTE = "/unlock-workspace";
export const unlockWorkspaceRoute = (businessId: string) => `${UNLOCK_WORKSPACE_ROUTE}?id=${encodeURIComponent(businessId)}`;

export const ADMIN_HOME_ROUTE = "/admin/dashboard";
export const CUSTOMER_HOME_ROUTE = "/dashboard";

export const homeRouteFor = (audience: TokenAudience) => (audience === "admin" ? ADMIN_HOME_ROUTE : CUSTOMER_HOME_ROUTE);

// A dashboard layout redirects to `${LOGIN_ROUTE}?reason=session-expired`
// when the backend rejects a token proxy.ts still considered valid; proxy.ts
// then clears the stale cookies instead of bouncing back (a redirect loop).
export const SESSION_EXPIRED_REASON = "session-expired";
export const SESSION_EXPIRED_LOGIN_ROUTE = `${LOGIN_ROUTE}?reason=${SESSION_EXPIRED_REASON}`;

// Signed-in visitors are sent home from these.
export const guestOnlyRoutes = [LOGIN_ROUTE, REGISTER_ROUTE, FORGOT_PASSWORD_ROUTE];
// Open to everyone, signed in or not: a reset link works for whoever opens
// it, and the Google landing route replaces whatever session was there.
export const openRoutes = [RESET_PASSWORD_ROUTE, GOOGLE_SIGN_IN_ROUTE, MAINTENANCE_ROUTE, ...LEGAL_ROUTES];

export const isGuestOnlyRoute = (pathname: string) => guestOnlyRoutes.includes(pathname);
export const isPublicRoute = (pathname: string) => isGuestOnlyRoute(pathname) || openRoutes.includes(pathname);

const isUnder = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

// Which side a signed-in path belongs to: /admin is the admin panel, the
// rest of the site is the customer app.
export const routeAudience = (pathname: string): TokenAudience => (isUnder(pathname, "/admin") ? "admin" : "user");

const ADMIN_ROLES: readonly Role[] = ["SUPER_ADMIN", "SUPPORT_ADMIN", "FINANCE_ADMIN", "CONTENT_ADMIN"];
export const isAdminRole = (role: Role | undefined): role is AdminRole => role !== undefined && ADMIN_ROLES.includes(role);

export type ISession = { audience: "admin"; role: AdminRole } | { audience: "user"; role: "USER" };

// The side and role an access token's claims describe, or null when they
// don't add up -- no `aud` (a token from before tokens named their side),
// or a role that doesn't belong on that side. proxy.ts treats null as
// signed out rather than routing on claims that contradict each other.
export const sessionFromClaims = (claims: { aud?: unknown; role?: unknown } | null): ISession | null => {
  if (!claims || typeof claims.role !== "string") {
    return null;
  }
  const role = claims.role as Role;
  if (claims.aud === "admin" && isAdminRole(role)) {
    return { audience: "admin", role };
  }
  if (claims.aud === "user" && role === "USER") {
    return { audience: "user", role };
  }
  return null;
};

export type RouteConfig = { exact: string[]; pattern: RegExp[] };

export const isRouteMatches = (pathname: string, routes: RouteConfig) => {
  if (routes.exact.includes(pathname)) {
    return true;
  }
  return routes.pattern.some((pattern) => pattern.test(pathname));
};

// The admin route ownership table -- the single source of truth for which
// role may open which section. proxy.ts does nothing but consult it.
// Security & Audit and System are SUPER_ADMIN only (the backend 403s every
// route under them too); every other /admin page is open to any admin.
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

// Whitespace and control characters are refused outright: browsers drop
// tabs and newlines from a URL, so "/\t/evil.com" would turn into the
// protocol-relative "//evil.com" -- another site -- once followed.
const UNSAFE_REDIRECT_CHARS = /[\s\u0000-\u001f\u007f\\]/;
const REDIRECT_BASE = "http://redirect.invalid";

// Guards ?redirect=, so a crafted link can't bounce anyone off-site (an open
// redirect), onto the other side, or into a section their role can't open.
// Returns the path to go to -- re-serialized from the parsed URL, so what is
// checked is exactly what the browser will follow -- or null.
export const safeRedirectPath = (redirectPath: string, audience: TokenAudience, role: Role): string | null => {
  if (!redirectPath.startsWith("/") || redirectPath.startsWith("//") || UNSAFE_REDIRECT_CHARS.test(redirectPath)) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(redirectPath, REDIRECT_BASE);
  } catch {
    return null;
  }
  if (url.origin !== REDIRECT_BASE) {
    return null;
  }
  const { pathname } = url;
  if (pathname === "/" || isPublicRoute(pathname) || isUnder(pathname, "/api") || routeAudience(pathname) !== audience) {
    return null;
  }
  if (audience === "admin" && !(isAdminRole(role) && canAccessRoute(pathname, role))) {
    return null;
  }
  return `${pathname}${url.search}${url.hash}`;
};

export const isValidRedirect = (redirectPath: string, audience: TokenAudience, role: Role) => safeRedirectPath(redirectPath, audience, role) !== null;

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
  // Suspending/activating a customer, and changing their plan.
  ownerStatus: ["SUPER_ADMIN", "SUPPORT_ADMIN"],
  ownerPlan: ["SUPER_ADMIN", "FINANCE_ADMIN"],
  // "View as customer", a read-only look at the customer app as the owner.
  ownerView: ["SUPER_ADMIN"],
  settings: ["SUPER_ADMIN"],
  revenue: ["SUPER_ADMIN", "FINANCE_ADMIN"],
} satisfies Record<string, AdminRole[]>;

export type ManageArea = keyof typeof MANAGE_ROLES;

export const canManage = (role: AdminRole | null | undefined, area: ManageArea) =>
  Boolean(role && (MANAGE_ROLES[area] as AdminRole[]).includes(role));
