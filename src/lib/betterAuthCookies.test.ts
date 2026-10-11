import { describe, expect, it } from "vitest";
import { betterAuthCookies, isBetterAuthCookie } from "./betterAuthCookies";

describe("better-auth cookies", () => {
  it("recognises better-auth's names, secure or not", () => {
    expect(isBetterAuthCookie("better-auth.session_token")).toBe(true);
    expect(isBetterAuthCookie("__Secure-better-auth.state")).toBe(true);
    expect(isBetterAuthCookie("accessToken")).toBe(false);
    expect(isBetterAuthCookie("x-better-auth.session_token")).toBe(false);
  });

  it("keeps only better-auth's cookies from a Cookie header", () => {
    const header = "accessToken=a.b.c; better-auth.session_token=tok.sig; refreshToken=d.e.f; __Secure-better-auth.state=s";
    expect(betterAuthCookies(header)).toBe("better-auth.session_token=tok.sig; __Secure-better-auth.state=s");
  });

  it("is empty without any", () => {
    expect(betterAuthCookies(null)).toBe("");
    expect(betterAuthCookies("accessToken=a")).toBe("");
  });
});
