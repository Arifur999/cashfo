import { DollarSign, Percent, TrendingUp, Wallet } from "lucide-react";
import { getFailedPayments, getPayments } from "@/lib/payments";
import { getChurn, getRevenueSummary } from "@/lib/revenue";
import { getCurrentAdmin } from "@/lib/adminAuth";
import { PaymentsTableClient } from "@/components/payments/PaymentsTableClient";
import { RevenueTrendChart } from "@/components/payments/RevenueTrendChart";
import { SummaryCard } from "@/components/payments/SummaryCard";
import { TabsNav } from "@/components/ui/TabsNav";
import { t } from "@/lib/i18n/t";

interface PaymentsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

function formatMoney(amount: number, currency = "BDT") {
  return `${currency} ${amount.toLocaleString()}`;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const params = await searchParams;
  const isFailedView = params.view === "failed";

  const queryString = new URLSearchParams(
    Object.entries(params).filter(([k, v]) => v !== undefined && k !== "view") as [string, string][],
  ).toString();

  const admin = await getCurrentAdmin();
  const canSeeRevenue = admin?.role === "SUPER_ADMIN" || admin?.role === "FINANCE_ADMIN";

  const [{ data: payments, meta }, summary, churn] = await Promise.all([
    isFailedView ? getFailedPayments(queryString) : getPayments(queryString),
    canSeeRevenue ? getRevenueSummary() : Promise.resolve(null),
    canSeeRevenue ? getChurn() : Promise.resolve(null),
  ]);

  const monthOverMonthChange =
    summary && summary.lastMonthRevenue > 0
      ? ((summary.thisMonthRevenue - summary.lastMonthRevenue) / summary.lastMonthRevenue) * 100
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("Payments")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("Payment records, revenue, and refunds.")}</p>
      </div>

      {summary && churn && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={DollarSign}
              label={t("Total Revenue")}
              value={formatMoney(summary.totalRevenue)}
            />
            <SummaryCard
              icon={TrendingUp}
              label={t("This Month")}
              value={formatMoney(summary.thisMonthRevenue)}
              trend={monthOverMonthChange !== null ? { value: monthOverMonthChange, label: t("vs last month") } : null}
            />
            <SummaryCard icon={Wallet} label={t("MRR")} value={formatMoney(summary.mrr)} />
            <SummaryCard icon={Percent} label={t("Churn Rate")} value={`${churn.churnRatePercent}%`} />
          </div>

          <RevenueTrendChart trend={summary.revenueTrend} />
        </>
      )}

      <TabsNav
        tabs={[
          { label: t("All Payments"), href: "/admin/payments", exact: true },
          { label: t("Failed Payments"), href: "/admin/payments?view=failed", exact: true },
          { label: t("Invoices"), href: "/admin/invoices" },
        ]}
      />

      <PaymentsTableClient payments={payments} meta={meta} showFailureReason={isFailedView} />
    </div>
  );
}
