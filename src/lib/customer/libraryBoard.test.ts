import { describe, expect, it } from "vitest";
import type { BookNote } from "./api";
import { addMark, removeMark, bookWeek, latestNote, markSegments, noteProblem, noteStatsOf, parsePage, parsePrice, quickAdds, readingLogPlan, readingToProblem, shelfList, shelfNameProblem, shelfOf, sortNotes } from "./libraryBoard";

const note = (id: string, page: number | null, date: string, more: Partial<BookNote> = {}): BookNote => ({ id, bookId: "b", page, text: `note ${id}`, date, createdAt: `${date}T10:00:00.000Z`, ...more });

describe("shelves", () => {
  const own = [{ id: "s1", name: "Poetry", color: "oxblood" }];

  it("lists the built-in shelves, the reader's own, then Other", () => {
    expect(shelfList(own).map((shelf) => shelf.id)).toEqual(["faith", "self", "money", "novel", "essay", "history", "s1", "other"]);
  });

  it("reads a shelf since removed as Other", () => {
    expect(shelfOf("s1", own)).toMatchObject({ name: "Poetry", own: true });
    expect(shelfOf("gone", own).id).toBe("other");
    expect(shelfOf(undefined).id).toBe("other");
  });

  it("refuses an empty name or one taken in either language", () => {
    expect(shelfNameProblem("  ", own, [])).toBe("empty");
    expect(shelfNameProblem("poetry ", own, [])).toBe("taken");
    expect(shelfNameProblem("প্রবন্ধ", own, ["প্রবন্ধ"])).toBe("taken");
    expect(shelfNameProblem("Travel", own, ["Essays"])).toBeNull();
  });
});

describe("notes", () => {
  const notes = [note("a", 88, "2026-08-26"), note("b", 14, "2026-08-05"), note("c", 142, "2026-09-09"), note("d", 37, "2026-09-09")];

  it("sorts by page, or newest day first with the later page first", () => {
    expect(sortNotes(notes, "page").map((n) => n.id)).toEqual(["b", "d", "a", "c"]);
    expect(sortNotes(notes, "date").map((n) => n.id)).toEqual(["c", "d", "a", "b"]);
    expect(latestNote(notes)?.id).toBe("c");
    expect(latestNote([])).toBeNull();
  });

  it("counts the notes and their first and last days", () => {
    expect(noteStatsOf(notes)).toEqual({ count: 4, first: "2026-08-05", last: "2026-09-09" });
    expect(noteStatsOf([])).toEqual({ count: 0, first: "", last: "" });
  });

  it("asks a thought for its words, and a highlight for the line or words", () => {
    expect(noteProblem("THOUGHT", "a line", " ")).toBe("thought");
    expect(noteProblem("HIGHLIGHT", "", "")).toBe("lineOrText");
    expect(noteProblem("UNDERLINE", "a line", "")).toBeNull();
  });

  it("reads a page number, Bangla digits too", () => {
    expect(parsePage("৪২")).toEqual({ page: 42 });
    expect(parsePage("")).toEqual({ problem: "empty" });
    expect(parsePage("0")).toEqual({ problem: "whole" });
    expect(parsePage("4.5")).toEqual({ problem: "whole" });
  });
});

describe("parsePrice", () => {
  it("reads taka as typed and leaves an empty one out", () => {
    expect(parsePrice("৳ 1,250.50")).toEqual({ price: 1250.5 });
    expect(parsePrice("৩৬০")).toEqual({ price: 360 });
    expect(parsePrice(" ")).toEqual({ price: null });
    expect(parsePrice("12.345")).toEqual({ problem: "number" });
    expect(parsePrice("abc")).toEqual({ problem: "number" });
    expect(parsePrice("1000001")).toEqual({ problem: "big" });
  });
});

describe("a day of reading", () => {
  const last = { latest: { date: "2026-11-06", from: 108, to: 122 }, before: "2026-11-04" };

  it("begins a new day where the book is", () => {
    expect(readingLogPlan({ pagesRead: 122 }, last, "2026-11-08")).toMatchObject({ from: 122, correcting: false, minDay: "2026-11-06", dayProblem: null });
    expect(readingLogPlan({ pagesRead: 0 }, undefined, "2026-11-08")).toMatchObject({ from: 0, minDay: "" });
  });

  it("corrects the latest day from where it began", () => {
    expect(readingLogPlan({ pagesRead: 122 }, last, "2026-11-06")).toMatchObject({ from: 108, correcting: true, loggedTo: 122, minDay: "2026-11-04" });
  });

  it("closes the days before the latest", () => {
    expect(readingLogPlan({ pagesRead: 122 }, last, "2026-11-05").dayProblem).toEqual({ kind: "closed", after: "2026-11-06" });
    expect(readingLogPlan({ pagesRead: 122 }, last, "2026-11-04", ["2026-11-04"]).dayProblem).toEqual({ kind: "notLatest" });
  });

  it("takes a page after the start and inside the book", () => {
    expect(readingToProblem("১৪২", 122, 320)).toEqual({ to: 142 });
    expect(readingToProblem("", 122, 320)).toEqual({ problem: "empty" });
    expect(readingToProblem("12a", 122, 320)).toEqual({ problem: "whole" });
    expect(readingToProblem("122", 122, 320)).toEqual({ problem: "notAfter" });
    expect(readingToProblem("321", 122, 320)).toEqual({ problem: "overTotal" });
    expect(quickAdds(300, 320)).toEqual([5, 10, 20]);
  });

  it("lays out a book's last seven days", () => {
    const week = bookWeek("b", "2026-11-08", [
      { bookId: "b", date: "2026-11-08", pages: 20 },
      { bookId: "x", date: "2026-11-08", pages: 9 },
      { bookId: "b", date: "2026-11-02", pages: 18 },
    ]);
    expect(week.map((day) => day.date)).toEqual(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"]);
    expect(week.map((day) => day.pages)).toEqual([18, 0, 0, 0, 0, 0, 20]);
  });
});

describe("highlights", () => {
  it("cuts the text into plain and highlighted runs", () => {
    expect(markSegments("Hello there friend", [{ s: 6, e: 11, c: "pink" }])).toEqual([
      { text: "Hello ", mark: null, color: null },
      { text: "there", mark: { s: 6, e: 11 }, color: "pink" },
      { text: " friend", mark: null, color: null },
    ]);
    expect(markSegments("", [])).toEqual([{ text: "", mark: null, color: null }]);
  });

  it("paints over the highlights a new one touches", () => {
    const marks = addMark([{ s: 0, e: 5, c: "yellow" }, { s: 12, e: 18, c: "green" }], 3, 8, "pink", 18);
    expect(marks).toEqual([{ s: 3, e: 8, c: "pink" }, { s: 12, e: 18, c: "green" }]);
    expect(addMark([], 5, 5, "pink", 18)).toEqual([]);
    expect(addMark([], 10, 40, "pink", 18)).toEqual([{ s: 10, e: 18, c: "pink" }]);
    expect(removeMark(marks, { s: 3, e: 8 })).toEqual([{ s: 12, e: 18, c: "green" }]);
  });
});
