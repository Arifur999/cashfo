import { describe, expect, it } from "vitest";
import { pagerModel } from "./pagerModel";

describe("pagerModel", () => {
  it("is empty when there are no rows", () => {
    const model = pagerModel(1, 0, 0, 20);
    expect(model.empty).toBe(true);
    expect(model.paged).toBe(false);
    expect(model).toMatchObject({ first: 0, last: 0, previous: null, next: null });
  });

  it("is summary only on a single page", () => {
    const model = pagerModel(1, 1, 8, 20);
    expect(model).toMatchObject({ empty: false, paged: false, current: 1, first: 1, last: 8, previous: null, next: null });
  });

  it("works out the range, neighbours and window of a middle page", () => {
    const model = pagerModel(10, 20, 400, 20);
    expect(model).toMatchObject({ paged: true, current: 10, first: 181, last: 200, previous: 9, next: 11 });
    expect(model.items).toEqual([
      { kind: "page", page: 1, current: false },
      { kind: "jump", direction: "earlier", page: 5 },
      { kind: "page", page: 9, current: false },
      { kind: "page", page: 10, current: true },
      { kind: "page", page: 11, current: false },
      { kind: "jump", direction: "later", page: 15 },
      { kind: "page", page: 20, current: false },
    ]);
  });

  it("keeps the ellipsis jumps inside the list", () => {
    const near = pagerModel(5, 9, 90, 10);
    const jumps = near.items.filter((item) => item.kind === "jump");
    expect(jumps).toEqual([
      { kind: "jump", direction: "earlier", page: 1 },
      { kind: "jump", direction: "later", page: 9 },
    ]);
  });

  it("clamps a page past the end instead of printing 981–50", () => {
    const model = pagerModel(99, 5, 50, 10);
    expect(model).toMatchObject({ current: 5, first: 41, last: 50, previous: 4, next: null });
  });

  it("clamps an unreadable page to the first", () => {
    expect(pagerModel(Number.NaN, 3, 30, 10)).toMatchObject({ current: 1, previous: null, next: 2 });
    expect(pagerModel(-4, 3, 30, 10).current).toBe(1);
  });

  it("counts the pages itself when the meta leaves them out", () => {
    expect(pagerModel(2, 0, 45, 20)).toMatchObject({ totalPages: 3, current: 2, first: 21, last: 40, paged: true });
    expect(pagerModel(1, Number.NaN, 45, 20).totalPages).toBe(3);
  });

  it("survives a show-all page size", () => {
    expect(pagerModel(1, 1, 12, Number.POSITIVE_INFINITY)).toMatchObject({ first: 1, last: 12, paged: false });
  });
});
