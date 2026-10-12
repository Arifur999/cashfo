import { describe, expect, it } from "vitest";
import { getSignInErrorMessage } from "./signInErrors";

describe("getSignInErrorMessage", () => {
  it("says nothing without an error", () => {
    expect(getSignInErrorMessage(undefined)).toBeUndefined();
  });

  it("explains the errors it knows", () => {
    expect(getSignInErrorMessage("access_denied")).toBe("Google sign-in was cancelled.");
    expect(getSignInErrorMessage("account_not_linked")).toBe("This email already has an account. Sign in with your password.");
  });

  it("treats the backend's inactive-account refusal as a suspension", () => {
    expect(getSignInErrorMessage("THIS_ACCOUNT_IS_NOT_ACTIVE")).toBe(getSignInErrorMessage("suspended"));
  });

  it("falls back to a generic sentence for anything else", () => {
    expect(getSignInErrorMessage("state_mismatch")).toBe("Google sign-in didn't finish. Please try again.");
  });
});
