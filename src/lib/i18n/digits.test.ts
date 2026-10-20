import { describe, expect, it } from "vitest";
import { bnAdminScopeDictionary, bnDictionary } from "./dictionary";
import { formatCount, toLocaleDigits } from "./digits";

// The English keys the shared Pagination, LoadMore and list components pass
// to t(), word for word.
const PAGER_KEYS = [
  "Pagination",
  "Previous page",
  "Next page",
  "Earlier pages",
  "Later pages",
  "Page {page} of {total}",
  "Showing {range} of {total}",
  "Rows per page",
  "Show {count} more",
  "Show fewer",
  "Showing {shown} of {total}",
  "Brought forward",
  "Carried forward",
  "Go to page {page}",
];

describe("formatCount", () => {
  it("groups a count the en-US way in English", () => {
    expect(formatCount(0, "en")).toBe("0");
    expect(formatCount(1234, "en")).toBe("1,234");
    expect(formatCount(1234567, "en")).toBe("1,234,567");
  });

  // Same grouping, Bangla digits, so a pager reads "৫৪টির মধ্যে ১–২০".
  it("writes the same grouping in Bangla digits", () => {
    expect(formatCount(0, "bn")).toBe("০");
    expect(formatCount(1234, "bn")).toBe("১,২৩৪");
    expect(formatCount(1234567, "bn")).toBe("১,২৩৪,৫৬৭");
  });

  it("shows formatNumber's dash for a count that isn't a number", () => {
    expect(formatCount(Number.NaN, "en")).toBe("—");
    expect(formatCount(Number.NaN, "bn")).toBe("—");
  });
});

describe("toLocaleDigits", () => {
  it("leaves English text as written", () => {
    expect(toLocaleDigits("0", "en")).toBe("0");
    expect(toLocaleDigits("1,234", "en")).toBe("1,234");
    expect(toLocaleDigits("1–20 of 1,234,567", "en")).toBe("1–20 of 1,234,567");
  });

  it("swaps only the digits in Bangla", () => {
    expect(toLocaleDigits("0", "bn")).toBe("০");
    expect(toLocaleDigits("1,234", "bn")).toBe("১,২৩৪");
    expect(toLocaleDigits("1–20 · 1,234,567", "bn")).toBe("১–২০ · ১,২৩৪,৫৬৭");
  });
});

// Kept next to the digits because the pager uses both. A later clean-up of
// duplicate keys must not drop one of these and leave English in a pager.
describe("the pager's words", () => {
  it("words every pager key in both scopes", () => {
    for (const key of PAGER_KEYS) {
      expect(Object.hasOwn(bnDictionary, key), key).toBe(true);
      expect(Object.hasOwn(bnAdminScopeDictionary, key), key).toBe(true);
    }
  });

  // One pager, one word for page: পৃষ্ঠা on customer pages, never পাতা.
  it("says পৃষ্ঠা for page across the customer pager", () => {
    for (const key of PAGER_KEYS) expect(bnDictionary[key], key).not.toContain("পাতা");
  });
});
