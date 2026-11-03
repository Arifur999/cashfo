import type { BooksOverview, Habit, HabitMonthLog, HabitMonthTracker, HabitToday, JournalSummary, Reminder, SkillsOverview, TodoList } from "@/lib/customer/api";

// Everything the Today page reads, gathered by the server page in one go.
export interface HabitsHomeData {
  today: string;
  // "Good afternoon" and the reader's first name, for the phone's heading.
  greeting: "Good morning" | "Good afternoon" | "Good evening";
  firstName: string;
  todayList: TodoList | null;
  namaz: HabitMonthTracker[];
  habits: Habit[];
  todayRows: HabitToday[];
  // This month's and last month's logs, for the last seven days.
  logs: HabitMonthLog[];
  books: BooksOverview | null;
  skills: SkillsOverview | null;
  challenges: HabitMonthTracker[];
  ramadan: HabitMonthTracker[];
  // Journal & notes: today written, the streak, the newest note.
  writing: JournalSummary | null;
  // Saved reminders, for a new habit's (null when they couldn't be read).
  reminders: Reminder[] | null;
}
