import { describe, expect, it } from "vitest";
import { homeRouteFor, isAdminRole, isGuestOnlyRoute, isPublicRoute, isValidRedirect, routeAudience, sessionFromClaims } from "./authUtils";

describe("auth routes", () => {
  it("sends signed-in visitors away from the sign-in forms only", () => {
    expect(isGuestOnlyRoute("/login")).toBe(true);
    expect(isGuestOnlyRoute("/register")).toBe(true);
    expect(isGuestOnlyRoute("/forgot-password")).toBe(true);
    expect(isGuestOnlyRoute("/reset-password")).toBe(false);
    expect(isGuestOnlyRoute("/login/google")).toBe(false);
  });

  it("keeps the reset link and the Google landing route open to everyone", () => {
    expect(isPublicRoute("/reset-password")).toBe(true);
    expect(isPublicRoute("/login/google")).toBe(true);
    expect(isPublicRoute("/dashboard")).toBe(false);
    expect(isPublicRoute("/admin/dashboard")).toBe(false);
  });

  it("splits the site between the admin panel and the customer app", () => {
    expect(routeAudience("/admin")).toBe("admin");
    expect(routeAudience("/admin/users")).toBe("admin");
    expect(routeAudience("/administrator")).toBe("user");
    expect(routeAudience("/dashboard")).toBe("user");
    expect(homeRouteFor("admin")).toBe("/admin/dashboard");
    expect(homeRouteFor("user")).toBe("/dashboard");
  });

  it("knows the admin roles", () => {
    expect(isAdminRole("CONTENT_ADMIN")).toBe(true);
    expect(isAdminRole("USER")).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });
});

describe("sessionFromClaims", () => {
  it("reads the side and role a token describes", () => {
    expect(sessionFromClaims({ aud: "admin", role: "FINANCE_ADMIN" })).toEqual({ audience: "admin", role: "FINANCE_ADMIN" });
    expect(sessionFromClaims({ aud: "user", role: "USER" })).toEqual({ audience: "user", role: "USER" });
  });

  it("treats claims that don't add up as no session", () => {
    expect(sessionFromClaims(null)).toBeNull();
    expect(sessionFromClaims({ role: "SUPER_ADMIN" })).toBeNull();
    expect(sessionFromClaims({ aud: "admin", role: "USER" })).toBeNull();
    expect(sessionFromClaims({ aud: "user", role: "SUPER_ADMIN" })).toBeNull();
    expect(sessionFromClaims({ aud: "partner", role: "USER" })).toBeNull();
  });
});

describe("isValidRedirect", () => {
  it("lets each side return to its own pages", () => {
    expect(isValidRedirect("/admin/users?page=2", "admin", "SUPPORT_ADMIN")).toBe(true);
    expect(isValidRedirect("/transactions/42", "user", "USER")).toBe(true);
  });

  it("never crosses sides", () => {
    expect(isValidRedirect("/admin/users", "user", "USER")).toBe(false);
    expect(isValidRedirect("/dashboard", "admin", "SUPER_ADMIN")).toBe(false);
  });

  it("respects the admin role table", () => {
    expect(isValidRedirect("/admin/security/logins", "admin", "SUPPORT_ADMIN")).toBe(false);
    expect(isValidRedirect("/admin/security/logins", "admin", "SUPER_ADMIN")).toBe(true);
  });

  it("refuses off-site, auth and API targets", () => {
    expect(isValidRedirect("//evil.example/x", "user", "USER")).toBe(false);
    expect(isValidRedirect("https://evil.example", "user", "USER")).toBe(false);
    expect(isValidRedirect("/\\evil.example", "user", "USER")).toBe(false);
    expect(isValidRedirect("/login/google", "user", "USER")).toBe(false);
    expect(isValidRedirect("/register", "user", "USER")).toBe(false);
    expect(isValidRedirect("/api/auth/sign-out", "user", "USER")).toBe(false);
    expect(isValidRedirect("/", "user", "USER")).toBe(false);
  });
});
