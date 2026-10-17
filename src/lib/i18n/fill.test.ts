import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { fillNodes, fillText } from "./fill";

describe("fillText", () => {
  it("fills each placeholder by name, wherever the translation put it", () => {
    expect(fillText("{count} tries", { count: 3 })).toBe("3 tries");
    expect(fillText("{name}-এর জন্য {count} বার", { count: "৩", name: "Rafi" })).toBe("Rafi-এর জন্য ৩ বার");
  });

  it("leaves a placeholder with no value, and a template's {{name}}, as written", () => {
    expect(fillText("Hi {name}, {other}", { name: "Rafi" })).toBe("Hi Rafi, {other}");
    expect(fillText("Keep {{name}} as is", { name: "Rafi" })).toBe("Keep {{name}} as is");
  });

  it("never fills from an inherited property", () => {
    expect(fillText("{constructor}", {})).toBe("{constructor}");
  });
});

describe("fillNodes", () => {
  it("returns the sentence in pieces with each value in its place", () => {
    const parts = fillNodes("Open {id} now", { id: "PAY-1" });
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("Open ");
    expect(isValidElement(parts[1])).toBe(true);
    expect(parts[2]).toBe(" now");
  });

  it("keeps text without placeholders whole", () => {
    expect(fillNodes("Nothing to fill", { id: "x" })).toEqual(["Nothing to fill"]);
  });
});
