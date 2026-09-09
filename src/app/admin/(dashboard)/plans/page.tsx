import { getCurrentAdmin } from "@/lib/adminAuth";
import { getPlanAnalytics, getSubscriptionPlans } from "@/lib/subscriptionPlans";
import { PlansPageClient } from "@/components/plans/PlansPageClient";
import { SubscriptionsTabs } from "@/components/plans/SubscriptionsTabs";

export default async function PlansPage() {
  const [plans, analytics, admin] = await Promise.all([
    getSubscriptionPlans(),
    getPlanAnalytics(),
    getCurrentAdmin(),
  ]);

  const canManage = admin?.role === "SUPER_ADMIN" || admin?.role === "FINANCE_ADMIN";

  return (
    <div className="space-y-6">
      <SubscriptionsTabs />
      <PlansPageClient plans={plans} analytics={analytics} canManage={canManage} />
    </div>
  );
}
