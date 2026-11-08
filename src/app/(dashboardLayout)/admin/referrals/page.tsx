import PayoutStats from "@/components/modules/Admin/Referrals/PayoutStats";
import PayoutsTable from "@/components/modules/Admin/Referrals/PayoutsTable";
import { PAYOUTS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/Referrals/payoutsTable.config";
import ReferralsTabs, { REFERRALS_PAGE_DESCRIPTION, REFERRALS_PAGE_TITLE } from "@/components/modules/Admin/Referrals/ReferralsTabs";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { formatCount } from "@/lib/i18n/digits";
import { adminPageTitle, getTranslator } from "@/lib/i18n/locale";
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
  const [params, admin, settings, { t, locale }] = await Promise.all([searchParams, getUserInfo(), getReferralSettings().catch(() => null), getTranslator("admin")]);
  const queryString = buildTableQueryString(params, PAYOUTS_TABLE_BASE_CONFIG);
  const payoutId = typeof params[PAYOUT_PARAM] === "string" ? params[PAYOUT_PARAM] : null;
  const holdDays = settings?.data.holdDays ?? null;
  // The board's chip beside the title: the program's two numbers.
  const rules = settings?.data ? (
    <span className="flex h-8 items-center gap-1.5 rounded-full border border-emerald-line bg-emerald-soft px-3 text-[13px] font-semibold whitespace-nowrap text-brand-ink">
      {t("Commission {pct}% of every payment · {days}-day hold", { pct: formatCount(settings.data.commissionPct, locale), days: formatCount(settings.data.holdDays, locale) })}
    </span>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <PageHeader title={REFERRALS_PAGE_TITLE} description={REFERRALS_PAGE_DESCRIPTION.payouts} actions={rules} />
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
