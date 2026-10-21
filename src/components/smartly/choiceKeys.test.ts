import { describe, expect, it } from "vitest";
import { nextChoiceIndex } from "./choiceKeys";

describe("nextChoiceIndex", () => {
  it("steps with the arrows, wrapping round", () => {
    expect(nextChoiceIndex(0, 3, "ArrowDown")).toBe(1);
    expect(nextChoiceIndex(1, 3, "ArrowRight")).toBe(2);
    expect(nextChoiceIndex(2, 3, "ArrowDown")).toBe(0);
    expect(nextChoiceIndex(0, 3, "ArrowUp")).toBe(2);
    expect(nextChoiceIndex(2, 3, "ArrowLeft")).toBe(1);
  });

  it("jumps to the ends with Home and End", () => {
    expect(nextChoiceIndex(1, 4, "Home")).toBe(0);
    expect(nextChoiceIndex(1, 4, "End")).toBe(3);
  });

  it("leaves other keys, and an option outside the group, alone", () => {
    expect(nextChoiceIndex(0, 3, "Enter")).toBeNull();
    expect(nextChoiceIndex(0, 3, " ")).toBeNull();
    expect(nextChoiceIndex(-1, 3, "ArrowDown")).toBeNull();
    expect(nextChoiceIndex(0, 0, "ArrowDown")).toBeNull();
  });
});
