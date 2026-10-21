import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, pageSizeOptions, pastEndPage } from "./tablePaging";

describe("pageSizeOptions", () => {
  it("offers the four sizes to a list that uses one of them", () => {
    expect(pageSizeOptions(DEFAULT_PAGE_SIZE)).toEqual([10, 25, 50, 100]);
    expect(pageSizeOptions(100)).toEqual([10, 25, 50, 100]);
  });

  it("keeps a list's own size on offer, in order", () => {
    expect(pageSizeOptions(20)).toEqual([10, 20, 25, 50, 100]);
  });

  it("never changes the shared list", () => {
    pageSizeOptions(20).push(1);
    expect(PAGE_SIZES).toEqual([10, 25, 50, 100]);
  });
});

describe("pastEndPage", () => {
  it("sends a page past the end to the last one", () => {
    expect(pastEndPage(99, { totalPage: 5 })).toBe(5);
    expect(pastEndPage(2, { totalPage: 1 })).toBe(1);
  });

  it("leaves a page that exists alone", () => {
    expect(pastEndPage(5, { totalPage: 5 })).toBeNull();
    expect(pastEndPage(1, { totalPage: 5 })).toBeNull();
  });

  // totalPage 0 is an empty list: page 1 is all there is, and no loop.
  it("does nothing for an empty list or without a meta", () => {
    expect(pastEndPage(3, { totalPage: 0 })).toBeNull();
    expect(pastEndPage(3, undefined)).toBeNull();
  });
});
