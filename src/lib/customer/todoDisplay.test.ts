import { describe, expect, it } from "vitest";
import type { TodoList } from "./api";
import { dayCount, dayCountText, dayLabel, doneItems, isDayKey, listFor, openItems, relativeName, stripDays, upcoming, withList } from "./todoDisplay";

const t = (key: string) => key;
const list = (id: string, date: string, items: [string, boolean][]): TodoList => ({ id, date, items: items.map(([text, completed], i) => ({ id: `${id}-${i}`, text, completed })) });

const TODAY = "2026-10-15";
const LISTS = [
  list("a", "2026-10-13", [["Old", true], ["Older", true]]),
  list("b", "2026-10-15", [["Pay the bill", false], ["Call Arif", false], ["Buy vegetables", true]]),
  list("c", "2026-10-16", [["Rent", false], ["Service the bike", false], ["Done already", true]]),
  list("d", "2026-10-18", [["Report", false]]),
  list("e", "2026-10-20", [["Doctor", false]]),
  list("f", "2026-10-23", [["Too far", false]]),
];

describe("days", () => {
  it("recognises a day key", () => {
    expect(isDayKey("2026-10-15")).toBe(true);
    expect(isDayKey("2026-13-45")).toBe(false);
    expect(isDayKey("yesterday")).toBe(false);
    expect(isDayKey(undefined)).toBe(false);
  });

  it("lays out the strip around the day picked", () => {
    const days = stripDays(TODAY);
    expect(days).toHaveLength(9);
    expect(days[0]).toBe("2026-10-13");
    expect(days[2]).toBe(TODAY);
    expect(days[8]).toBe("2026-10-21");
  });

  it("names a day relative to today", () => {
    expect(relativeName(TODAY, TODAY)).toBe("Today");
    expect(relativeName("2026-10-16", TODAY)).toBe("Tomorrow");
    expect(relativeName("2026-10-14", TODAY)).toBe("Yesterday");
    expect(relativeName("2026-10-20", TODAY)).toBeNull();
    expect(dayLabel(TODAY)).toBe("Thursday, 15 Oct");
  });
});

describe("a day's list", () => {
  it("splits open from done and counts them", () => {
    const today = listFor(LISTS, TODAY);
    expect(openItems(today).map((i) => i.text)).toEqual(["Pay the bill", "Call Arif"]);
    expect(doneItems(today).map((i) => i.text)).toEqual(["Buy vegetables"]);
    expect(dayCount(today)).toEqual({ total: 3, done: 1 });
    expect(dayCount(null)).toEqual({ total: 0, done: 0 });
    expect(listFor(LISTS, "2026-10-17")).toBeNull();
  });

  it("says the count the way the strip does", () => {
    expect(dayCountText({ total: 0, done: 0 }, t)).toBe("");
    expect(dayCountText({ total: 4, done: 4 }, t)).toBe("4 done");
    expect(dayCountText({ total: 5, done: 3 }, t)).toBe("3 of 5");
    expect(dayCountText({ total: 3, done: 0 }, t)).toBe("3 tasks");
    expect(dayCountText({ total: 1, done: 0 }, t)).toBe("1 task");
  });

  it("finds tomorrow and the open tasks later in the week", () => {
    const next = upcoming(LISTS, TODAY);
    expect(next.tomorrow?.id).toBe("c");
    expect(next.later.map((x) => `${x.day} ${x.item.text}`)).toEqual(["2026-10-18 Report", "2026-10-20 Doctor"]);
  });

  it("replaces or adds a list", () => {
    const changed = withList(LISTS, list("b", TODAY, [["Only one", false]]));
    expect(changed).toHaveLength(LISTS.length);
    expect(listFor(changed, TODAY)?.items).toHaveLength(1);
    expect(withList(LISTS, list("z", "2026-11-01", []))).toHaveLength(LISTS.length + 1);
  });
});
