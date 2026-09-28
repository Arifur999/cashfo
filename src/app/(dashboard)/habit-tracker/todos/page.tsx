import { redirect } from "next/navigation";
import { TodosListPageClient } from "@/components/habit-tracker/todos/TodosListPageClient";
import { getCurrentUser } from "@/lib/auth";
import { getTodoLists } from "@/lib/todos";

export default async function TodosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const lists = await getTodoLists();

  return <TodosListPageClient lists={lists} />;
}
