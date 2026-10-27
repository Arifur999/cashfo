import PaymentsTabs, { PAYMENTS_PAGE } from "@/components/modules/Admin/Payments/PaymentsTabs";
import ByPlanCard from "@/components/modules/Admin/Revenue/ByPlanCard";
import MrrHistoryCard from "@/components/modules/Admin/Revenue/MrrHistoryCard";
import RevenueFacts from "@/components/modules/Admin/Revenue/RevenueFacts";
import RevenueKpis from "@/components/modules/Admin/Revenue/RevenueKpis";
import PageHeader from "@/components/shared/PageHeader";
import { getRevenueOverview } from "@/services/revenue.services";
import { getReferrals } from "@/services/referral.services";
import { dhakaMonthKey, referredPaidThisMonth } from "@/components/modules/Admin/Revenue/revenueDisplay";
import { adminPageTitle } from "@/lib/i18n/locale";
import { ExportButton, ExportProvider } from "@/components/shared/ExportAction";
import RevenueExport from "@/components/modules/Admin/Revenue/RevenueExport";

export const generateMetadata = adminPageTitle("Revenue");

// Finance roles only: proxy.ts keeps everyone else out of this route.
const RevenuePage = async () => {
  const [{ data: overview }, referrals] = await Promise.all([
    getRevenueOverview(),
    // The newest referrals, for "From referrals"; none when they can't be read.
    getReferrals("page=1&limit=100")
      .then((response) => response.data)
      .catch(() => null),
  ]);
  const fromReferrals = referrals ? referredPaidThisMonth(referrals, overview.month || dhakaMonthKey(new Date())) : null;

  return (
    <ExportProvider>
      <div className="space-y-4">
        <PageHeader {...PAYMENTS_PAGE} actions={<ExportButton hint="Download MRR at the end of each month as CSV" />} />
        <PaymentsTabs showRevenue />
        <RevenueExport history={overview.mrrHistory} />
        <RevenueKpis overview={overview} />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <MrrHistoryCard history={overview.mrrHistory} />
          <ByPlanCard overview={overview} />
        </div>
        <RevenueFacts overview={overview} fromReferrals={fromReferrals} />
      </div>
    </ExportProvider>
  );
};

export default RevenuePage;
