import CreatePlanButton from "@/components/modules/Admin/Subscriptions/Plans/CreatePlanButton";
import PlansBoard from "@/components/modules/Admin/Subscriptions/Plans/PlansBoard";
import SubscriptionsTabs, { SUBSCRIPTIONS_PAGE } from "@/components/modules/Admin/Subscriptions/SubscriptionsTabs";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { planAnalyticsQuery, plansQuery } from "@/queries/plan.queries";
import { getUserInfo } from "@/services/auth.services";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Plans");

const PlansPage = async () => {
  const admin = await getUserInfo();
  const canManagePlans = canManage(admin?.role, "subscriptions");

  return (
    <div className="space-y-4">
      <PageHeader {...SUBSCRIPTIONS_PAGE} actions={canManagePlans && <CreatePlanButton />} />
      <SubscriptionsTabs />
      <QueryPrefetch prefetch={(client) => Promise.all([client.prefetchQuery(plansQuery()), client.prefetchQuery(planAnalyticsQuery())])}>
        <PlansBoard canManage={canManagePlans} />
      </QueryPrefetch>
    </div>
  );
};

export default PlansPage;
