import CouponStats from "@/components/modules/Admin/Subscriptions/Coupons/CouponStats";
import CouponsTable from "@/components/modules/Admin/Subscriptions/Coupons/CouponsTable";
import CreateCouponButton from "@/components/modules/Admin/Subscriptions/Coupons/CreateCouponButton";
import SubscriptionsTabs, { SUBSCRIPTIONS_PAGE } from "@/components/modules/Admin/Subscriptions/SubscriptionsTabs";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { formatDate } from "@/lib/date";
import { couponsQuery, couponStatsQuery } from "@/queries/coupon.queries";
import { plansQuery } from "@/queries/plan.queries";
import { getUserInfo } from "@/services/auth.services";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Coupons");

const CouponsPage = async () => {
  const admin = await getUserInfo();
  const canManageCoupons = canManage(admin?.role, "subscriptions");

  return (
    <div className="space-y-4">
      <PageHeader {...SUBSCRIPTIONS_PAGE} actions={canManageCoupons && <CreateCouponButton />} />
      <SubscriptionsTabs />
      <QueryPrefetch
        prefetch={(client) =>
          Promise.all([client.prefetchQuery(couponsQuery()), client.prefetchQuery(couponStatsQuery()), client.prefetchQuery(plansQuery())])
        }
      >
        <CouponStats month={formatDate(new Date(), "MMMM")} />
        <CouponsTable canManage={canManageCoupons} />
      </QueryPrefetch>
    </div>
  );
};

export default CouponsPage;
