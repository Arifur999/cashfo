import { describe, expect, it } from "vitest";
import type { GroupMeal } from "./api";
import { changedMeals, daysOf, mealSheet, mealsOnDay, mealText, mealValue, unitsOf } from "./groupMeals";

const units = unitsOf({ breakfastUnits: "0.50", lunchUnits: "1.00", dinnerUnits: "1.00" });
const meal = (memberId: string, date: string, b: number, l: number, d: number, guests = 0): GroupMeal => ({ id: `${memberId}-${date}`, groupMemberId: memberId, date: `${date}T00:00:00.000Z`, breakfast: b, lunch: l, dinner: d, guests: String(guests) });

describe("meals", () => {
  it("counts a day in meal units, a guest meal as one", () => {
    expect(mealValue(meal("a", "2026-09-30", 1, 1, 1), units)).toBe(2.5);
    expect(mealValue(meal("a", "2026-09-30", 0, 1, 1, 1), units)).toBe(3);
  });

  it("lays the month out with member and day totals", () => {
    const sheet = mealSheet([meal("a", "2026-09-29", 1, 1, 1), meal("a", "2026-09-30", 0, 1, 1), meal("b", "2026-09-30", 1, 1, 1, 1)], units);
    expect(sheet.cells.a["2026-09-29"].value).toBe(2.5);
    expect(sheet.memberTotals).toEqual({ a: 4.5, b: 3.5 });
    expect(sheet.dayTotals["2026-09-30"]).toBe(5.5);
    expect(sheet.total).toBe(8);
    expect(sheet.cells.b["2026-09-30"].guests).toBe(1);
  });

  it("lists a range's days and writes a half as ½", () => {
    expect(daysOf("2026-09-29", "2026-10-02")).toEqual(["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
    expect(mealText(0.5)).toBe("½");
    expect(mealText(2.5)).toBe("2.5");
  });

  it("writes a count in the reader's digits", () => {
    expect(mealText(2.5, "bn")).toBe("২.৫");
    expect(mealText(12, "bn")).toBe("১২");
    expect(mealText(0.5, "bn")).toBe("½");
  });
});

describe("a day's meals in the drawer", () => {
  const month = [meal("a", "2026-09-29", 1, 1, 1), meal("b", "2026-09-29", 0, 1, 0, 1), meal("a", "2026-09-30", 0, 1, 1)];

  it("reads each member's saved day", () => {
    expect(mealsOnDay(month, "2026-09-29")).toEqual({ a: { breakfast: 1, lunch: 1, dinner: 1, guests: 0 }, b: { breakfast: 0, lunch: 1, dinner: 0, guests: 1 } });
    expect(mealsOnDay(month, "2026-10-01")).toEqual({});
  });

  it("sends only the members whose day changed, a cleared one as zeros", () => {
    const saved = mealsOnDay(month, "2026-09-29");
    const entries = { ...saved, a: { ...saved.a, dinner: 0 }, c: { breakfast: 0, lunch: 1, dinner: 1, guests: 0 } };
    expect(changedMeals(["a", "b", "c", "d"], entries, saved)).toEqual([
      { groupMemberId: "a", breakfast: 1, lunch: 1, dinner: 0, guests: 0 },
      { groupMemberId: "c", breakfast: 0, lunch: 1, dinner: 1, guests: 0 },
    ]);
    expect(changedMeals(["a", "b"], { ...saved, b: { breakfast: 0, lunch: 0, dinner: 0, guests: 0 } }, saved)).toEqual([{ groupMemberId: "b", breakfast: 0, lunch: 0, dinner: 0, guests: 0 }]);
    expect(changedMeals(["a", "b"], saved, saved)).toEqual([]);
  });
});
