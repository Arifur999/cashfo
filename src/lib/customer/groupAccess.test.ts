import { describe, expect, it } from "vitest";
import { accessLevelOf, canManage, canRecord, canTouchEntry, type GroupAccess, mayEnterFor, memberAccessRole, passwordProblem, passwordStrength } from "./groupAccess";

const access = (over: Partial<GroupAccess> = {}): GroupAccess => ({ level: "ADMIN", userId: "u-1", selfMemberId: "m-1", portal: false, readOnly: false, ...over });

describe("group access", () => {
  it("reads the membership's role as Admin, Editor or Viewer", () => {
    expect(accessLevelOf("OWNER")).toBe("ADMIN");
    expect(accessLevelOf("ACCOUNTANT")).toBe("EDITOR");
    expect(accessLevelOf("STAFF")).toBe("VIEWER");
  });

  it("leaves managing to the Admin, and nothing at all to a read-only view", () => {
    expect(canManage(access())).toBe(true);
    expect(canManage(access({ level: "EDITOR" }))).toBe(false);
    expect(canManage(access({ readOnly: true }))).toBe(false);
    expect(canRecord(access({ readOnly: true }), false)).toBe(false);
  });

  it("lets the Admin and an Editor record while the group runs; a Viewer never", () => {
    expect(canRecord(access(), false)).toBe(true);
    expect(canRecord(access({ level: "EDITOR" }), false)).toBe(true);
    expect(canRecord(access({ level: "EDITOR", selfMemberId: null }), false)).toBe(false);
    expect(canRecord(access({ level: "VIEWER" }), false)).toBe(false);
    expect(canRecord(access(), true)).toBe(false);
  });

  it("lets an Editor change only what they added, outside closed months", () => {
    const editor = access({ level: "EDITOR" });
    expect(canTouchEntry(editor, { createdByUserId: "u-1" }, false)).toBe(true);
    expect(canTouchEntry(editor, { createdByUserId: "u-2" }, false)).toBe(false);
    expect(canTouchEntry(editor, { createdByUserId: null }, false)).toBe(false);
    expect(canTouchEntry(editor, { createdByUserId: "u-1" }, false, true)).toBe(false);
    expect(canTouchEntry(access(), { createdByUserId: null }, false, true)).toBe(true);
  });

  it("keeps an Editor's entries in their own name", () => {
    expect(mayEnterFor(access({ level: "EDITOR" }), "m-1")).toBe(true);
    expect(mayEnterFor(access({ level: "EDITOR" }), "m-2")).toBe(false);
    expect(mayEnterFor(access(), "m-2")).toBe(true);
  });

  it("names each member's role", () => {
    expect(memberAccessRole({ isOwner: true, role: "MEMBER" })).toBe("ADMIN");
    expect(memberAccessRole({ role: "ACCOUNTANT" })).toBe("EDITOR");
    expect(memberAccessRole({ role: "VIEWER" })).toBe("VIEWER");
    expect(memberAccessRole({ role: "MEMBER" })).toBe("NONE");
  });

  it("holds new passwords to the app's rule and rates them", () => {
    expect(passwordProblem("short1", "short1")).toMatch(/8/);
    expect(passwordProblem("longenough", "longenough")).toMatch(/letter and one number/);
    expect(passwordProblem("bazar2026", "bazar2027")).toMatch(/match/);
    expect(passwordProblem("bazar2026", "bazar2026")).toBeNull();
    expect(passwordStrength("abc")).toBe(0);
    expect(passwordStrength("bazar2026")).toBe(2);
    expect(passwordStrength("Bazar-2026-shapla")).toBe(4);
  });
});
