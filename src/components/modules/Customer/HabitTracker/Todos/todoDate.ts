import { formatDate } from "@/lib/customer/date";

// A TodoList's `date` is a plain "YYYY-MM-DD" with no time component --
// parsed at UTC midnight, which is the same calendar day in the platform
// timezone (UTC+6), and formatted like every other date in the app. Not
// tied to the bn/en toggle.
export function formatTodoDate(dateKey: string): string {
  return formatDate(`${dateKey}T00:00:00.000Z`, "EEE, d MMM yyyy");
}
