import { describe, expect, it } from "vitest";
import { fillText } from "@/lib/i18n/fill";
import type { Translate } from "@/lib/i18n/message";
import { translate } from "@/lib/i18n/translate";
import type { Book } from "./api";
import { applyProgress, bookShelf, daysSince, daysToFinish, daysWithBook, finishedByMonth, finishedIn, goalPace, isPaused, monthBooks, nowReading, pageOfText, paceSentence, pagesLeft, periodFigures, progressPct, readingPace, shelves, weekPages, yearFigures } from "./libraryDisplay";

// The Bangla dictionary, the way useLocale().t reads it.
const bn: Translate = (key, values) => fillText(translate("bn", key), values ?? {});

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

describe("a paused book", () => {
  const paused = book({ id: "p", status: "READING", pagesRead: 60, pausedAt: "2026-10-10T00:00:00.000Z" });

  it("waits under Up next with its page, ahead of the books not started", () => {
    const all = shelves([book({ id: "w", createdAt: "2026-10-12T00:00:00.000Z" }), paused, book({ id: "r", status: "READING", pagesRead: 5 })]);
    expect(all.READING.map((b) => b.id)).toEqual(["r"]);
    expect(all.WANT_TO_READ.map((b) => b.id)).toEqual(["p", "w"]);
    expect(isPaused(paused)).toBe(true);
    expect(bookShelf(paused)).toBe("paused");
    expect(nowReading([paused])).toBeNull();
  });

  it("is taken up again by reading on", () => {
    expect(applyProgress(paused, 70, 2026)).toMatchObject({ pagesRead: 70, pausedAt: null });
    expect(applyProgress(paused, 60, 2026).pausedAt).toBe(paused.pausedAt);
  });
});

describe("the year on the dashboard", () => {
  const finished = book({ id: "f", status: "FINISHED", pagesRead: 300, startedAt: "2026-03-01T04:00:00.000Z", finishedAt: "2026-03-10T04:00:00.000Z", finishedYear: 2026 });
  const lastYear = book({ id: "l", status: "FINISHED", pagesRead: 300, startedAt: "2025-12-20T04:00:00.000Z", finishedAt: "2025-12-31T19:00:00.000Z", finishedYear: 2026 });
  const reading = book({ id: "r", status: "READING", pagesRead: 40, startedAt: "2026-10-05T04:00:00.000Z" });
  const paused = book({ id: "p", status: "READING", pagesRead: 20, startedAt: "2026-03-02T04:00:00.000Z", pausedAt: "2026-04-01T00:00:00.000Z" });
  const books = [finished, lastYear, reading, paused];

  it("counts the days with a book, both ends in", () => {
    expect(daysWithBook(finished, TODAY)).toBe(10);
    expect(daysWithBook(reading, TODAY)).toBe(11);
    expect(daysWithBook(book({ id: "w" }), TODAY)).toBeNull();
  });

  it("finds a month's books by the app's calendar", () => {
    const months = { f: [0, 0, 300, 0, 0, 0, 0, 0, 0, 0, 0, 0], p: [0, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
    const march = monthBooks(books, months, 2026, 3);
    expect(march.finished.map((b) => b.id)).toEqual(["f"]);
    expect(march.started.map((b) => b.id)).toEqual(["f", "p"]);
    expect(march.read).toEqual([{ book: finished, pages: 300 }, { book: paused, pages: 20 }]);
    // Finished at 01:00 on 1 January in Dhaka.
    expect(finishedByMonth(books, 2026)[0]).toBe(1);
    expect(finishedByMonth(books, 2025)[11]).toBe(0);
  });

  it("adds up the year's figures", () => {
    const months = [0, 0, 320, 0, 0, 0, 0, 0, 0, 40, 0, 0];
    expect(yearFigures(books, months, 2026, TODAY)).toEqual({ finished: 2, pages: 360, perDay: 1, started: 3, paused: 1, daysPerBook: 12 });
    expect(yearFigures(books, Array(12).fill(0), 2027, TODAY)).toMatchObject({ pages: 0, perDay: 0, daysPerBook: null });
  });
});

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

describe("weekPages", () => {
  it("sums the week so far and averages it over the days that have come", () => {
    const week = ["2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"].map((date, i) => ({ date, pages: [0, 18, 22, 25, 20, 23, 20][i] }));
    expect(weekPages(week, "2026-10-02")).toEqual({ total: 128, average: 18 });
    expect(weekPages(week, "2026-09-28")).toEqual({ total: 40, average: 13 });
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

  // Whole weeks (or days, under a week), never "2.3 weeks".
  it("says the pace needed as one sentence", () => {
    expect(paceSentence(2.3)).toBe("About one book every 2 weeks to finish by December.");
    expect(paceSentence(1.2)).toBe("About one book a week to finish by December.");
    expect(paceSentence(0.5)).toBe("About one book every 4 days to finish by December.");
    expect(paceSentence(0.1)).toBe("About one book a day to finish by December.");
    expect(paceSentence(2.3, bn, "bn")).toBe("ডিসেম্বরের মধ্যে শেষ করতে মোটামুটি প্রতি ২ সপ্তাহে একটি বই।");
    expect(pageOfText({ pagesRead: 120, totalPages: 320 }, bn, "bn")).toBe("পৃষ্ঠা ১২০ / ৩২০");
  });
});

describe("periodFigures", () => {
  const book = (id: string, more: Partial<Book>): Book => ({
    id,
    title: id,
    author: "",
    totalPages: 200,
    pagesRead: 0,
    status: "WANT_TO_READ",
    color: "walnut",
    startedAt: null,
    finishedAt: null,
    finishedYear: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...more,
  });
  const books = [
    book("a", { status: "FINISHED", startedAt: "2026-09-01T04:00:00.000Z", finishedAt: "2026-09-10T04:00:00.000Z", pagesRead: 200 }),
    book("b", { status: "READING", startedAt: "2026-09-20T04:00:00.000Z", pausedAt: "2026-10-01T04:00:00.000Z", pagesRead: 50 }),
    book("c", { status: "FINISHED", startedAt: "2026-07-01T04:00:00.000Z", finishedAt: "2026-07-05T04:00:00.000Z", pagesRead: 200 }),
  ];

  it("counts a month's books, its pages a day and the days a book took", () => {
    const figures = periodFigures(books, "2026-09-01", "2026-09-30", 300, "2026-11-08");
    expect(figures.finished.map((b) => b.id)).toEqual(["a"]);
    expect(figures.started.map((b) => b.id)).toEqual(["a", "b"]);
    expect(figures.stopped).toBe(1);
    expect(figures.perDay).toBe(10);
    expect(figures.daysPerBook).toBe(10);
  });

  it("counts only the days so far of a period still running", () => {
    expect(periodFigures(books, "2026-11-01", "2026-11-30", 80, "2026-11-08").perDay).toBe(10);
    expect(periodFigures([], "2026-12-01", "2026-12-31", 0, "2026-11-08")).toMatchObject({ perDay: 0, daysPerBook: null });
  });
});
