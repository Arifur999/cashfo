import { describe, expect, it } from "vitest";
import { paginate } from "./paginate";
import { pageRange } from "./pageParams";

const rows = Array.from({ length: 45 }, (_, index) => index + 1);

describe("paginate", () => {
  it("slices the first page", () => {
    expect(paginate(rows, 1, 20)).toEqual({ rows: rows.slice(0, 20), page: 1, totalPages: 3, total: 45 });
  });

  it("slices a middle page", () => {
    expect(paginate(rows, 2, 20).rows).toEqual(rows.slice(20, 40));
  });

  it("returns the short last page", () => {
    expect(paginate(rows, 3, 20)).toEqual({ rows: [41, 42, 43, 44, 45], page: 3, totalPages: 3, total: 45 });
  });

  it("clamps a page past the end to the last page", () => {
    expect(paginate(rows, 99, 20)).toEqual({ rows: [41, 42, 43, 44, 45], page: 3, totalPages: 3, total: 45 });
  });

  it("clamps a page below 1 to the first page", () => {
    expect(paginate(rows, 0, 20).page).toBe(1);
    expect(paginate(rows, -5, 20).page).toBe(1);
    expect(paginate(rows, Number.NaN, 20).page).toBe(1);
  });

  it("has one page when the size covers every row", () => {
    expect(paginate(rows, 1, 50)).toEqual({ rows, page: 1, totalPages: 1, total: 45 });
  });

  it("reports an empty list like the API meta (0 pages, page 1)", () => {
    expect(paginate([], 3, 20)).toEqual({ rows: [], page: 1, totalPages: 0, total: 0 });
  });

  it("splits exact multiples without an empty trailing page", () => {
    expect(paginate(rows.slice(0, 40), 2, 20)).toEqual({ rows: rows.slice(20, 40), page: 2, totalPages: 2, total: 40 });
  });

  it("survives a size of 0 instead of dividing by it", () => {
    expect(paginate([1, 2, 3], 2, 0)).toEqual({ rows: [2], page: 2, totalPages: 3, total: 3 });
  });

  it("shows every row on one page for an Infinity (show all) size", () => {
    expect(paginate(rows, 1, Infinity)).toEqual({ rows, page: 1, totalPages: 1, total: 45 });
    expect(paginate(rows, 3, Infinity)).toEqual({ rows, page: 1, totalPages: 1, total: 45 });
    expect(paginate([], 1, Infinity)).toEqual({ rows: [], page: 1, totalPages: 0, total: 0 });
  });

  it("returns a copy and leaves the input alone", () => {
    const source = [1, 2, 3];
    const result = paginate(source, 1, 10);
    expect(result.rows).not.toBe(source);
    result.rows.push(4);
    expect(source).toEqual([1, 2, 3]);
  });

  it("agrees with pageRange on every page, including past the end", () => {
    for (let page = -1; page <= 5; page++) {
      const { first, last } = pageRange(page, 20, rows.length);
      expect(paginate(rows, page, 20).rows).toEqual(rows.slice(first - 1, last));
    }
  });
});
