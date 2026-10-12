import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { getTokenAudience } from "./tokenAudience";

const tokenWith = (payload: object) => jwt.sign(payload, "any-secret");

describe("getTokenAudience", () => {
  it("reads the side a token names", () => {
    expect(getTokenAudience(tokenWith({ sub: "u", sid: "s", aud: "admin" }))).toBe("admin");
    expect(getTokenAudience(tokenWith({ sub: "u", sid: "s", aud: "user" }))).toBe("user");
  });

  it("is null for a token that names no side, or one it doesn't know", () => {
    expect(getTokenAudience(tokenWith({ sub: "u", sid: "s" }))).toBeNull();
    expect(getTokenAudience(tokenWith({ sub: "u", sid: "s", aud: "partner" }))).toBeNull();
  });

  it("is null for something that isn't a token", () => {
    expect(getTokenAudience("not-a-jwt")).toBeNull();
  });
});
