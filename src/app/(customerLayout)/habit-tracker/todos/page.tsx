import { redirect } from "next/navigation";
import { TodoBoardPageClient } from "@/components/modules/Customer/HabitTracker/Todos/TodoBoardPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { isDayKey } from "@/lib/customer/todoDisplay";
import { getTodoLists } from "@/lib/customer/todos";
import { getAppToday } from "@/lib/date";

// /habit-tracker/todos?day=YYYY-MM-DD; today when no day is asked for.
export default async function TodosPage({ searchParams }: PageProps<"/habit-tracker/todos">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const today = getAppToday();
  const day = isDayKey(typeof sp.day === "string" ? sp.day : undefined) ? (sp.day as string) : today;
  const lists = await getTodoLists();

  return <TodoBoardPageClient lists={lists} day={day} today={today} />;
}
