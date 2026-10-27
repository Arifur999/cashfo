"use client";

import { ArrowDownToLine, Check, ChevronRight, LayoutDashboard, Lock, PauseCircle, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import ErrorState from "@/components/smartly/ErrorState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import TabBar from "@/components/smartly/TabBar";
import { formatCurrency } from "@/lib/customer/currency";
import { PLANS_ROUTE } from "@/lib/customer/nav";
import { balancesOf, dayOf, friendDay, legacyBonusLeft, METHOD_BRANDS, programOf, showsLockedPage, tabFromQuery, type ReferralTab } from "@/lib/customer/referralDisplay";
import type { PayoutMethod, ReferralProgramInfo, WithdrawalList } from "@/lib/customer/referralTypes";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { EarningsHero, WITHDRAW_ROUTE } from "./EarningsHero";
import { FriendsTable } from "./FriendsTable";
import { HowItWorksCard } from "./HowItWorksCard";
import { InviteLinkCard } from "./InviteLinkCard";
import { ReferralLocked } from "./ReferralLocked";
import { WithdrawalsTab } from "./WithdrawalsTab";
import { WithdrawDialog } from "./WithdrawDialog";

interface ReferralsPageClientProps {
  businessId: string;
  info: ReferralProgramInfo | null;
  methods: PayoutMethod[];
  withdrawals: WithdrawalList | null;
  withdrawalsPageSize: number;
  currency: string;
  // Only an owner or accountant can book the old bonus into a wallet here.
  canManage: boolean;
  // A business workspace's name, so the old bonus dialog says whose wallet
  // the money lands in; null in the reader's own personal one.
  workspaceName: string | null;
  userName: string;
  // Where the app is served from, for the invite link.
  origin: string;
  // The app's "YYYY-MM-DD", read on the server so both renders agree.
  today: string;
}

const REFERRALS_ROUTE = "/referrals";

// The Referral Program: Overview (what is ready to withdraw, the invite
// link, every friend and what they earned, how it works) and Withdrawals
// (every request and the saved payout methods). The tab lives in the URL
// (?tab=withdrawals, where the payout emails and bell rows point), so back
// and refresh keep it. A member who can't earn yet and has nothing from the
// program sees the Free-plan page instead.
export function ReferralsPageClient({ businessId, info, methods, withdrawals, withdrawalsPageSize, currency, canManage, workspaceName, userName, origin, today }: ReferralsPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = tabFromQuery(searchParams.get("tab"));
  const [bonusOpen, setBonusOpen] = useState(false);

  // Switching tabs only rewrites the address (a history entry, so Back
  // returns to the other tab); the page has both tabs' data already.
  function chooseTab(next: ReferralTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "withdrawals") params.set("tab", "withdrawals");
    else params.delete("tab");
    params.delete("page");
    const query = params.toString();
    window.history.pushState(null, "", query ? `${REFERRALS_ROUTE}?${query}` : REFERRALS_ROUTE);
  }

  if (!info) {
    return (
      <PageFrame className="max-md:pt-4 md:gap-5">
        <TopbarExtras title={t("Referral Program")} />
        <ErrorState title={t("Couldn't load your invite details")} onRetry={() => router.refresh()} />
      </PageFrame>
    );
  }

  const program = programOf(info);
  const pct = (value: number) => `${formatCount(value, locale)}%`;
  const description = t("Share Smartly with friends and family. When they buy a plan, you earn {pct} of what they pay.", { pct: pct(program.commissionPct) });

  if (showsLockedPage(info)) {
    return (
      <PageFrame className="max-md:pt-4 md:gap-5">
        <TopbarExtras title={t("Referral Program")} />
        <PageHeader title={t("Referral Program")} description={description} className="max-md:sr-only" />
        <ReferralLocked info={info} currency={currency} />
      </PageFrame>
    );
  }

  const balances = balancesOf(info);
  const friends = info.friends ?? [];
  const money = (value: number | string) => formatCurrency(value, currency, locale);
  const bonusLeft = legacyBonusLeft(friends);
  const lastPayout = info.lastPayout;

  // Overview: whether this member earns now, beside the title.
  const badge = info.canEarn !== false ? (
    <span className="flex h-8 items-center gap-1.5 rounded-full border border-emerald-line bg-emerald-soft px-3 text-[13px] font-semibold text-brand-ink">
      <Check className="size-3.5 text-emerald" strokeWidth={2.5} aria-hidden="true" />
      {info.myPlan?.isPaid ? t("{plan} · you're earning", { plan: info.myPlan.planName }) : t("You're earning")}
    </span>
  ) : info.lockedReason === "PROGRAM_OFF" ? (
    <span className="flex h-8 items-center gap-1.5 rounded-full border border-warning-line bg-warning-50 px-3 text-[13px] font-semibold text-warning-ink">
      <PauseCircle className="size-3.5 text-warning" aria-hidden="true" />
      {t("Program paused · not earning")}
    </span>
  ) : (
    <Link href={PLANS_ROUTE} className="flex h-8 items-center gap-1.5 rounded-full border border-warning-line bg-warning-50 px-3 text-[13px] font-semibold text-warning-ink hover:border-warning">
      <Lock className="size-3.5 text-warning" aria-hidden="true" />
      {t("{plan} plan · not earning · See plans", { plan: info.myPlan?.planName ?? "Free" })}
    </Link>
  );

  // Always there, as the board has it: below the smallest withdrawal the
  // withdraw page says so.
  const withdrawButton = (
    <Link href={WITHDRAW_ROUTE} className="flex h-10 items-center gap-2 rounded-full bg-emerald px-4 text-body font-semibold text-on-action shadow-button hover:bg-emerald-hover">
      <ArrowDownToLine className="size-4" strokeWidth={2.25} aria-hidden="true" />
      {t("Withdraw · {amount} available", { amount: money(balances.available) })}
    </Link>
  );

  return (
    <PageFrame className="max-md:gap-3.5 max-md:pt-4 md:gap-5">
      <TopbarExtras title={t("Referral Program")} />
      <div className={cn("flex flex-col gap-3.5", tab === "overview" && "max-md:hidden")}>
        <PageHeader
          title={t("Referral Program")}
          description={tab === "withdrawals" ? t("Every withdrawal you asked for, and where the money went.") : description}
          className="max-md:[&_h1]:sr-only"
          actions={tab === "withdrawals" ? withdrawButton : badge}
        />
        <TabBar
          label={t("Referral sections")}
          value={tab}
          onChange={chooseTab}
          className="gap-1"
          options={[
            { value: "overview", label: <TabLabel icon={<LayoutDashboard />} text={t("Overview")} /> },
            { value: "withdrawals", label: <TabLabel icon={<ArrowDownToLine />} text={t("Withdrawals")} /> },
          ]}
        />
      </div>

      {tab === "withdrawals" ? (
        <WithdrawalsTab withdrawals={withdrawals} methods={methods} currency={currency} today={today} userName={userName} allowed={program.methods} pageSize={withdrawalsPageSize} />
      ) : (
        <>
          <div className="grid gap-3.5 md:gap-5 xl:grid-cols-[minmax(0,1fr)_470px]">
            <EarningsHero info={info} friends={friends} currency={currency} today={today} />
            <InviteLinkCard code={info.referralCode} origin={origin} commissionPct={program.commissionPct} friendDiscountPct={program.friendDiscountPct} holdDays={program.holdDays} paused={!program.live} />
          </div>

          {bonusLeft > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-card border border-emerald-line bg-emerald-soft px-4 py-3 text-small text-ink md:px-5">
              <Wallet className="size-4 shrink-0 text-emerald" aria-hidden="true" />
              <span className="min-w-0 flex-1">{t("{amount} of it is from the old sign-up bonus. You can still move that straight into a wallet, as before.", { amount: money(bonusLeft) })}</span>
              {canManage ? (
                <button type="button" onClick={() => setBonusOpen(true)} className="h-8 shrink-0 rounded-full border border-emerald-line bg-surface px-3 text-[12.5px] font-semibold text-emerald hover:border-emerald">
                  {t("Move to a wallet")}
                </button>
              ) : (
                <span className="text-caption text-ink-muted">{t("Only an owner or accountant of this workspace can do this.")}</span>
              )}
            </div>
          )}

          <div className="grid items-start gap-3.5 md:gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <FriendsTable info={info} friends={friends} currency={currency} today={today} canRemind={program.live} />
            <div className="flex flex-col gap-3.5 md:gap-5">
              {/* Phones: the way to the Withdrawals tab (ReferralMobile). */}
              <button type="button" onClick={() => chooseTab("withdrawals")} className="flex items-center gap-3 rounded-card border border-line-card bg-surface px-4 py-3.5 text-left shadow-card md:hidden">
                <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-field bg-surface-sunken text-ink-soft">
                  <ArrowDownToLine className="size-4.25" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="text-body font-semibold text-ink">{t("Withdrawals")}</span>
                  <span className="truncate text-caption text-ink-muted">
                    {lastPayout?.amount && lastPayout.paidAt
                      ? t("Last: {amount} paid to {service} on {date}", { amount: money(lastPayout.amount), service: lastPayout.methodType === "BANK" ? t("your bank") : METHOD_BRANDS[lastPayout.methodType].name, date: friendDay(dayOf(lastPayout.paidAt), today, locale) })
                      : t("Requests and where you receive money")}
                  </span>
                </span>
                <ChevronRight className="size-4.5 shrink-0 text-ink-faint" aria-hidden="true" />
              </button>
              <HowItWorksCard program={program} currency={currency} />
            </div>
          </div>
          <WithdrawDialog open={bonusOpen} onClose={() => setBonusOpen(false)} businessId={businessId} amount={bonusLeft} currency={currency} workspaceName={workspaceName} />
        </>
      )}
    </PageFrame>
  );
}

function TabLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="flex items-center gap-2 px-2 [&_svg]:size-4">
      <span aria-hidden="true" className="flex">
        {icon}
      </span>
      {text}
    </span>
  );
}
