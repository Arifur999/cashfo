import { redirect } from "next/navigation";

// Retired -- "Expense Category" was merged with "Income Category" into the
// single two-column /categories page. Kept as a redirect stub (rather than
// deleted outright) so old bookmarks/back-button history don't 404.
export default async function BudgetPlanningPage({ searchParams }: PageProps<"/budget-planning">) {
  const params = await searchParams;
  const next = new URLSearchParams();
  if (typeof params.month === "string") next.set("month", params.month);
  if (typeof params.year === "string") next.set("year", params.year);
  const query = next.toString();
  redirect(query ? `/categories?${query}` : "/categories");
}
