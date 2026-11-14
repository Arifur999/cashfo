import { describe, expect, it } from "vitest";
import { fillText } from "@/lib/i18n/fill";
import { inEnglish, type Translate } from "@/lib/i18n/message";
import { translate } from "@/lib/i18n/translate";
import type { TodoCategory, TodoItem, TodoList } from "./api";
import {
  boardTasks,
  canMoveTo,
  categoryOf,
  doneStreak,
  lateChip,
  listNameTaken,
  matchesSearch,
  moveAllTarget,
  movedChip,
  nextListColor,
  nextOnRule,
  quickMoves,
  rangeText,
  rulesByDay,
  slotOf,
  sortTasks,
  stripAnchor,
  stripDays,
  timeChoices,
} from "./todoBoard";

const t = inEnglish;
const bn: Translate = (key, values) => fillText(translate("bn", key), values ?? {});
const TODAY = "2026-11-08";

const item = (id: string, extra: Partial<TodoItem> = {}): TodoItem => ({
  id,
  text: id,
  completed: false,
  completedAt: null,
  priority: "MEDIUM",
  dueTime: null,
  movedFrom: null,
  moveCount: 0,
  categoryId: null,
  note: "",
  steps: [],
  repeat: null,
  ...extra,
});
const list = (id: string, date: string | null, items: TodoItem[]): TodoList => ({ id, date, items });
const CATS: TodoCategory[] = [
  { id: "p", key: "personal", name: "Personal", color: "blue" },
  { id: "w", key: "work", name: "Work", color: "violet" },
  { id: "s", key: null, name: "Shopping", color: "pink" },
];

describe("the board's tasks", () => {
  const lists = [
    list("a", "2026-11-09", [item("late", { dueTime: "09:00", priority: "LOW" }), item("hi", { priority: "HIGH", dueTime: "18:00" })]),
    list("b", "2026-11-08", [item("now", { dueTime: "10:00" })]),
    list("z", null, [item("someday")]),
  ];

  it("flattens every list with its day, Someday last when sorted", () => {
    const tasks = boardTasks(lists);
    expect(tasks.map((task) => [task.item.id, task.day])).toEqual([
      ["late", "2026-11-09"],
      ["hi", "2026-11-09"],
      ["now", "2026-11-08"],
      ["someday", null],
    ]);
    expect(sortTasks(tasks).map((task) => task.item.id)).toEqual(["now", "hi", "late", "someday"]);
  });

  it("groups by part of the day", () => {
    expect([slotOf("05:30"), slotOf("11:59"), slotOf("12:00"), slotOf("16:45"), slotOf("17:00"), slotOf(null)]).toEqual(["am", "am", "pm", "pm", "eve", "any"]);
  });

  it("offers times every 15 minutes, keeping one set off the grid", () => {
    const groups = timeChoices("10:05");
    expect(groups[0].times).toContain("10:05");
    expect(groups[0].times[0]).toBe("05:00");
    expect(groups[3].times.at(-1)).toBe("04:45");
    expect(groups.flatMap((group) => group.times)).toHaveLength(96 + 1);
  });

  it("finds words in the task, its note and its steps", () => {
    const task = item("x", { text: "Pay the bill", note: "Meter 4471", steps: [{ text: "Use bKash", done: false }] });
    expect(matchesSearch(task, "meter")).toBe(true);
    expect(matchesSearch(task, "BKASH")).toBe(true);
    expect(matchesSearch(task, "rent")).toBe(false);
    expect(matchesSearch(task, "  ")).toBe(true);
  });
});

describe("lists", () => {
  it("files a task without a list under Personal", () => {
    expect(categoryOf({ categoryId: null }, CATS)?.id).toBe("p");
    expect(categoryOf({ categoryId: "gone" }, CATS)?.id).toBe("p");
    expect(categoryOf({ categoryId: "s" }, CATS)?.id).toBe("s");
  });

  it("refuses a name already taken in either language", () => {
    expect(listNameTaken("shopping", CATS, t)).toBe(true);
    expect(listNameTaken("অফিস", CATS, bn)).toBe(true);
    expect(listNameTaken("Travel", CATS, t)).toBe(false);
  });

  it("hands out the next colour", () => {
    expect(nextListColor(CATS)).toBe("teal");
  });
});

