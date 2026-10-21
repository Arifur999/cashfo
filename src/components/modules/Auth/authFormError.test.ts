import { describe, expect, it } from "vitest";
import { bnDictionary } from "@/lib/i18n/dictionary";
import { BRAND_NAME } from "@/lib/brand";
import { describeThrownActionCall, normalizeInviteCode, STALE_PAGE_MESSAGE, UNREACHABLE_MESSAGE } from "./authFormError";

// Next's own errors, shaped as the browser bundle throws them.
const redirectError = (to: string) => Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;push;${to};307;`, handled: true });
class UnrecognizedActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnrecognizedActionError";
  }
}

describe("describeThrownActionCall", () => {
  it("treats Next's redirect as the action succeeding", () => {
    expect(describeThrownActionCall(redirectError("/dashboard"))).toEqual({ kind: "navigating" });
  });

  it("asks for a reload when the action is from an older build", () => {
    expect(describeThrownActionCall(new UnrecognizedActionError('Server Action "abc" was not found on the server.'))).toEqual({
      kind: "failed",
      error: { message: STALE_PAGE_MESSAGE, values: { brand: BRAND_NAME }, reload: true },
    });
  });

  it("says the server couldn't be reached for anything else", () => {
    for (const thrown of [new TypeError("Failed to fetch"), new Error("An unexpected response was received from the server."), "offline", null, { digest: 42 }]) {
      expect(describeThrownActionCall(thrown)).toEqual({ kind: "failed", error: { message: UNREACHABLE_MESSAGE } });
    }
  });

  it("doesn't take another digest for a redirect", () => {
    expect(describeThrownActionCall({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" }).kind).toBe("failed");
  });

  it("has Bangla for both messages", () => {
    expect(bnDictionary[STALE_PAGE_MESSAGE]).toBeTruthy();
    expect(bnDictionary[UNREACHABLE_MESSAGE]).toBeTruthy();
  });
});

describe("normalizeInviteCode", () => {
  it("trims and upper-cases a typed code", () => {
    expect(normalizeInviteCode("  a1b2c3d4 ")).toBe("A1B2C3D4");
  });

  it("caps a code at the API's 64 characters", () => {
    expect(normalizeInviteCode("x".repeat(80))).toBe("X".repeat(64));
  });

  it("drops an empty or missing code", () => {
    expect(normalizeInviteCode("   ")).toBeUndefined();
    expect(normalizeInviteCode(undefined)).toBeUndefined();
    expect(normalizeInviteCode(["A1B2C3D4"])).toBeUndefined();
  });
});
