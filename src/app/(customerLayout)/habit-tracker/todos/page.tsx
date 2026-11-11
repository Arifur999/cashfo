import { redirect } from "next/navigation";
import { TodoBoardPageClient, type TodoView } from "@/components/modules/Customer/HabitTracker/Todos/TodoBoardPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { isDayKey } from "@/lib/customer/todoDisplay";
import { getTodoCategories, getTodoLists, getTodoRepeats } from "@/lib/customer/todos";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/habit-tracker/todos");

const VIEWS: TodoView[] = ["day", "week", "someday"];

// /habit-tracker/todos?day=YYYY-MM-DD&view=week|someday; today's Day view
// when nothing is asked for. ?new=1 opens the New task popup (the Habit
// Tracker dashboard's Add task).
export default async function TodosPage({ searchParams }: PageProps<"/habit-tracker/todos">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const today = getAppToday();
  const day = isDayKey(typeof sp.day === "string" ? sp.day : undefined) ? (sp.day as string) : today;
  const view = VIEWS.find((each) => each === sp.view) ?? "day";
  const [lists, categories, repeats] = await Promise.all([getTodoLists(), getTodoCategories(), getTodoRepeats()]);

  return <TodoBoardPageClient lists={lists} categories={categories} repeats={repeats} day={day} view={view} today={today} openNew={sp.new === "1"} />;
}
