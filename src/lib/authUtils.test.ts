import { describe, expect, it } from "vitest";
import { getSignInErrorMessage, isAuthRoute, isValidRedirectForRole } from "./authUtils";

describe("getSignInErrorMessage", () => {
  it("says nothing without an error", () => {
    expect(getSignInErrorMessage(undefined)).toBeUndefined();
  });

  it("explains the errors it knows", () => {
    expect(getSignInErrorMessage("not-admin")).toBe("That Google account isn't an admin account.");
    expect(getSignInErrorMessage("signup_disabled")).toBe("No admin account uses that Google address.");
  });

  it("falls back to a generic sentence for anything else", () => {
    expect(getSignInErrorMessage("state_mismatch")).toBe("Google sign-in didn't finish. Please try again.");
  });
});

describe("auth routes", () => {
  it("treats the Google landing route as an auth route", () => {
    expect(isAuthRoute("/admin/login/google")).toBe(true);
    expect(isAuthRoute("/admin/dashboard")).toBe(false);
  });

  it("never redirects onto an auth route after login", () => {
    expect(isValidRedirectForRole("/admin/login/google", "SUPER_ADMIN")).toBe(false);
    expect(isValidRedirectForRole("/admin/users", "SUPPORT_ADMIN")).toBe(true);
  });
});
