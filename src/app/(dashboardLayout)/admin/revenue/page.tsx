import PaymentsTabs, { PAYMENTS_PAGE } from "@/components/modules/Admin/Payments/PaymentsTabs";
import ByPlanCard from "@/components/modules/Admin/Revenue/ByPlanCard";
import MrrHistoryCard from "@/components/modules/Admin/Revenue/MrrHistoryCard";
import RevenueFacts from "@/components/modules/Admin/Revenue/RevenueFacts";
import RevenueKpis from "@/components/modules/Admin/Revenue/RevenueKpis";
import PageHeader from "@/components/shared/PageHeader";
import { getRevenueOverview } from "@/services/revenue.services";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Revenue");

// Finance roles only: proxy.ts keeps everyone else out of this route.
const RevenuePage = async () => {
  const { data: overview } = await getRevenueOverview();

  return (
    <div className="space-y-4">
      <PageHeader {...PAYMENTS_PAGE} />
      <PaymentsTabs showRevenue />
      <RevenueKpis overview={overview} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <MrrHistoryCard history={overview.mrrHistory} />
        <ByPlanCard overview={overview} />
      </div>
      <RevenueFacts overview={overview} />
    </div>
  );
};

export default RevenuePage;
