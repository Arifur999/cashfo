// The sums behind a mess's meal sheet: what each meal counts for, a
// member's meals on a day in meal units, and the month's grid with its
// member and day totals. Pure, so the sheet, the drawer and the tests agree.
import { toLocaleDigits } from "@/lib/i18n/digits";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";
import type { GroupMeal, GroupSettings } from "./api";

export interface MealUnits {
  breakfast: number;
  lunch: number;
  dinner: number;
}

export const unitsOf = (settings: Pick<GroupSettings, "breakfastUnits" | "lunchUnits" | "dinnerUnits">): MealUnits => ({
  breakfast: Number(settings.breakfastUnits),
  lunch: Number(settings.lunchUnits),
  dinner: Number(settings.dinnerUnits),
});

const round2 = (value: number): number => Math.round(value * 100) / 100;

// A day's meals in meal units; each guest meal counts as one, on the member
// who brought the guest.
export function mealValue(meal: Pick<GroupMeal, "breakfast" | "lunch" | "dinner" | "guests">, units: MealUnits): number {
  return round2(meal.breakfast * units.breakfast + meal.lunch * units.lunch + meal.dinner * units.dinner + Number(meal.guests));
}

// Every day from `from` to `to`, both included (YYYY-MM-DD).
export function daysOf(from: string, to: string): string[] {
  const days: string[] = [];
  for (let t = Date.parse(`${from}T00:00:00.000Z`); t <= Date.parse(`${to}T00:00:00.000Z`) && days.length < 62; t += 86_400_000) days.push(new Date(t).toISOString().slice(0, 10));
  return days;
}

export interface MealSheet {
  // memberId -> day -> meal units and guest meals that day.
  cells: Record<string, Record<string, { value: number; guests: number }>>;
  memberTotals: Record<string, number>;
  dayTotals: Record<string, number>;
  total: number;
}

export function mealSheet(meals: GroupMeal[], units: MealUnits): MealSheet {
  const sheet: MealSheet = { cells: {}, memberTotals: {}, dayTotals: {}, total: 0 };
  for (const meal of meals) {
    const day = meal.date.slice(0, 10);
    const value = mealValue(meal, units);
    (sheet.cells[meal.groupMemberId] ??= {})[day] = { value, guests: Number(meal.guests) };
    sheet.memberTotals[meal.groupMemberId] = round2((sheet.memberTotals[meal.groupMemberId] ?? 0) + value);
    sheet.dayTotals[day] = round2((sheet.dayTotals[day] ?? 0) + value);
    sheet.total = round2(sheet.total + value);
  }
  return sheet;
}

// A meal count (or a member's share units) as the sheet writes it: "2.5",
// "3", "½", in the reader's digits ("২.৫").
export const mealText = (value: number, locale: FormatLocale = "en"): string => (value === 0.5 ? "½" : toLocaleDigits(String(round2(value)), locale));

// One member's meals on a day, as the day's drawer edits them.
export interface MealEntry {
  breakfast: number;
  lunch: number;
  dinner: number;
  guests: number;
}

export const NO_MEALS: MealEntry = { breakfast: 0, lunch: 0, dinner: 0, guests: 0 };

// Each member's saved meals on a day, from the month's meals.
export function mealsOnDay(meals: GroupMeal[], day: string): Record<string, MealEntry> {
  return Object.fromEntries(meals.filter((meal) => meal.date.slice(0, 10) === day).map((meal) => [meal.groupMemberId, { breakfast: meal.breakfast, lunch: meal.lunch, dinner: meal.dinner, guests: Number(meal.guests) }]));
}

const sameEntry = (a: MealEntry, b: MealEntry) => a.breakfast === b.breakfast && a.lunch === b.lunch && a.dinner === b.dinner && a.guests === b.guests;

// The members whose day differs from what is saved: only they are sent, so
// a save never writes zeros over the members nobody touched.
export function changedMeals(memberIds: string[], entries: Record<string, MealEntry>, saved: Record<string, MealEntry>): (MealEntry & { groupMemberId: string })[] {
  return memberIds.filter((id) => !sameEntry(entries[id] ?? NO_MEALS, saved[id] ?? NO_MEALS)).map((id) => ({ groupMemberId: id, ...(entries[id] ?? NO_MEALS) }));
}
