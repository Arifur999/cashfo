import { describe, expect, it } from "vitest";
import type { JournalEntry, Note } from "./api";
import { calendarCells, daysSoFar, moodCounts, nextCategoryColor, noteCounts, noteMatches, parseQuickNote, parseTagList, shiftMonth, sortNotes, tagsInText, usualMood } from "./writingDisplay";

const note = (id: string, extra: Partial<Note> = {}): Note => ({
  id,
  kind: "NOTE",
  title: "",
  body: `Note ${id}`,
  categoryId: null,
  tags: [],
  color: "white",
  pinned: false,
  archived: false,
  createdAt: `2026-10-0${id}T08:00:00.000Z`,
  updatedAt: `2026-10-0${id}T08:00:00.000Z`,
  ...extra,
});

const entry = (date: string, mood: number): JournalEntry => ({
  date,
  kind: "DAILY",
  mood,
  wentWell: "",
  gratefulFor: "",
  tomorrow: "",
  body: "",
  categoryId: null,
  tags: [],
  isPrivate: false,
  locked: false,
  updatedAt: `${date}T08:00:00.000Z`,
});

const categories = [{ id: "biz", name: "Business", color: "amber" as const }];

describe("quick notes and tags", () => {
  it("takes the #tags out of a quick note", () => {
    expect(parseQuickNote("Send a follow-up #Furnify  in 3 days #marketing #furnify")).toEqual({ body: "Send a follow-up in 3 days", tags: ["furnify", "marketing"] });
    expect(parseQuickNote("#idea")).toEqual({ body: "#idea", tags: ["idea"] });
  });

  it("reads a typed tag list, and says which tags can't be kept", () => {
    expect(parseTagList("furnify, #Marketing, , furnify")).toEqual({ tags: ["furnify", "marketing"], invalid: [] });
    expect(parseTagList("two words, ok").invalid).toEqual(["two words"]);
  });

  it("finds the tags written in an entry, Bangla too", () => {
    expect(tagsInText("Productive day. #smartly", "Done #বাজার")).toEqual(["smartly", "বাজার"]);
  });
});

describe("the notes list", () => {
  const notes = [
    note("1", { kind: "IDEA", tags: ["furnify"], categoryId: "biz", pinned: true }),
    note("2", { tags: ["furnify", "courier"] }),
    note("3", { archived: true, tags: ["old"] }),
    note("4", { title: "Bazar list" }),
  ];

  it("puts pinned notes first, then the newest", () => {
    expect(sortNotes(notes).map((n) => n.id)).toEqual(["1", "4", "3", "2"]);
  });

  it("filters by view, category, tag and words", () => {
    const base = { view: "all" as const, categoryId: null, tag: null, query: "" };
    expect(notes.filter((n) => noteMatches(n, base, categories)).map((n) => n.id)).toEqual(["1", "2", "4"]);
    expect(notes.filter((n) => noteMatches(n, { ...base, view: "archived" }, categories)).map((n) => n.id)).toEqual(["3"]);
    expect(notes.filter((n) => noteMatches(n, { ...base, view: "idea" }, categories)).map((n) => n.id)).toEqual(["1"]);
    expect(notes.filter((n) => noteMatches(n, { ...base, tag: "courier" }, categories)).map((n) => n.id)).toEqual(["2"]);
    expect(notes.filter((n) => noteMatches(n, { ...base, query: "business" }, categories)).map((n) => n.id)).toEqual(["1"]);
    expect(notes.filter((n) => noteMatches(n, { ...base, query: "#BAZAR" }, categories)).map((n) => n.id)).toEqual(["4"]);
  });

  it("counts the live notes by view, category and tag", () => {
    const counts = noteCounts(notes);
    expect(counts.views).toEqual({ all: 3, note: 2, idea: 1, pinned: 1, archived: 1 });
    expect(counts.byCategory).toEqual({ biz: 1 });
    expect(counts.tags).toEqual([
      { name: "furnify", count: 2 },
      { name: "courier", count: 1 },
    ]);
  });

  it("goes round the category colours", () => {
    expect(nextCategoryColor("blue")).toBe("rose");
    expect(nextCategoryColor("slate")).toBe("blue");
  });
});

describe("the journal", () => {
  it("lays a month out from the reader's first weekday", () => {
    // October 2026 starts on a Thursday: five blanks from Saturday.
    const cells = calendarCells("2026-10", 6);
    expect(cells.slice(0, 6)).toEqual([null, null, null, null, null, "2026-10-01"]);
    expect(cells.length % 7).toBe(0);
    expect(cells.filter(Boolean)).toHaveLength(31);
    expect(calendarCells("2026-10", 4)[0]).toBe("2026-10-01");
  });

  it("moves between months and counts the days so far", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(daysSoFar("2026-10", "2026-10-02")).toBe(2);
    expect(daysSoFar("2026-09", "2026-10-02")).toBe(30);
    expect(daysSoFar("2026-11", "2026-10-02")).toBe(0);
  });

  it("counts moods from the open entries only", () => {
    const entries = [entry("2026-10-01", 0), entry("2026-10-02", 1), { date: "2026-10-03", isPrivate: true as const, locked: true as const }];
    expect(moodCounts(entries)).toEqual([1, 1, 0, 0, 0]);
    expect(usualMood(entries)).toBe(1);
    expect(usualMood([])).toBeNull();
  });
});
