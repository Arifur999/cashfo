"use client";

import { Gift } from "lucide-react";
import { useState } from "react";
import EmptyState from "@/components/smartly/EmptyState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { ReferralInfo } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { EarningsHero } from "./EarningsHero";
import { FriendsTable } from "./FriendsTable";
import { HowItWorksCard } from "./HowItWorksCard";
import { InviteLinkCard } from "./InviteLinkCard";
import { WithdrawDialog } from "./WithdrawDialog";

interface ReferralsPageClientProps {
  businessId: string;
  info: ReferralInfo | null;
  currency: string;
  // Only an owner or accountant can post the withdrawal into a wallet.
  canManage: boolean;
  // Where the app is served from, for the invite link.
  origin: string;
}

// Account › Invite & earn: what is ready to withdraw, the invite link, and
// every friend who joined with it.
export function ReferralsPageClient({ businessId, info, currency, canManage, origin }: ReferralsPageClientProps) {
  const { t } = useLocale();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const reward = info ? formatCurrency(info.rewardAmountPerReferral, currency) : "";

  return (
    <PageFrame className="gap-5">
      <PageHeader eyebrow={t("Account")} tone="neutral" title={t("Invite & earn")} description={info ? `${t("Share Smartly with friends and family. You earn")} ${reward} ${t("for every friend who joins and stays 30 days.")}` : t("Share Smartly with friends and family and earn a reward for every friend who joins.")} />
      {!info ? (
        <EmptyState icon={<Gift />} tone="neutral" title={t("Couldn't load your invite details")} description={t("Refresh the page to try again.")} />
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_470px]">
            <EarningsHero info={info} currency={currency} canWithdraw={canManage} onWithdraw={() => setWithdrawOpen(true)} />
            <InviteLinkCard code={info.referralCode} origin={origin} rewardPerReferral={info.rewardAmountPerReferral} currency={currency} />
          </div>
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <FriendsTable entries={info.recentReferrals} currency={currency} />
            <HowItWorksCard reward={reward} />
          </div>
          <WithdrawDialog open={withdrawOpen} onClose={() => setWithdrawOpen(false)} businessId={businessId} availableBalance={info.availableBalance} currency={currency} />
        </>
      )}
    </PageFrame>
  );
}
