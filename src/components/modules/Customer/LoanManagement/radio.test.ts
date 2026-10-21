import { describe, expect, it } from "vitest";
import { nextRadioValue, radioProps } from "./radio";

const KINDS = ["GIVE", "TAKE", "BACK", "PAY"] as const;

describe("nextRadioValue", () => {
  it("moves with the arrows, wrapping round, and jumps with Home and End", () => {
    expect(nextRadioValue(KINDS, "GIVE", "ArrowRight")).toBe("TAKE");
    expect(nextRadioValue(KINDS, "PAY", "ArrowDown")).toBe("GIVE");
    expect(nextRadioValue(KINDS, "GIVE", "ArrowLeft")).toBe("PAY");
    expect(nextRadioValue(KINDS, "BACK", "ArrowUp")).toBe("TAKE");
    expect(nextRadioValue(KINDS, "BACK", "Home")).toBe("GIVE");
    expect(nextRadioValue(KINDS, "GIVE", "End")).toBe("PAY");
    expect(nextRadioValue(KINDS, "GIVE", "Enter")).toBeNull();
  });

  it("skips the options that can't be picked", () => {
    const off = (value: string) => value === "BACK";
    expect(nextRadioValue(KINDS, "TAKE", "ArrowRight", off)).toBe("PAY");
    expect(nextRadioValue(KINDS, "PAY", "ArrowLeft", off)).toBe("TAKE");
    expect(nextRadioValue(KINDS, "GIVE", "ArrowRight", () => true)).toBeNull();
  });
});

describe("radioProps", () => {
  it("gives the group one tab stop: the checked option, else the first that can be picked", () => {
    const tabs = (value: (typeof KINDS)[number], disabled?: (value: string) => boolean) => KINDS.map((option) => radioProps(option, { values: KINDS, value, onChange: () => {}, disabled }).tabIndex);
    expect(tabs("BACK")).toEqual([-1, -1, 0, -1]);
    expect(tabs("BACK", (value) => value === "BACK" || value === "GIVE")).toEqual([-1, 0, -1, -1]);
  });

  it("checks only the chosen option and marks the ones that can't be picked", () => {
    const props = radioProps("BACK", { values: KINDS, value: "GIVE", onChange: () => {}, disabled: (value) => value === "BACK" });
    expect(props).toMatchObject({ role: "radio", "aria-checked": false, "aria-disabled": true });
  });
});
