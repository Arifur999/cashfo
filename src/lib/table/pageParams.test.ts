import { describe, expect, it } from "vitest";
import { buildListQueryString } from "@/lib/queryString";
import { clampPage, pageHref, pageRange, pastEnd, readPageParam, readPageSizeParam } from "./pageParams";

describe("readPageParam", () => {
  it("reads a valid page from either source shape", () => {
    expect(readPageParam({ page: "3" })).toBe(3);
    expect(readPageParam(new URLSearchParams("page=3"))).toBe(3);
  });

  it("opens page 1 when the param is missing", () => {
    expect(readPageParam({})).toBe(1);
    expect(readPageParam({ page: undefined })).toBe(1);
    expect(readPageParam(new URLSearchParams())).toBe(1);
  });

  it.each(["abc", "-3", "0", "1.5", "0.5", "", " ", "NaN", "Infinity", "1e400"])("treats %j as page 1", (raw) => {
    expect(readPageParam({ page: raw })).toBe(1);
    expect(readPageParam(new URLSearchParams({ page: raw }))).toBe(1);
  });

  it("treats a repeated page as unreadable in both shapes", () => {
    expect(readPageParam({ page: ["2", "3"] })).toBe(1);
    expect(readPageParam(new URLSearchParams("page=2&page=3"))).toBe(1);
  });

  it("reads a custom key and ignores the default one", () => {
    expect(readPageParam({ page: "4", p: "2" }, "p")).toBe(2);
    expect(readPageParam(new URLSearchParams("page=4"), "p")).toBe(1);
  });

  it("lands on the same page buildListQueryString sends to the API", () => {
    for (const raw of ["7", "2.5", "-1", "abc", ""]) {
      const sent = new URLSearchParams(buildListQueryString({ page: raw }, [])).get("page");
      expect(readPageParam({ page: raw })).toBe(Number(sent));
    }
  });

  it("ignores a page key that only looks like a method name", () => {
    expect(readPageParam({ getAll: "x", page: "2" })).toBe(2);
  });
});

describe("readPageSizeParam", () => {
  const allowed = [10, 20, 50] as const;

  it("accepts a size the pager offers", () => {
    expect(readPageSizeParam({ limit: "50" }, allowed, 20)).toBe(50);
    expect(readPageSizeParam(new URLSearchParams("limit=10"), allowed, 20)).toBe(10);
  });

  it("falls back on any other size", () => {
    expect(readPageSizeParam({ limit: "37" }, allowed, 20)).toBe(20);
    expect(readPageSizeParam({ limit: "500" }, allowed, 20)).toBe(20);
    expect(readPageSizeParam({ limit: "abc" }, allowed, 20)).toBe(20);
    expect(readPageSizeParam({ limit: "-10" }, allowed, 20)).toBe(20);
    expect(readPageSizeParam({ limit: "" }, allowed, 20)).toBe(20);
    expect(readPageSizeParam({}, allowed, 20)).toBe(20);
  });

  it("falls back on a repeated size", () => {
    expect(readPageSizeParam({ limit: ["10", "50"] }, allowed, 20)).toBe(20);
    expect(readPageSizeParam(new URLSearchParams("limit=10&limit=50"), allowed, 20)).toBe(20);
  });

  it("reads a custom key", () => {
    expect(readPageSizeParam({ limit: "10", size: "50" }, allowed, 20, "size")).toBe(50);
  });
});

describe("clampPage", () => {
  it("keeps a page inside the range", () => {
    expect(clampPage(3, 5)).toBe(3);
    expect(clampPage(1, 5)).toBe(1);
    expect(clampPage(5, 5)).toBe(5);
  });

  it("pulls a page past the end back to the last page", () => {
    expect(clampPage(99, 5)).toBe(5);
    expect(clampPage(Infinity, 5)).toBe(5);
  });

  it("never goes below page 1", () => {
    expect(clampPage(0, 5)).toBe(1);
    expect(clampPage(-4, 5)).toBe(1);
    expect(clampPage(Number.NaN, 5)).toBe(1);
  });

  it("returns page 1 for an empty list", () => {
    expect(clampPage(3, 0)).toBe(1);
    expect(clampPage(1, 0)).toBe(1);
    expect(clampPage(2, Number.NaN)).toBe(1);
  });

  it("works in whole pages", () => {
    expect(clampPage(2.7, 5)).toBe(2);
    expect(clampPage(9, 4.5)).toBe(4);
  });
});

