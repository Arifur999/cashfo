import { describe, expect, it } from "vitest";
import type { Book } from "./api";
import { applyProgress, daysSince, daysToFinish, finishedIn, goalPace, nowReading, pagesLeft, progressPct, readingPace, shelves } from "./libraryDisplay";

function book(over: Partial<Book> & { id: string }): Book {
  return {
    title: over.id,
    author: "",
    totalPages: 300,
    pagesRead: 0,
    status: "WANT_TO_READ",
    color: "walnut",
    startedAt: null,
    finishedAt: null,
    finishedYear: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...over,
  };
}

const TODAY = "2026-10-15";

describe("shelves", () => {
  it("sorts each shelf by its own latest activity", () => {
    const books = [
      book({ id: "a", status: "READING", pagesRead: 10, updatedAt: "2026-10-01T00:00:00.000Z" }),
      book({ id: "b", status: "READING", pagesRead: 20, updatedAt: "2026-10-10T00:00:00.000Z" }),
      book({ id: "c", status: "WANT_TO_READ", createdAt: "2026-09-05T00:00:00.000Z" }),
      book({ id: "d", status: "WANT_TO_READ", createdAt: "2026-09-20T00:00:00.000Z" }),
      book({ id: "e", status: "FINISHED", finishedAt: "2026-08-01T00:00:00.000Z", finishedYear: 2026 }),
      book({ id: "f", status: "FINISHED", finishedAt: "2026-09-14T00:00:00.000Z", finishedYear: 2026 }),
    ];
    const result = shelves(books);
    expect(result.READING.map((b) => b.id)).toEqual(["b", "a"]);
    expect(result.WANT_TO_READ.map((b) => b.id)).toEqual(["d", "c"]);
    expect(result.FINISHED.map((b) => b.id)).toEqual(["f", "e"]);
    expect(nowReading(books)?.id).toBe("b");
    expect(nowReading([])).toBeNull();
  });

  it("counts only the books finished in the year asked for", () => {
    const books = [book({ id: "a", status: "FINISHED", finishedYear: 2026 }), book({ id: "b", status: "FINISHED", finishedYear: 2025 })];
    expect(finishedIn(books, 2026).map((b) => b.id)).toEqual(["a"]);
  });
});

describe("progress", () => {
  it("clamps pages left and the percentage", () => {
    expect(pagesLeft({ pagesRead: 142, totalPages: 320 })).toBe(178);
    expect(pagesLeft({ pagesRead: 400, totalPages: 320 })).toBe(0);
    expect(progressPct({ pagesRead: 142, totalPages: 320 })).toBe(44);
    expect(progressPct({ pagesRead: 1, totalPages: 0 })).toBe(0);
  });

  it("counts days on the Dhaka calendar", () => {
    // 20:00 UTC on the 14th is already the 15th in Dhaka.
    expect(daysSince("2026-10-14T20:00:00.000Z", TODAY)).toBe(0);
    expect(daysSince("2026-10-05T03:00:00.000Z", TODAY)).toBe(10);
    expect(daysSince("2026-10-01", TODAY)).toBe(14);
    expect(daysSince("2026-10-20", TODAY)).toBe(0);
  });

  it("works out a pace only after a full day of reading", () => {
    const reading = book({ id: "a", status: "READING", pagesRead: 142, totalPages: 320, startedAt: "2026-10-07T04:00:00.000Z" });
    expect(readingPace(reading, TODAY)).toBe(18);
    expect(daysToFinish(reading, TODAY)).toBe(10);
    expect(readingPace({ ...reading, startedAt: "2026-10-15T02:00:00.000Z" }, TODAY)).toBeNull();
    expect(readingPace({ ...reading, pagesRead: 0 }, TODAY)).toBeNull();
    expect(daysToFinish({ ...reading, startedAt: null }, TODAY)).toBeNull();
    // A slow reader still gets a pace of at least one page a day.
    expect(readingPace({ ...reading, pagesRead: 3, startedAt: "2026-09-01T04:00:00.000Z" }, TODAY)).toBe(1);
  });

  it("applies progress the way the server settles it", () => {
    const reading = book({ id: "a", status: "READING", pagesRead: 100, totalPages: 300 });
    expect(applyProgress(reading, 300, 2026)).toMatchObject({ status: "FINISHED", pagesRead: 300, finishedYear: 2026 });
    expect(applyProgress(reading, 350, 2026).pagesRead).toBe(300);
    expect(applyProgress({ ...reading, status: "FINISHED", finishedYear: 2026 }, 0, 2026)).toMatchObject({ status: "READING", finishedYear: null });
    expect(applyProgress({ ...reading, status: "WANT_TO_READ", pagesRead: 0 }, 0, 2026).status).toBe("WANT_TO_READ");
  });
});

describe("goalPace", () => {
  const finished = (n: number) => Array.from({ length: n }, (_, i) => book({ id: `f${i}`, status: "FINISHED", finishedYear: 2026 }));

  it("compares books finished with an even pace through the year", () => {
    // 15 Oct is day 288 of 365: 12 books a year means about 9 by now.
    const pace = goalPace(finished(7), 2026, 12, TODAY);
    expect(pace).toMatchObject({ finished: 7, target: 12, toGo: 5, behind: 2 });
    expect(pace.weeksPerBook).toBe(2.2);
  });

  it("says ahead, on pace and reached", () => {
    expect(goalPace(finished(11), 2026, 12, TODAY).behind).toBe(-2);
    expect(goalPace(finished(9), 2026, 12, TODAY).behind).toBe(0);
    expect(goalPace(finished(12), 2026, 12, TODAY)).toMatchObject({ toGo: 0, weeksPerBook: null });
  });

  it("never asks for a pace once the year is over", () => {
    expect(goalPace(finished(1), 2026, 4, "2026-12-31").weeksPerBook).toBeNull();
  });
});
