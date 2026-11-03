// Habit Tracker > Write: how notes and the journal are shown, sorted,
// filtered and counted (the NotesHome and JournalHome boards). Pure, so
// the pages and their tests agree.
import type { JournalEntry, LockedJournalEntry, Note, NoteCategory, NoteCategoryColor, NoteColor } from "./api";

// The header the journal's requests carry the diary unlock in (backend
// JOURNAL_UNLOCK_HEADER).
export const JOURNAL_UNLOCK_HEADER = "x-journal-unlock";

// The limits the backend holds (src/writing/writing-text.ts).
export const NOTE_TITLE_MAX = 120;
export const NOTE_BODY_MAX = 5000;
export const CATEGORY_NAME_MAX = 30;
export const TAGS_PER_NOTE = 10;
export const JOURNAL_PROMPT_MAX = 1000;
export const JOURNAL_BODY_MAX = 10000;
export const DIARY_PIN_LENGTH = 4;

// A note card's tint, its swatch's name and its dark-mode-aware class.
export const NOTE_COLORS: { key: NoteColor; label: string; className: string }[] = [
  { key: "white", label: "White", className: "bg-surface" },
  { key: "yellow", label: "Yellow", className: "bg-note-yellow" },
  { key: "green", label: "Green", className: "bg-note-green" },
  { key: "blue", label: "Blue", className: "bg-note-blue" },
  { key: "pink", label: "Pink", className: "bg-note-pink" },
  { key: "purple", label: "Purple", className: "bg-note-purple" },
];

export const noteColorClass = (color: string): string => NOTE_COLORS.find((entry) => entry.key === color)?.className ?? "bg-surface";

// A category's dot, in the order "Add" hands the colours out.
export const CATEGORY_COLORS: { key: NoteCategoryColor; className: string }[] = [
  { key: "blue", className: "bg-cat-4" },
  { key: "rose", className: "bg-cat-6" },
  { key: "amber", className: "bg-cat-11" },
  { key: "violet", className: "bg-cat-3" },
  { key: "teal", className: "bg-cat-5" },
  { key: "green", className: "bg-cat-10" },
  { key: "slate", className: "bg-ink-muted" },
];

export const categoryDotClass = (color: string): string => CATEGORY_COLORS.find((entry) => entry.key === color)?.className ?? "bg-ink-faint";

// The next colour round the palette ("Change colour" on a category).
export const nextCategoryColor = (color: string): NoteCategoryColor => {
  const index = CATEGORY_COLORS.findIndex((entry) => entry.key === color);
  return CATEGORY_COLORS[(index + 1) % CATEGORY_COLORS.length].key;
};

// The five moods, Great to Hard: their face, word and bar colour.
export const MOODS: { emoji: string; label: string; barClass: string; ringClass: string }[] = [
  { emoji: "😄", label: "Great", barClass: "bg-mood-0", ringClass: "border-mood-0" },
  { emoji: "🙂", label: "Good", barClass: "bg-mood-1", ringClass: "border-mood-1" },
  { emoji: "😐", label: "Okay", barClass: "bg-mood-2", ringClass: "border-mood-2" },
  { emoji: "😔", label: "Low@@mood", barClass: "bg-mood-3", ringClass: "border-mood-3" },
  { emoji: "😢", label: "Hard", barClass: "bg-mood-4", ringClass: "border-mood-4" },
];

// A tag as stored: lowercase, without its "#".
export const normalizeTag = (tag: string): string => tag.trim().replace(/^#+/, "").toLowerCase();

const TAG = /^[\p{L}\p{M}\p{N}_-]{1,30}$/u;
const TAGS_IN_TEXT = /#([\p{L}\p{M}\p{N}_-]+)/gu;

// "#furnify follow up #Marketing" -> the text without its tags and the tags
// once each; text that is only tags stays as typed (a note is never empty).
export function parseQuickNote(text: string): { body: string; tags: string[] } {
  const tags: string[] = [];
  const body = text
    .replace(TAGS_IN_TEXT, (_, tag: string) => {
      const clean = tag.toLowerCase().slice(0, 30);
      if (!tags.includes(clean)) tags.push(clean);
      return "";
    })
    .replace(/\s+/g, " ")
    .trim();
  return { body: body || text.trim(), tags: tags.slice(0, TAGS_PER_NOTE) };
}

// "furnify, #Marketing, two words" -> the tags a note can keep, and the ones
// it can't (a space, a symbol, past 30 letters).
export function parseTagList(text: string): { tags: string[]; invalid: string[] } {
  const tags: string[] = [];
  const invalid: string[] = [];
  for (const part of text.split(",")) {
    const tag = normalizeTag(part);
    if (!tag) continue;
    if (!TAG.test(tag)) invalid.push(part.trim());
    else if (!tags.includes(tag)) tags.push(tag);
  }
  return { tags, invalid };
}

// The #tags written in some text, once each (an entry's chips).
export function tagsInText(...texts: string[]): string[] {
  const found = new Set<string>();
  for (const text of texts) for (const match of text.matchAll(TAGS_IN_TEXT)) found.add(match[1].toLowerCase());
  return [...found];
}

export type NoteView = "all" | "note" | "idea" | "pinned" | "archived";

export interface NoteFilter {
  view: NoteView;
  categoryId: string | null;
  tag: string | null;
  query: string;
}

// Pinned first, then the newest.
export const sortNotes = (notes: Note[]): Note[] => [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));

