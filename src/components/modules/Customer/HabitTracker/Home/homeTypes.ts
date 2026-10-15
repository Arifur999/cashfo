import type { BooksOverview, Habit, HabitMonthLog, HabitMonthTracker, HabitToday, SkillsOverview } from "@/lib/customer/api";

// Everything the Today page reads, gathered by the server page in one go.
export interface HabitsHomeData {
  today: string;
  namaz: HabitMonthTracker[];
  habits: Habit[];
  todayRows: HabitToday[];
  // This month's and last month's logs, for the last seven days.
  logs: HabitMonthLog[];
  books: BooksOverview | null;
  skills: SkillsOverview | null;
  challenges: HabitMonthTracker[];
  ramadan: HabitMonthTracker[];
}