describe("pageRange", () => {
  it("numbers rows from 1", () => {
    expect(pageRange(1, 10, 50)).toEqual({ first: 1, last: 10 });
    expect(pageRange(2, 10, 50)).toEqual({ first: 11, last: 20 });
  });

  it("stops at the total on a partial last page", () => {
    expect(pageRange(3, 20, 45)).toEqual({ first: 41, last: 45 });
  });

  it("shows one page when the size exceeds the total", () => {
    expect(pageRange(1, 50, 7)).toEqual({ first: 1, last: 7 });
  });

  it("is 0..0 for an empty list, whatever the page", () => {
    expect(pageRange(1, 10, 0)).toEqual({ first: 0, last: 0 });
    expect(pageRange(4, 10, 0)).toEqual({ first: 0, last: 0 });
  });

  it("never prints 981–50 for a page past the end", () => {
    expect(pageRange(99, 10, 50)).toEqual({ first: 41, last: 50 });
  });

  it("clamps pages below 1 to the first page", () => {
    expect(pageRange(0, 10, 50)).toEqual({ first: 1, last: 10 });
    expect(pageRange(-3, 10, 50)).toEqual({ first: 1, last: 10 });
  });

  it("survives a size of 0 instead of dividing by it", () => {
    expect(pageRange(2, 0, 5)).toEqual({ first: 2, last: 2 });
  });

  it("covers every row for an Infinity (show all) size", () => {
    expect(pageRange(1, Infinity, 45)).toEqual({ first: 1, last: 45 });
    expect(pageRange(3, Infinity, 45)).toEqual({ first: 1, last: 45 });
    expect(pageRange(1, Infinity, 0)).toEqual({ first: 0, last: 0 });
  });

  it("always gives first <= last <= total", () => {
    for (let total = 1; total <= 35; total++) {
      for (let page = -1; page <= 6; page++) {
        const { first, last } = pageRange(page, 10, total);
        expect(first).toBeGreaterThanOrEqual(1);
        expect(first).toBeLessThanOrEqual(last);
        expect(last).toBeLessThanOrEqual(total);
      }
    }
  });
});

describe("pastEnd", () => {
  it("names the last page when the URL asks for one past it", () => {
    expect(pastEnd(99, 5, 50)).toBe(5);
    expect(pastEnd(6, 5, 41)).toBe(5);
  });

  it("is null inside the range", () => {
    expect(pastEnd(1, 5, 50)).toBeNull();
    expect(pastEnd(5, 5, 50)).toBeNull();
  });

  it("is null for an empty list, so the empty state shows instead", () => {
    expect(pastEnd(3, 0, 0)).toBeNull();
    expect(pastEnd(1, 0, 0)).toBeNull();
  });

  it("never sends page 1 back to itself", () => {
    // Inconsistent meta (rows but totalPages 0) must not loop a redirect.
    expect(pastEnd(1, 0, 5)).toBeNull();
    expect(pastEnd(2, 0, 5)).toBe(1);
  });
});

describe("pageHref", () => {
  it("sets the page and keeps the other params", () => {
    expect(pageHref("/transactions", new URLSearchParams("type=EXPENSE"), 3)).toBe("/transactions?type=EXPENSE&page=3");
  });

  it("replaces an existing page in place", () => {
    expect(pageHref("/transactions", new URLSearchParams("page=2&type=EXPENSE"), 5)).toBe("/transactions?page=5&type=EXPENSE");
  });

  it("drops the key for page 1", () => {
    expect(pageHref("/transactions", new URLSearchParams("type=EXPENSE&page=4"), 1)).toBe("/transactions?type=EXPENSE");
  });

  it("leaves no trailing ? when nothing else is left", () => {
    expect(pageHref("/transactions", new URLSearchParams("page=4"), 1)).toBe("/transactions");
    expect(pageHref("/transactions", {}, 1)).toBe("/transactions");
  });

  it("keeps repeated keys from URLSearchParams", () => {
    expect(pageHref("/loans", new URLSearchParams("tag=a&tag=b&page=2"), 3)).toBe("/loans?tag=a&tag=b&page=3");
  });

  it("expands arrays and skips undefined from a searchParams record", () => {
    expect(pageHref("/loans", { tag: ["a", "b"], search: "rahim", gone: undefined }, 2)).toBe("/loans?tag=a&tag=b&search=rahim&page=2");
  });

  it("collapses a repeated page key into one", () => {
    expect(pageHref("/loans", new URLSearchParams("page=2&page=3"), 4)).toBe("/loans?page=4");
    expect(pageHref("/loans", { page: ["2", "3"] }, 1)).toBe("/loans");
  });

  it("uses a custom key and leaves the default one alone", () => {
    expect(pageHref("/loans", new URLSearchParams("page=2"), 3, "p")).toBe("/loans?page=2&p=3");
  });

  it("encodes values safely", () => {
    expect(pageHref("/contacts", { search: "a&b c" }, 2)).toBe("/contacts?search=a%26b+c&page=2");
  });

  it("normalises an invalid target to a whole page of at least 1", () => {
    expect(pageHref("/loans", {}, 0)).toBe("/loans");
    expect(pageHref("/loans", {}, -2)).toBe("/loans");
    expect(pageHref("/loans", {}, Number.NaN)).toBe("/loans");
    expect(pageHref("/loans", {}, 2.6)).toBe("/loans?page=2");
  });

  it("does not mutate the params it was given", () => {
    const params = new URLSearchParams("type=EXPENSE&page=2");
    pageHref("/transactions", params, 7);
    expect(params.toString()).toBe("type=EXPENSE&page=2");
  });

  it("round-trips through readPageParam", () => {
    for (const page of [1, 2, 13]) {
      const href = pageHref("/transactions", new URLSearchParams("type=INCOME"), page);
      expect(readPageParam(new URL(href, "https://example.test").searchParams)).toBe(page);
    }
  });
});
