"use client";

import { Check, Lock, PauseCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import ErrorState from "@/components/smartly/ErrorState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { PLANS_ROUTE } from "@/lib/customer/nav";
import { programOf, showsLockedPage } from "@/lib/customer/referralDisplay";
import type { ReferralProgramInfo } from "@/lib/customer/referralTypes";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { EarningsByMonthCard, LatestCommissionsCard, PeopleCard, TopFriendsCard } from "./DashboardCards";
import { EarningsHero } from "./EarningsHero";
import { InviteLinkCard } from "./InviteLinkCard";
import { ReferralLocked } from "./ReferralLocked";

interface ReferralsPageClientProps {
  info: ReferralProgramInfo | null;
  currency: string;
  // Where the app is served from, for the invite link.
  origin: string;
  // The app's "YYYY-MM-DD", read on the server so both renders agree.
  today: string;
}

// Referrals > Dashboard (ReferralDashboard): what is ready to withdraw, the
// invite link, earnings by month, the people brought, who earns the most
// and the latest commissions. A member who can't earn yet and has nothing
// from the program sees the Free-plan page instead (ReferralLocked).
export function ReferralsPageClient({ info, currency, origin, today }: ReferralsPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();

  if (!info) {
    return (
      <PageFrame className="max-md:pt-4 md:gap-5">
        <TopbarExtras title={t("Referral Program")} />
        <ErrorState title={t("Couldn't load your invite details")} onRetry={() => router.refresh()} />
      </PageFrame>
    );
  }

  const program = programOf(info);
  const pct = (value: number) => `${formatCount(value, fmt)}%`;

  if (showsLockedPage(info)) {
    return (
      <PageFrame className="max-md:pt-4 md:gap-5">
        <TopbarExtras title={t("Referral Program")} />
        <PageHeader
          title={t("Referral Program")}
          description={t("Share Smartly with friends and family. When they buy a plan, you earn {pct} of every payment they make.", { pct: pct(program.commissionPct) })}
          className="max-md:sr-only"
        />
        <ReferralLocked info={info} currency={currency} />
      </PageFrame>
    );
  }

  // Whether this member earns now, beside the title.
  const badge = info.canEarn ? (
    <span className="flex h-8 items-center gap-1.5 rounded-full border border-emerald-line bg-emerald-soft px-3 text-[13px] font-semibold text-brand-ink">
      <Check className="size-3.5 text-emerald" strokeWidth={2.5} aria-hidden="true" />
      {info.myPlan.isPaid ? t("{plan} · you're earning", { plan: info.myPlan.planName }) : t("You're earning")}
    </span>
  ) : info.lockedReason === "PROGRAM_OFF" ? (
    <span className="flex h-8 items-center gap-1.5 rounded-full border border-warning-line bg-warning-50 px-3 text-[13px] font-semibold text-warning-ink">
      <PauseCircle className="size-3.5 text-warning" aria-hidden="true" />
      {t("Program paused · not earning")}
    </span>
  ) : (
    <Link href={PLANS_ROUTE} className="flex h-8 items-center gap-1.5 rounded-full border border-warning-line bg-warning-50 px-3 text-[13px] font-semibold text-warning-ink hover:border-warning">
      <Lock className="size-3.5 text-warning" aria-hidden="true" />
      {t("{plan} plan · not earning · See plans", { plan: info.myPlan.planName })}
    </Link>
  );

  return (
    <PageFrame className="max-md:gap-3.5 max-md:pt-4 md:gap-5">
      <TopbarExtras title={t("Referral dashboard")} />
      <PageHeader
        title={t("Referral dashboard")}
        description={t("Share Smartly. You earn {pct} of every payment from people who join with your link.", { pct: pct(program.commissionPct) })}
        hideDescriptionOnPhone
        className="max-md:[&_h1]:sr-only"
        actions={badge}
      />
      <div className="grid gap-3.5 md:gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
        <EarningsHero info={info} currency={currency} today={today} />
        <InviteLinkCard code={info.referralCode} origin={origin} commissionPct={program.commissionPct} friendDiscountPct={program.friendDiscountPct} paused={!program.live} linkCount={info.linkCount} />
      </div>
      <div className="grid items-start gap-3.5 md:gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
        <EarningsByMonthCard info={info} currency={currency} today={today} />
        <PeopleCard info={info} currency={currency} />
      </div>
      <div className="grid items-start gap-3.5 md:gap-5 lg:grid-cols-2">
        <TopFriendsCard info={info} currency={currency} />
        <LatestCommissionsCard info={info} currency={currency} today={today} />
      </div>
    </PageFrame>
  );
}
