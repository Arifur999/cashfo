import ReferralsTable from "@/components/modules/Admin/Referrals/ReferralsTable";
import { REFERRALS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/Referrals/payoutsTable.config";
import ReferralsTabs, { REFERRALS_PAGE_DESCRIPTION, REFERRALS_PAGE_TITLE } from "@/components/modules/Admin/Referrals/ReferralsTabs";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { adminPageTitle } from "@/lib/i18n/locale";
import { buildTableQueryString } from "@/lib/queryString";
import { referralsListQuery } from "@/queries/referral.queries";
import { getUserInfo } from "@/services/auth.services";

export const generateMetadata = adminPageTitle("Referrals");

// Every referral: who invited whom, what the friend bought, the commission.
const ReferralsListPage = async ({ searchParams }: PageProps<"/admin/referrals/list">) => {
  const [params, admin] = await Promise.all([searchParams, getUserInfo()]);
  const queryString = buildTableQueryString(params, REFERRALS_TABLE_BASE_CONFIG);

  return (
    <div className="space-y-4.5">
      <div className="flex flex-col gap-3">
        <PageHeader title={REFERRALS_PAGE_TITLE} description={REFERRALS_PAGE_DESCRIPTION.referrals} />
        <ReferralsTabs />
      </div>
      <QueryPrefetch prefetch={(client) => client.prefetchQuery(referralsListQuery(queryString))}>
        <ReferralsTable canManage={canManage(admin?.role, "referralPayouts")} />
      </QueryPrefetch>
    </div>
  );
};

export default ReferralsListPage;
