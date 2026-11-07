import { redirect } from "next/navigation";
import { ReportsPageClient } from "@/components/modules/Customer/Insights/ReportsPageClient";
import { getWallets } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getFmt } from "@/lib/customer/fmt";
import { rangeLabel } from "@/lib/customer/insights";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getMonthlyBreakdown } from "@/lib/customer/reports";
import { incomeYear, incomeYearSpan, reportPeriodFrom, reportRange, reportShowFrom } from "@/lib/customer/reportTable";
import { getAppToday } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";

export const generateMetadata = () => customerPageMetadata("/reports/categories");

// Insights › Reports: income and expense by category, a column per month.
export default async function ReportsPage({ searchParams }: PageProps<"/reports/categories">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const fmt = await getFmt();
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

  // The income years' options name their year as the return does,
  // "(2025–26)": short, so the select stays as narrow as its other options.
  const yearSpan = (offset: number) => toLocaleDigits(incomeYearSpan(incomeYear(today, offset)), fmt);

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
      rangeLabel={rangeLabel(range.dateFrom, range.dateTo, fmt)}
      periodSpans={{
        "this-tax-year": yearSpan(0),
        "last-tax-year": yearSpan(-1),
      }}
    />
  );
}
