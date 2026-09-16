"use client";

import { Copy, CreditCard, Gift, Mail, MessageCircle, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ReferralInfo, ReferralStatus } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { WithdrawReferralModal } from "./WithdrawReferralModal";

interface ReferralsPageClientProps {
  businessId: string;
  info: ReferralInfo | null;
  currency: string;
  canManage: boolean;
}

// PENDING is deliberately neutral gray, not a color implying anything is
// wrong -- it just means the friend hasn't been registered 30 days yet (see
// ReferralInfo's own comment in lib/api.ts). CONFIRMED/WITHDRAWN share the
// same brand-primary pill -- once a reward counts, WITHDRAWN is just "already
// cashed out", not a different status to warn about.
const STATUS_LABELS: Record<ReferralStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  WITHDRAWN: "Withdrawn",
};
const STATUS_BADGE_CLASSES: Record<ReferralStatus, string> = {
  PENDING: "bg-neutral-100 text-neutral-500",
  CONFIRMED: "bg-brand-primary/10 text-brand-primary",
  WITHDRAWN: "bg-brand-primary/10 text-brand-primary",
};

interface HowItWorksStepProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function HowItWorksStep({ icon: Icon, title, description }: HowItWorksStepProps) {
  return (
    <div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-neutral-900">{title}</p>
      <p className="mt-1 text-xs text-neutral-500">{description}</p>
    </div>
  );
}

// The Referral Program page -- see this task's own opening note (and
// Settings > Security's 2FA toggle) for why "Referrals" shows a plain
// running count instead of a "5 of 10 used this year" progress bar: this
// backend enforces no yearly cap, so implying one would be exactly the kind
// of misleading UI this app avoids elsewhere.
export function ReferralsPageClient({ businessId, info, currency, canManage }: ReferralsPageClientProps) {
  const [referralLink, setReferralLink] = useState("");
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  // window.location.origin doesn't exist during SSR, so this can't be
  // computed at render time -- default the input to "" (matching what the
  // server actually rendered, so there's no hydration mismatch) and fill in
  // the real link once mounted in the browser.
  useEffect(() => {
    if (!info) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time sync with a browser-only API (window.location), not derivable during render/SSR.
    setReferralLink(`${window.location.origin}/register?ref=${info.referralCode}`);
  }, [info]);

  if (!info) {
    return (
      <div className="h-full bg-brand-content px-6 py-8">
        <p className="text-sm text-neutral-500">Couldn&apos;t load your referral info -- please refresh.</p>
      </div>
    );
  }

  function handleCopy() {
    navigator.clipboard.writeText(referralLink);
    toast.success("Link copied");
  }

  const mailtoHref = `mailto:?body=${encodeURIComponent(referralLink)}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(referralLink)}`;

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Referral Program</h1>
        <p className="text-sm text-neutral-500">Invite friends and earn rewards</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
            <h2 className="text-sm font-semibold text-neutral-900">Your Referral Link</h2>
            <p className="mt-1 text-sm text-neutral-500">Share this link with friends to earn rewards</p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={referralLink}
                className="w-full min-w-0 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-600 outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover"
              >
                <Copy className="h-4 w-4" />
                Copy Link
              </button>
            </div>

            {/* Only mailto: and wa.me: links -- both genuinely open a real
                share flow with no backend/SDK involved. No Facebook/Twitter/
                "More" buttons: this app has no social SDKs configured, and a
                button that doesn't actually do anything would be exactly the
                kind of misleading UI this task explicitly says to avoid. */}
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={mailtoHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <Mail className="h-4 w-4" />
                Email
              </a>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          </div>

          <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
            <h2 className="text-sm font-semibold text-neutral-900">How It Works</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <HowItWorksStep icon={UserPlus} title="Invite Friends" description="Share your unique referral link with friends and family" />
              <HowItWorksStep
                icon={CreditCard}
                title="They Sign Up"
                description="When they create an account using your link, you both qualify for rewards"
              />
              <HowItWorksStep
                icon={Gift}
                title="Earn Rewards"
                description={`You'll receive ${formatCurrency(info.rewardAmountPerReferral, currency)} credit for each friend who signs up and stays active for 30 days`}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
            <h2 className="text-sm font-semibold text-neutral-900">Referral Program Terms</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-neutral-600">
              <li>Referral rewards are credited once your friend has been registered for 30 days.</li>
              <li>Your friend&apos;s account must still be active for the reward to count.</li>
              <li>Rewards can be withdrawn to any of your General or Savings accounts.</li>
              <li>There&apos;s no limit to how many friends you can refer.</li>
            </ol>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
            <h2 className="text-sm font-semibold text-neutral-900">Earnings Overview</h2>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Total Earned</span>
                <span className="font-semibold tabular-nums text-neutral-900">{formatCurrency(info.totalEarned, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Pending Earnings</span>
                <span className="font-semibold tabular-nums text-neutral-900">{formatCurrency(info.pendingEarnings, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Available Balance</span>
                <span className="font-semibold tabular-nums text-neutral-900">{formatCurrency(info.availableBalance, currency)}</span>
              </div>
              {/* A plain running count -- deliberately NOT a "5 of 10 used
                  this year" progress bar, since there is no yearly cap
                  enforced by this backend to measure progress against. */}
              <div className="flex justify-between border-t border-neutral-100 pt-2">
                <span className="text-neutral-500">Referrals</span>
                <span className="font-semibold tabular-nums text-neutral-900">{info.referralCount}</span>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-brand-primary/5 p-4">
              <p className="text-xs font-medium text-neutral-500">Available Balance</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">{formatCurrency(info.availableBalance, currency)}</p>
              {canManage && (
                <button
                  type="button"
                  disabled={Number(info.availableBalance) <= 0}
                  onClick={() => setWithdrawOpen(true)}
                  className="mt-3 w-full rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
                >
                  Withdraw Funds
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
            <h2 className="text-sm font-semibold text-neutral-900">Recent Referrals</h2>
            {info.recentReferrals.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-400">No referrals yet.</p>
            ) : (
              <div className="mt-2 divide-y divide-neutral-50">
                {info.recentReferrals.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">{r.name}</p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${STATUS_BADGE_CLASSES[r.status]}`}
                      >
                        {STATUS_LABELS[r.status]}
                      </span>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-neutral-900">
                      {r.status === "PENDING" ? <span className="text-neutral-400">Pending</span> : `+${formatCurrency(r.rewardAmount, currency)}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <WithdrawReferralModal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        businessId={businessId}
        availableBalance={info.availableBalance}
        currency={currency}
      />
    </div>
  );
}
