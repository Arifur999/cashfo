import { describe, expect, it } from "vitest";
import { AVATAR_TONES, avatarTone } from "./avatarTone";

describe("avatarTone", () => {
  it("gives the same person the same tint every time", () => {
    expect(avatarTone("sharmin.akter@example.com")).toBe(avatarTone("sharmin.akter@example.com"));
  });

  it("spreads people over all five tints", () => {
    const tones = new Set(Array.from({ length: 50 }, (_, index) => avatarTone(`person${index}@example.com`)));
    expect(tones.size).toBe(AVATAR_TONES.length);
  });

  it("copes with an empty key", () => {
    expect(AVATAR_TONES).toContain(avatarTone(""));
  });
});
