import { describe, expect, it } from "vitest";
import { isExposedAuthPath } from "./betterAuthRoutes";

describe("isExposedAuthPath", () => {
  it.each(["/api/auth/sign-in/social", "/api/auth/callback/google", "/api/auth/get-session", "/api/auth/sign-out", "/api/auth/dash/user-stats"])(
    "passes %s through",
    (path) => {
      expect(isExposedAuthPath(path)).toBe(true);
    },
  );

  it.each(["/api/auth/login", "/api/auth/sign-up/email", "/api/auth/sign-in/email", "/api/auth/update-user", "/api/auth/callback/", "/api/authx/ok"])(
    "keeps %s closed",
    (path) => {
      expect(isExposedAuthPath(path)).toBe(false);
    },
  );

  it("judges the path the URL parser produced, dot segments folded", () => {
    expect(isExposedAuthPath(new URL("http://x/api/auth/callback/../sign-up/email").pathname)).toBe(false);
  });
});
