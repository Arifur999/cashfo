// A TodoList's `date` is a plain "YYYY-MM-DD" with no time component --
// parsed at UTC midnight and formatted with `undefined` (browser/server
// default locale), same as every other date display in this app (e.g.
// HabitDashboardPageClient's header date), not tied to the bn/en toggle.
export function formatTodoDate(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
