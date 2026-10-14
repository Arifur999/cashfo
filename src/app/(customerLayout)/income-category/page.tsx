import { redirect } from "next/navigation";
import { IncomeSourcesPageClient } from "@/components/modules/Customer/Budget/IncomeSourcesPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getBudgetOverview } from "@/lib/customer/budgets";
import { appYearMonth } from "@/lib/customer/dateRangePresets";
import { getCategoryBreakdown } from "@/lib/customer/reports";

const pad = (n: number) => String(n).padStart(2, "0");
const lastDayOf = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

// Income sources: the income categories and what each brought in.
export default async function IncomeSourcesPage({ searchParams }: PageProps<"/income-category">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const { year: thisYear, month: thisMonth } = appYearMonth();
  const month = typeof params.month === "string" ? Number(params.month) || thisMonth : thisMonth;
  const year = typeof params.year === "string" ? Number(params.year) || thisYear : thisYear;
  const previousYear = month === 1 ? year - 1 : year;
  const previousMonth = month === 1 ? 12 : month - 1;

  const [overview, lastMonth, thisYearBreakdown] = await Promise.all([
    getBudgetOverview(activeBusinessId, month, year, "INCOME"),
    getCategoryBreakdown(activeBusinessId, "INCOME", `${previousYear}-${pad(previousMonth)}-01`, `${previousYear}-${pad(previousMonth)}-${pad(lastDayOf(previousYear, previousMonth))}`),
    getCategoryBreakdown(activeBusinessId, "INCOME", `${year}-01-01`, `${year}-${pad(month)}-${pad(lastDayOf(year, month))}`),
  ]);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const byName = (rows: { name: string; amount: string }[]) => Object.fromEntries(rows.map((row) => [row.name, Number(row.amount)]));

  return (
    <IncomeSourcesPageClient
      businessId={activeBusinessId}
      overview={overview}
      lastMonth={byName(lastMonth.categories)}
      thisYear={byName(thisYearBreakdown.categories)}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
    />
  );
}
