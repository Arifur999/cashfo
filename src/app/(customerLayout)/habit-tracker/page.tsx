import { redirect } from "next/navigation";
import { HabitsHomePageClient } from "@/components/modules/Customer/HabitTracker/Home/HabitsHomePageClient";
import type { HabitsHomeData } from "@/components/modules/Customer/HabitTracker/Home/homeTypes";
import { getCurrentUser } from "@/lib/customer/auth";
import { getBooksOverview } from "@/lib/customer/books";
import { greetingFor, hourIn } from "@/lib/customer/greeting";
import { shiftMonth } from "@/lib/customer/groupDisplay";
import { getHabitMonth, getHabits, getHabitsToday, getHabitTrackers } from "@/lib/customer/habits";
import { getSkillsOverview } from "@/lib/customer/skills";
import { listFor } from "@/lib/customer/todoDisplay";
import { getTodoLists } from "@/lib/customer/todos";
import { APP_TIME_ZONE, getAppToday } from "@/lib/date";

// Habits › Today: the day across every habit feature. Personal
// (user-scoped), not a workspace's.
export default async function HabitsTodayPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = getAppToday();
  const month = today.slice(0, 7);
  const [namaz, habits, todayRows, thisMonth, lastMonth, books, skills, challenges, ramadan, todoLists] = await Promise.all([
    getHabitTrackers("Namaz"),
    getHabits(true),
    getHabitsToday(),
    getHabitMonth(month),
    getHabitMonth(shiftMonth(month, -1)),
    getBooksOverview(),
    getSkillsOverview(),
    getHabitTrackers("Others"),
    getHabitTrackers("Ramadan"),
    getTodoLists(),
  ]);

  const data: HabitsHomeData = {
    today,
    greeting: greetingFor(hourIn(APP_TIME_ZONE)),
    firstName: user.name.trim().split(/\s+/)[0] || user.name,
    todayList: listFor(todoLists, today),
    namaz,
    habits,
    todayRows,
    logs: [...lastMonth.logs, ...thisMonth.logs],
    books,
    skills,
    challenges,
    ramadan,
  };
  return <HabitsHomePageClient data={data} />;
}
