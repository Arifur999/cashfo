import { redirect } from "next/navigation";

// Retired -- Budget planning became Budget (/categories), the spending
// limits, while income moved to Income sources. Kept as a redirect stub
// (rather than deleted outright) so old bookmarks and back-button history
// don't 404; it keeps the month asked for.
export default async function BudgetPlanningPage({ searchParams }: PageProps<"/budget-planning">) {
  const params = await searchParams;
  const next = new URLSearchParams();
  if (typeof params.month === "string") next.set("month", params.month);
  if (typeof params.year === "string") next.set("year", params.year);
  const query = next.toString();
  redirect(query ? `/categories?${query}` : "/categories");
}
