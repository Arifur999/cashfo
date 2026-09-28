import { notFound, redirect } from "next/navigation";
import { TodosDetailPageClient } from "@/components/habit-tracker/todos/TodosDetailPageClient";
import { getCurrentUser } from "@/lib/auth";
import { getTodoList } from "@/lib/todos";

export default async function TodoDetailPage({ params }: PageProps<"/habit-tracker/todos/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const list = await getTodoList(id);
  if (!list) notFound();

  return <TodosDetailPageClient list={list} />;
}
