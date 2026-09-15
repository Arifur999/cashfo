import { redirect } from "next/navigation";
import { ReportsOverviewPageClient } from "@/components/reports/ReportsOverviewPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getCurrentUser } from "@/lib/auth";
import { resolveDateRange, type DateRangePreset } from "@/lib/dateRangePresets";
import { getCategoryBreakdown, getIncomeVsSavingsTrend } from "@/lib/reports";

export default async function ReportsOverviewPage({ searchParams }: PageProps<"/reports/overview">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const currency = activeBusiness?.currency ?? "BDT";

  // Defaults to "This Month" (not "All Time", unlike most other list pages
  // in this app) -- the user's explicit request for this page.
  const range = (typeof params.range === "string" ? params.range : "this-month") as DateRangePreset;
  const customFrom = typeof params.dateFrom === "string" ? params.dateFrom : undefined;
  const customTo = typeof params.dateTo === "string" ? params.dateTo : undefined;
  const { dateFrom, dateTo } = resolveDateRange(range, customFrom, customTo);

  const [income, expense, trend] = await Promise.all([
    getCategoryBreakdown(activeBusinessId, "INCOME", dateFrom, dateTo),
    getCategoryBreakdown(activeBusinessId, "EXPENSE", dateFrom, dateTo),
    getIncomeVsSavingsTrend(activeBusinessId, 6),
  ]);

  return (
    <ReportsOverviewPageClient
      income={income}
      expense={expense}
      trend={trend}
      currency={currency}
      range={range}
      customFrom={customFrom}
      customTo={customTo}
    />
  );
}
