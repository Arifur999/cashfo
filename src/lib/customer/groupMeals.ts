// The sums behind a mess's meal sheet: what each meal counts for, a
// member's meals on a day in meal units, and the month's grid with its
// member and day totals. Pure, so the sheet, the drawer and the tests agree.
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

// A meal count as the sheet writes it: "2.5", "3", "½".
export const mealText = (value: number): string => (value === 0.5 ? "½" : String(round2(value)));
