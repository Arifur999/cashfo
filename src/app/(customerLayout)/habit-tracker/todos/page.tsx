import { redirect } from "next/navigation";
import { TodosListPageClient } from "@/components/modules/Customer/HabitTracker/Todos/TodosListPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { getTodoLists } from "@/lib/customer/todos";

export default async function TodosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const lists = await getTodoLists();

  return <TodosListPageClient lists={lists} />;
}
