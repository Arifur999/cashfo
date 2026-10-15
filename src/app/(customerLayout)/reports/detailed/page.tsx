import { redirect } from "next/navigation";
import { ReportsPageClient } from "@/components/modules/Customer/Insights/ReportsPageClient";
import { getWallets } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { resolveDateRange } from "@/lib/customer/dateRangePresets";
import { monthName } from "@/lib/customer/insights";
import { getMonthlyBreakdown } from "@/lib/customer/reports";
import { reportPeriodFrom, reportShowFrom } from "@/lib/customer/reportTable";
import { getLocale } from "@/lib/i18n/locale";

// Insights › Reports: income and expense by category, a column per month.
export default async function ReportsPage({ searchParams }: PageProps<"/reports/detailed">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const locale = await getLocale();
  const period = reportPeriodFrom(params.period);
  const show = reportShowFrom(params.show);
  const { dateFrom, dateTo } = resolveDateRange(period) as { dateFrom: string; dateTo: string };

  const wallets = await getWallets(activeBusinessId);
  // Only a wallet of this workspace: the URL is anyone's to edit.
  const walletId = typeof params.wallet === "string" && wallets.some((w) => w.id === params.wallet) ? params.wallet : null;

  const [income, expense] = await Promise.all([
    getMonthlyBreakdown(activeBusinessId, "INCOME", dateFrom, dateTo, walletId ?? undefined),
    getMonthlyBreakdown(activeBusinessId, "EXPENSE", dateFrom, dateTo, walletId ?? undefined),
  ]);

  const from = dateFrom.slice(0, 7);
  const to = dateTo.slice(0, 7);
  const rangeLabel = from === to ? monthName(from, locale, "long", true) : `${monthName(from, locale, "long")}–${monthName(to, locale, "long", true)}`;

  return <ReportsPageClient currency={activeBusiness?.currency ?? "BDT"} income={income} expense={expense} wallets={wallets} period={period} walletId={walletId} show={show} rangeLabel={rangeLabel} />;
}
