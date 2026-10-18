import { describe, expect, it } from "vitest";
import { changedOrder, moveItem } from "./reorder";

const items = [
  { id: "a", displayOrder: 1 },
  { id: "b", displayOrder: 2 },
  { id: "c", displayOrder: 3 },
];

describe("moveItem", () => {
  it("moves an item down to where another one is", () => {
    expect(moveItem(items, "a", "c").map((item) => item.id)).toEqual(["b", "c", "a"]);
  });

  it("moves an item up", () => {
    expect(moveItem(items, "c", "a").map((item) => item.id)).toEqual(["c", "a", "b"]);
  });

  it("leaves the list alone for itself or an unknown id", () => {
    expect(moveItem(items, "b", "b")).toBe(items);
    expect(moveItem(items, "x", "a")).toBe(items);
  });
});

describe("changedOrder", () => {
  it("numbers the list from 1 and keeps only what moved", () => {
    expect(changedOrder(moveItem(items, "c", "a"))).toEqual([
      { id: "c", displayOrder: 1 },
      { id: "a", displayOrder: 2 },
      { id: "b", displayOrder: 3 },
    ]);
    expect(changedOrder(items)).toEqual([]);
  });
});
