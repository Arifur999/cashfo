"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ErrorState from "@/components/smartly/ErrorState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { ReferralInfo } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { NAV_FOOT_LABEL } from "@/lib/customer/nav";
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
  // A business workspace's name, so the dialog says whose wallet the money
  // lands in; null in the reader's own personal one.
  workspaceName: string | null;
  // Where the app is served from, for the invite link.
  origin: string;
  // The app's "YYYY-MM-DD", read on the server so both renders agree.
  today: string;
}

// Account › Invite & earn: what is ready to withdraw, the invite link, and
// every friend who joined with it. On a phone the top bar names the page,
// so the heading is there for screen readers only, and How it works folds
// into one row under the list.
export function ReferralsPageClient({ businessId, info, currency, canManage, workspaceName, origin, today }: ReferralsPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const reward = info ? formatCurrency(info.rewardAmountPerReferral, currency, locale) : "";

  return (
    <PageFrame className="max-md:pt-4 md:gap-5">
      <PageHeader
        className="max-md:sr-only"
        eyebrow={t(NAV_FOOT_LABEL)}
        tone="neutral"
        title={t("Invite & earn")}
        description={info ? t("Share Smartly with friends and family. You earn {reward} for every friend who joins, ready to withdraw 30 days later.", { reward }) : t("Share Smartly with friends and family and earn a reward for every friend who joins.")}
      />
      {!info ? (
        <ErrorState title={t("Couldn't load your invite details")} onRetry={() => router.refresh()} />
      ) : (
        <>
          <div className="grid gap-4 md:gap-5 xl:grid-cols-[minmax(0,1fr)_470px]">
            <EarningsHero info={info} currency={currency} canWithdraw={canManage} today={today} onWithdraw={() => setWithdrawOpen(true)} />
            <InviteLinkCard code={info.referralCode} origin={origin} rewardPerReferral={info.rewardAmountPerReferral} currency={currency} />
          </div>
          {/* Side by side from xl only, like the row above: at lg the
              sidebar and a 340px column left the names no room. */}
          <div className="grid items-start gap-4 md:gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <FriendsTable info={info} currency={currency} today={today} />
            <HowItWorksCard reward={reward} />
          </div>
          <WithdrawDialog open={withdrawOpen} onClose={() => setWithdrawOpen(false)} businessId={businessId} availableBalance={info.availableBalance} currency={currency} workspaceName={workspaceName} />
        </>
      )}
    </PageFrame>
  );
}
