import PayoutStats from "@/components/modules/Admin/Referrals/PayoutStats";
import PayoutsTable from "@/components/modules/Admin/Referrals/PayoutsTable";
import { PAYOUTS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/Referrals/payoutsTable.config";
import ReferralsTabs, { REFERRALS_PAGE_DESCRIPTION, REFERRALS_PAGE_TITLE } from "@/components/modules/Admin/Referrals/ReferralsTabs";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { adminPageTitle } from "@/lib/i18n/locale";
import { buildTableQueryString } from "@/lib/queryString";
import { payoutStatsQuery } from "@/queries/navBadge.queries";
import { payoutDetailQuery, payoutsListQuery } from "@/queries/referral.queries";
import { getUserInfo } from "@/services/auth.services";
import { getReferralSettings } from "@/services/referral.services";
import { PAYOUT_PARAM } from "@/components/modules/Admin/Referrals/payoutsDisplay";

export const generateMetadata = adminPageTitle("Referrals & Payouts");

// The payout desk: the four figures, then every request with its checks
// and next step. ?payout=<id> opens that request (the admin bell links so).
const ReferralPayoutsPage = async ({ searchParams }: PageProps<"/admin/referrals">) => {
  const [params, admin, settings] = await Promise.all([searchParams, getUserInfo(), getReferralSettings().catch(() => null)]);
  const queryString = buildTableQueryString(params, PAYOUTS_TABLE_BASE_CONFIG);
  const payoutId = typeof params[PAYOUT_PARAM] === "string" ? params[PAYOUT_PARAM] : null;
  const holdDays = settings?.data.holdDays ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <PageHeader title={REFERRALS_PAGE_TITLE} description={REFERRALS_PAGE_DESCRIPTION.payouts} />
        <ReferralsTabs />
      </div>
      <QueryPrefetch
        prefetch={(client) =>
          Promise.all([
            client.prefetchQuery(payoutStatsQuery()),
            client.prefetchQuery(payoutsListQuery(queryString)),
            payoutId ? client.prefetchQuery(payoutDetailQuery(payoutId)) : null,
          ])
        }
      >
        <PayoutStats holdDays={holdDays} />
        <PayoutsTable canManage={canManage(admin?.role, "referralPayouts")} />
      </QueryPrefetch>
    </div>
  );
};

export default ReferralPayoutsPage;
