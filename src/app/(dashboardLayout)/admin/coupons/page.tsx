import type { Metadata } from "next";
import CouponsTable from "@/components/modules/Admin/Subscriptions/Coupons/CouponsTable";
import CreateCouponDialog from "@/components/modules/Admin/Subscriptions/Coupons/CreateCouponDialog";
import SubscriptionsTabs from "@/components/modules/Admin/Subscriptions/SubscriptionsTabs";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { couponsQuery } from "@/queries/coupon.queries";
import { plansQuery } from "@/queries/plan.queries";
import { getUserInfo } from "@/services/auth.services";

export const metadata: Metadata = { title: "Coupons" };

const CouponsPage = async () => {
  const admin = await getUserInfo();
  const canManageCoupons = canManage(admin?.role, "subscriptions");

  return (
    <div className="space-y-6">
      <SubscriptionsTabs />
      <QueryPrefetch prefetch={(client) => Promise.all([client.prefetchQuery(couponsQuery()), client.prefetchQuery(plansQuery())])}>
        <PageHeader
          title="Coupons"
          description="Discount codes for subscription plans."
          actions={canManageCoupons && <CreateCouponDialog />}
        />
        <CouponsTable canManage={canManageCoupons} />
      </QueryPrefetch>
    </div>
  );
};

export default CouponsPage;