export function noteMatches(note: Note, filter: NoteFilter, categories: NoteCategory[]): boolean {
  if (filter.view === "archived" ? !note.archived : note.archived) return false;
  if (filter.view === "note" && note.kind !== "NOTE") return false;
  if (filter.view === "idea" && note.kind !== "IDEA") return false;
  if (filter.view === "pinned" && !note.pinned) return false;
  if (filter.categoryId && note.categoryId !== filter.categoryId) return false;
  if (filter.tag && !note.tags.includes(filter.tag)) return false;
  const query = filter.query.trim().replace(/^#+/, "").toLowerCase();
  if (query) {
    const category = categories.find((entry) => entry.id === note.categoryId)?.name ?? "";
    if (!`${note.title} ${note.body} ${note.tags.join(" ")} ${category}`.toLowerCase().includes(query)) return false;
  }
  return true;
}

export interface NoteCounts {
  views: Record<NoteView, number>;
  byCategory: Record<string, number>;
  // The live notes' tags, most used first.
  tags: { name: string; count: number }[];
}

export function noteCounts(notes: Note[]): NoteCounts {
  const live = notes.filter((note) => !note.archived);
  const byCategory: Record<string, number> = {};
  const tagCount = new Map<string, number>();
  for (const note of live) {
    if (note.categoryId) byCategory[note.categoryId] = (byCategory[note.categoryId] ?? 0) + 1;
    for (const tag of note.tags) tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
  }
  return {
    views: {
      all: live.length,
      note: live.filter((note) => note.kind === "NOTE").length,
      idea: live.filter((note) => note.kind === "IDEA").length,
      pinned: live.filter((note) => note.pinned).length,
      archived: notes.length - live.length,
    },
    byCategory,
    tags: [...tagCount].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}

// ---- Journal ----

export const isOpenEntry = (entry: JournalEntry | LockedJournalEntry | undefined): entry is JournalEntry => !!entry && !entry.locked;

// "2026-10" moved by some months.
export function shiftMonth(month: string, by: number): string {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, number - 1 + by, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const daysInMonth = (month: string): number => {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number, 0)).getUTCDate();
};

// The month's days laid out in weeks from the reader's first weekday:
// null for the blanks before the 1st and after the last day.
export function calendarCells(month: string, weekStart: number): (string | null)[] {
  const [year, number] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, number - 1, 1)).getUTCDay();
  const lead = (first - weekStart + 7) % 7;
  const days = daysInMonth(month);
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= days; day++) cells.push(`${month}-${String(day).padStart(2, "0")}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// How many days of the month have an entry each mood, the open ones only (a
// locked private day keeps its mood to itself).
export function moodCounts(entries: (JournalEntry | LockedJournalEntry)[]): number[] {
  const counts = MOODS.map(() => 0);
  for (const entry of entries) if (isOpenEntry(entry) && entry.mood >= 0 && entry.mood < counts.length) counts[entry.mood]++;
  return counts;
}

// The month's usual mood: the open entries' average, rounded; null with none.
export function usualMood(entries: (JournalEntry | LockedJournalEntry)[]): number | null {
  const moods = entries.filter(isOpenEntry).map((entry) => entry.mood);
  if (moods.length === 0) return null;
  return Math.round(moods.reduce((sum, mood) => sum + mood, 0) / moods.length);
}

// The days of the month so far: all of a past month, up to today in this one.
export function daysSoFar(month: string, today: string): number {
  if (month < today.slice(0, 7)) return daysInMonth(month);
  if (month > today.slice(0, 7)) return 0;
  return Number(today.slice(8, 10));
}

// What an entry's search hit shows: its first words.
export const entrySnippet = (entry: JournalEntry): string => [entry.wentWell, entry.body, entry.gratefulFor, entry.tomorrow].filter(Boolean).join(" · ").slice(0, 140);
