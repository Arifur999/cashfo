import { describe, expect, it } from "vitest";
import { hashPin, lockedNow, NO_LOCK, parseAppLock, pinProblem, weakPin } from "./appLock";

describe("the app lock", () => {
  it("refuses PINs that are easy to guess", () => {
    expect(["0000", "1234", "9876", "4567", "1122", "2580"].every(weakPin)).toBe(true);
    expect(["4815", "2716", "9043"].some(weakPin)).toBe(false);
    expect(pinProblem("12a4", "12a4")).toEqual({ field: "pin", reason: "Use exactly 4 digits." });
    expect(pinProblem("1234", "1234")).toEqual({ field: "pin", reason: "Too easy to guess. Avoid 1234, 0000 and the like." });
    expect(pinProblem("4815", "4816")).toEqual({ field: "again", reason: "The two PINs are not the same." });
    expect(pinProblem("4815", "4815")).toBeNull();
  });

  it("asks for the PIN in a new tab and after the minutes away", () => {
    const lock = { ...NO_LOCK, on: true, salt: "s", hash: "h".repeat(64), after: 5 as const };
    const now = 1_000_000;
    expect(lockedNow(NO_LOCK, { openInTab: false, lastSeen: null, now })).toBe(false);
    expect(lockedNow(lock, { openInTab: false, lastSeen: now, now })).toBe(true);
    expect(lockedNow(lock, { openInTab: true, lastSeen: now - 4 * 60_000, now })).toBe(false);
    expect(lockedNow(lock, { openInTab: true, lastSeen: now - 5 * 60_000, now })).toBe(true);
  });

  it("reads only a whole lock from storage", () => {
    expect(parseAppLock("{")).toEqual(NO_LOCK);
    expect(parseAppLock(JSON.stringify({ on: true, salt: "s", hash: "short", after: 3 }))).toEqual({ ...NO_LOCK, on: false });
    expect(parseAppLock(JSON.stringify({ on: false, hide: true, after: 15 }))).toEqual({ ...NO_LOCK, hide: true, after: 15 });
  });

  it("keeps the PIN as a salted hash", async () => {
    const one = await hashPin("4815", "salt-a");
    expect(one).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashPin("4815", "salt-b")).not.toBe(one);
  });
});
