import { redirect } from "next/navigation";

// Retired -- Income planning became Income sources (/income-category), the
// income side of the money pages, while Budget kept the spending limits.
// Kept as a redirect stub (rather than deleted outright) so old bookmarks
// and back-button history don't 404; it keeps the month asked for.
export default async function IncomePlanningPage({ searchParams }: PageProps<"/income-planning">) {
  const params = await searchParams;
  const next = new URLSearchParams();
  if (typeof params.month === "string") next.set("month", params.month);
  if (typeof params.year === "string") next.set("year", params.year);
  const query = next.toString();
  redirect(query ? `/income-category?${query}` : "/income-category");
}
