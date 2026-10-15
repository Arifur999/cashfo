import type { HabitMonthTracker } from "./api";
import { dayKey, dayOf, hijriParts, shiftDay } from "./habitDisplay";

// The maths behind a Ramadan sheet: which Gregorian days it covers, the
// three ashras, the odd nights of the last ten, and how a sheet reads
// against today. A Ramadan tracker is stored as Day 1..N with its
// Gregorian year; 1 Ramadan is found on the Umm al-Qura calendar.

// The Gregorian day 1 Ramadan falls on in a Gregorian year (the first
// one, if the year holds two). Null when the calendar has none.
export function ramadanStartIn(year: number): string | null {
  for (let i = 0; i < 366; i++) {
    const day = dayKey(new Date(Date.UTC(year, 0, 1 + i)));
    if (day.slice(0, 4) !== String(year)) break;
    const h = hijriParts(day);
    if (h.month === 9 && h.day === 1) return day;
  }
  return null;
}

export interface RamadanDay {
  day: number;
  date: string | null;
  // 0 = Sunday … 6 = Saturday, when the date is known.
  weekday: number | null;
  // 1 Rahmah (1–10), 2 Maghfirah (11–20), 3 Nijat (21–end).
  ashra: 1 | 2 | 3;
  oddNight: boolean;
}

export const ASHRAS = [
  { n: 1 as const, name: "Rahmah", meaning: "mercy" },
  { n: 2 as const, name: "Maghfirah", meaning: "forgiveness" },
  { n: 3 as const, name: "Nijat", meaning: "safety from the Fire" },
];

export function ramadanDays(tracker: HabitMonthTracker): RamadanDay[] {
  const start = tracker.year ? ramadanStartIn(tracker.year) : null;
  return Array.from({ length: tracker.totalDays }, (_, i) => {
    const day = i + 1;
    const date = start ? shiftDay(start, i) : null;
    return { day, date, weekday: date ? dayOf(date).getUTCDay() : null, ashra: day <= 10 ? 1 : day <= 20 ? 2 : 3, oddNight: day >= 21 && day % 2 === 1 };
  });
}

export type RamadanStatus = "upcoming" | "going" | "completed";

export interface RamadanWindow {
  status: RamadanStatus;
  // Day 1..N that is today, during Ramadan.
  todayDay: number | null;
  // Days fully past.
  elapsedDays: number;
  start: string | null;
  end: string | null;
  // The Hijri year the sheet is for.
  hijriYear: number | null;
}

export function ramadanWindow(tracker: HabitMonthTracker, today: string): RamadanWindow {
  const start = tracker.year ? ramadanStartIn(tracker.year) : null;
  if (!start) return { status: "completed", todayDay: null, elapsedDays: tracker.totalDays, start: null, end: null, hijriYear: null };
  const end = shiftDay(start, tracker.totalDays - 1);
  const hijriYear = hijriParts(start).year;
  if (today < start) return { status: "upcoming", todayDay: null, elapsedDays: 0, start, end, hijriYear };
  if (today > end) return { status: "completed", todayDay: null, elapsedDays: tracker.totalDays, start, end, hijriYear };
  const todayDay = Math.round((dayOf(today).getTime() - dayOf(start).getTime()) / 86400000) + 1;
  return { status: "going", todayDay, elapsedDays: todayDay - 1, start, end, hijriYear };
}

export interface ItemSummary {
  item: string;
  done: number;
  of: number;
  pct: number;
}

// Each row's count over the days that have come (all of them once it is
// over), and the share of everything done.
export function ramadanSummary(tracker: HabitMonthTracker, window: RamadanWindow): { items: ItemSummary[]; done: number; of: number; pct: number } {
  const counted = window.status === "completed" ? tracker.totalDays : window.todayDay ?? 0;
  const items = tracker.items.map((item) => {
    const done = tracker.checks.filter((c) => c.item === item && c.day <= counted).length;
    return { item, done, of: counted, pct: counted > 0 ? Math.round((done / counted) * 100) : 0 };
  });
  const done = items.reduce((sum, i) => sum + i.done, 0);
  const of = counted * tracker.items.length;
  return { items, done, of, pct: of > 0 ? Math.round((done / of) * 100) : 0 };
}

// Share of everything done in each ashra, over its days that have come.
export function ashraSummary(tracker: HabitMonthTracker, window: RamadanWindow): { n: 1 | 2 | 3; done: number; of: number; pct: number }[] {
  const counted = window.status === "completed" ? tracker.totalDays : window.todayDay ?? 0;
  return ASHRAS.map((a) => {
    const days = ramadanDays(tracker).filter((d) => d.ashra === a.n && d.day <= counted);
    const of = days.length * tracker.items.length;
    const done = tracker.checks.filter((c) => days.some((d) => d.day === c.day)).length;
    return { n: a.n, done, of, pct: of > 0 ? Math.round((done / of) * 100) : 0 };
  });
}

// The odd nights of the last ten: which have come, and which were fully done.
export function oddNights(tracker: HabitMonthTracker, window: RamadanWindow): { day: number; come: boolean; full: boolean }[] {
  const counted = window.status === "completed" ? tracker.totalDays : window.todayDay ?? 0;
  return ramadanDays(tracker)
    .filter((d) => d.oddNight)
    .map((d) => ({ day: d.day, come: d.day <= counted, full: tracker.items.length > 0 && tracker.checks.filter((c) => c.day === d.day).length === tracker.items.length }));
}

// How a box reads on a Ramadan sheet.
export function ramadanCell(tracker: HabitMonthTracker, window: RamadanWindow, day: number, item: string): "done" | "missed" | "open" | "locked" {
  if (tracker.checks.some((c) => c.day === day && c.item === item)) return "done";
  if (window.status === "completed" || day < (window.todayDay ?? 0)) return "missed";
  if (day === window.todayDay) return "open";
  return "locked";
}