describe("days", () => {
  it("keeps the strip still until the day picked leaves it", () => {
    expect(stripDays(TODAY)[0]).toBe("2026-11-06");
    expect(stripDays(TODAY)).toHaveLength(9);
    expect(stripAnchor(TODAY, "2026-11-14")).toBe(TODAY);
    expect(stripAnchor(TODAY, "2026-11-15")).toBe("2026-11-15");
  });

  it("writes a week's range the short way", () => {
    expect(rangeText("2026-11-08", "2026-11-14", t, "en")).toBe("8 to 14 November 2026");
    expect(rangeText("2026-11-29", "2026-12-05", t, "en")).toBe("29 November to 5 December 2026");
    expect(rangeText("2026-12-29", "2027-01-04", t, "en")).toBe("29 December 2026 to 4 January 2027");
  });

  it("finds a repeat's next day", () => {
    expect(nextOnRule({ kind: "DAILY", weekdays: [], monthDay: null }, TODAY)).toBe("2026-11-09");
    expect(nextOnRule({ kind: "WEEKLY", weekdays: [5], monthDay: null }, "2026-11-13")).toBe("2026-11-20");
    expect(nextOnRule({ kind: "MONTHLY", weekdays: [], monthDay: 31 }, "2026-11-08")).toBe("2026-11-30");
    expect(nextOnRule({ kind: "MONTHLY", weekdays: [], monthDay: 7 }, "2026-12-07")).toBe("2027-01-07");
  });

  it("counts the days in a row with something done", () => {
    const done = (iso: string) => ({ completed: true, completedAt: iso });
    // Dhaka is UTC+6: 20:00 UTC on the 7th is the 8th there.
    expect(doneStreak([done("2026-11-07T20:00:00Z"), done("2026-11-07T05:00:00Z"), done("2026-11-05T05:00:00Z")], TODAY)).toBe(2);
    // Nothing yet today: yesterday's run still counts.
    expect(doneStreak([done("2026-11-07T05:00:00Z"), done("2026-11-06T05:00:00Z")], TODAY)).toBe(2);
    expect(doneStreak([{ completed: false, completedAt: null }], TODAY)).toBe(0);
  });
});

describe("moves", () => {
  const rule = { id: "r1", kind: "DAILY" as const, weekdays: [], monthDay: null };
  const tasks = boardTasks([list("a", "2026-11-07", [item("old", { repeat: rule })]), list("b", TODAY, [item("copy", { repeat: rule }), item("done", { completed: true })])]);
  const rules = rulesByDay(tasks);

  it("never puts a repeat's copy on a day its rule covers", () => {
    expect(canMoveTo(tasks[0], TODAY, rules)).toBe(false);
    expect(canMoveTo(tasks[0], "2026-11-12", rules)).toBe(true);
    expect(canMoveTo(tasks[0], null, rules)).toBe(true);
    expect(canMoveTo(tasks[2], "2026-11-12", rules)).toBe(false);
  });

  it("offers the board's one-tap moves", () => {
    expect(quickMoves(null, TODAY).map((move) => move.key)).toEqual(["today", "tomorrow"]);
    expect(quickMoves("2026-11-01", TODAY)).toEqual([{ key: "today", to: TODAY }]);
    expect(quickMoves(TODAY, TODAY)).toEqual([{ key: "tomorrow", to: "2026-11-09" }]);
    expect(quickMoves("2026-11-12", TODAY)).toEqual([{ key: "next", to: "2026-11-13" }]);
    expect(moveAllTarget("2026-11-01", TODAY)).toBe(TODAY);
    expect(moveAllTarget(TODAY, TODAY)).toBe("2026-11-09");
  });

  it("says where a put-off task came from", () => {
    expect(movedChip(item("x", { moveCount: 1, movedFrom: "2026-11-07" }), TODAY, TODAY, t, "en")).toEqual({ text: "Moved from yesterday", strong: false });
    expect(movedChip(item("x", { moveCount: 1, movedFrom: "2026-11-02" }), TODAY, TODAY, t, "en")?.text).toBe("Moved from 2 Nov");
    expect(movedChip(item("x", { moveCount: 3, movedFrom: "2026-11-02" }), TODAY, TODAY, t, "en")).toEqual({ text: "Moved 3 times", strong: true });
    expect(movedChip(item("x", { moveCount: 2, movedFrom: "2026-11-02", completed: true }), TODAY, TODAY, t, "en")).toBeNull();
    expect(movedChip(item("x", { moveCount: 3, movedFrom: "2026-11-02" }), TODAY, TODAY, bn, "bn")?.text).toBe("৩ বার সরানো হয়েছে");
  });

  it("marks an overdue task with its day", () => {
    expect(lateChip({ item: item("x"), listId: "a", day: "2026-11-07" }, TODAY, t, "en")).toBe("From yesterday");
    expect(lateChip({ item: item("x"), listId: "a", day: "2026-11-03" }, TODAY, t, "en")).toBe("Since 3 Nov");
    expect(lateChip({ item: item("x", { completed: true }), listId: "a", day: "2026-11-03" }, TODAY, t, "en")).toBeNull();
  });
});
