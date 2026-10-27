import ReferralSettingsForm from "@/components/modules/Admin/Referrals/ReferralSettingsForm";
import ReferralsTabs, { REFERRALS_PAGE_DESCRIPTION, REFERRALS_PAGE_TITLE } from "@/components/modules/Admin/Referrals/ReferralsTabs";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { adminPageTitle } from "@/lib/i18n/locale";
import { plansQuery } from "@/queries/plan.queries";
import { referralSettingsQuery } from "@/queries/referral.queries";
import { getUserInfo } from "@/services/auth.services";

export const generateMetadata = adminPageTitle("Referral settings");

// What people earn, what their friends save, how withdrawals work and the
// fraud checks. Every admin reads them; super and finance admins change them.
const ReferralSettingsPage = async () => {
  const admin = await getUserInfo();
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <PageHeader title={REFERRALS_PAGE_TITLE} description={REFERRALS_PAGE_DESCRIPTION.settings} />
        <ReferralsTabs />
      </div>
      <QueryPrefetch prefetch={(client) => Promise.all([client.prefetchQuery(referralSettingsQuery()), client.prefetchQuery(plansQuery())])}>
        <ReferralSettingsForm canManage={canManage(admin?.role, "referralPayouts")} />
      </QueryPrefetch>
    </div>
  );
};

export default ReferralSettingsPage;
