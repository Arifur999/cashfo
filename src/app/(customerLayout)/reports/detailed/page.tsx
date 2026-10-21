import { redirect } from "next/navigation";
import { ReportsPageClient } from "@/components/modules/Customer/Insights/ReportsPageClient";
import { getWallets } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { rangeLabel } from "@/lib/customer/insights";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getMonthlyBreakdown } from "@/lib/customer/reports";
import { incomeYear, reportPeriodFrom, reportRange, reportShowFrom } from "@/lib/customer/reportTable";
import { getAppToday } from "@/lib/date";
import { getLocale } from "@/lib/i18n/locale";

export const generateMetadata = () => customerPageMetadata("/reports/detailed");

// Insights › Reports: income and expense by category, a column per month.
export default async function ReportsPage({ searchParams }: PageProps<"/reports/detailed">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const locale = await getLocale();
  const today = getAppToday();
  const period = reportPeriodFrom(params.period);
  const show = reportShowFrom(params.show);
  const range = reportRange(period, today);

  const wallets = await getWallets(activeBusinessId);
  // Only a wallet of this workspace: the URL is anyone's to edit.
  const walletId = typeof params.wallet === "string" && wallets.some((w) => w.id === params.wallet) ? params.wallet : null;

  const [income, expense] = await Promise.all([
    getMonthlyBreakdown(activeBusinessId, "INCOME", range.dateFrom, range.dateTo, walletId ?? undefined),
    getMonthlyBreakdown(activeBusinessId, "EXPENSE", range.dateFrom, range.dateTo, walletId ?? undefined),
  ]);

  // The income years' options name the whole July–June span they belong to.
  const thisIncomeYear = incomeYear(today);
  const lastIncomeYear = incomeYear(today, -1);

  return (
    <ReportsPageClient
      currency={activeBusiness?.currency ?? "BDT"}
      income={income}
      expense={expense}
      wallets={wallets}
      period={period}
      walletId={walletId}
      show={show}
      range={range}
      rangeLabel={rangeLabel(range.dateFrom, range.dateTo, locale)}
      periodSpans={{
        "this-tax-year": rangeLabel(thisIncomeYear.dateFrom, thisIncomeYear.dateTo, locale, "short"),
        "last-tax-year": rangeLabel(lastIncomeYear.dateFrom, lastIncomeYear.dateTo, locale, "short"),
      }}
    />
  );
}
