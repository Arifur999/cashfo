import type { Metadata } from "next";
import CreatePlanDialog from "@/components/modules/Admin/Subscriptions/Plans/CreatePlanDialog";
import PlansBoard from "@/components/modules/Admin/Subscriptions/Plans/PlansBoard";
import SubscriptionsTabs from "@/components/modules/Admin/Subscriptions/SubscriptionsTabs";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { planAnalyticsQuery, plansQuery } from "@/queries/plan.queries";
import { getUserInfo } from "@/services/auth.services";

export const metadata: Metadata = { title: "Subscription Plans" };

const PlansPage = async () => {
  const admin = await getUserInfo();
  const canManagePlans = canManage(admin?.role, "subscriptions");

  return (
    <div className="space-y-6">
      <SubscriptionsTabs />
      <PageHeader
        title="Subscription Plans"
        description="Manage pricing, feature limits, and availability."
        actions={canManagePlans && <CreatePlanDialog />}
      />
      <QueryPrefetch
        prefetch={(client) => Promise.all([client.prefetchQuery(plansQuery()), client.prefetchQuery(planAnalyticsQuery())])}
      >
        <PlansBoard canManage={canManagePlans} />
      </QueryPrefetch>
    </div>
  );
};

export default PlansPage;
