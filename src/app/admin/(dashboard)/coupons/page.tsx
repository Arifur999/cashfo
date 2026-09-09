import { getCurrentAdmin } from "@/lib/adminAuth";
import { getCoupons } from "@/lib/coupons";
import { getSubscriptionPlanOptions } from "@/lib/subscriptionPlans";
import { CouponsPageClient } from "@/components/coupons/CouponsPageClient";
import { SubscriptionsTabs } from "@/components/plans/SubscriptionsTabs";

export default async function CouponsPage() {
  const [coupons, plans, admin] = await Promise.all([getCoupons(), getSubscriptionPlanOptions(), getCurrentAdmin()]);

  const canManage = admin?.role === "SUPER_ADMIN" || admin?.role === "FINANCE_ADMIN";

  return (
    <div className="space-y-6">
      <SubscriptionsTabs />
      <CouponsPageClient coupons={coupons} plans={plans} canManage={canManage} />
    </div>
  );
}
