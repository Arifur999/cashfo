import { describe, expect, it } from "vitest";
import {
  forgotPasswordServerZodSchema,
  getPasswordMismatchError,
  loginServerZodSchema,
  newPasswordSchema,
  registerFormZodSchema,
  registerServerZodSchema,
  resetPasswordServerZodSchema,
} from "./auth.validation";

const firstError = (result: { success: boolean; error?: { issues: { message: string }[] } }) => result.error?.issues[0]?.message;

describe("sign in", () => {
  it("tidies the email before it is sent", () => {
    expect(loginServerZodSchema.parse({ email: "  Someone@Example.COM ", password: "x" })).toEqual({ email: "someone@example.com", password: "x" });
  });

  it("needs a password, of any length", () => {
    expect(firstError(loginServerZodSchema.safeParse({ email: "a@b.co", password: "" }))).toBe("Enter your password");
  });
});

describe("new passwords", () => {
  it("follow the backend's rule: 8+ characters with a letter and a number", () => {
    expect(newPasswordSchema.safeParse("abc12345").success).toBe(true);
    expect(firstError(newPasswordSchema.safeParse("abc123"))).toBe("Use at least 8 characters");
    expect(firstError(newPasswordSchema.safeParse("abcdefghij"))).toBe("Use at least one letter and one number");
    expect(firstError(newPasswordSchema.safeParse("1234567890"))).toBe("Use at least one letter and one number");
  });

  it("must be typed the same twice", () => {
    expect(getPasswordMismatchError("abc12345", "abc12345")).toBeUndefined();
    expect(getPasswordMismatchError("abc12345", "")).toBeUndefined();
    expect(getPasswordMismatchError("abc12345", "abc1234")).toBe("The passwords don't match");
  });
});

describe("register", () => {
  const valid = { name: "Rahim", email: "rahim@example.com", phone: "", password: "abc12345", confirmPassword: "abc12345" };

  it("accepts an empty or international phone, and nothing else", () => {
    expect(registerFormZodSchema.safeParse(valid).success).toBe(true);
    expect(registerFormZodSchema.safeParse({ ...valid, phone: "+880 1711-000000" }).success).toBe(true);
    expect(firstError(registerFormZodSchema.safeParse({ ...valid, phone: "call me" }))).toBe("Enter a valid phone number");
  });

  it("sends only what the API takes, without blanks", () => {
    expect(registerServerZodSchema.parse({ ...valid, preferredLanguage: "BN", referralCode: "" })).toEqual({
      name: "Rahim",
      email: "rahim@example.com",
      phone: undefined,
      password: "abc12345",
      preferredLanguage: "BN",
    });
    expect(registerServerZodSchema.parse({ ...valid, referralCode: " FRIEND42 " })).toMatchObject({ referralCode: "FRIEND42" });
  });
});

describe("password reset", () => {
  it("needs a real email to send the link to", () => {
    expect(forgotPasswordServerZodSchema.safeParse({ email: "nope" }).success).toBe(false);
  });

  it("needs the link's token and a valid new password", () => {
    expect(resetPasswordServerZodSchema.safeParse({ token: "t0k3n", newPassword: "abc12345" }).success).toBe(true);
    expect(firstError(resetPasswordServerZodSchema.safeParse({ token: "", newPassword: "abc12345" }))).toBe(
      "This reset link is incomplete. Request a new one.",
    );
  });
});
