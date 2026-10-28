"use client";

import T from "@/components/shared/T";
import Avatar from "@/components/smartly/Avatar";
import type { ReferralInvite } from "@/lib/customer/referralTypes";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Who invited the person signing up, over the sign-up form
// (InviteSignupMobile): "Khaled Mahmud invited you", and the friend's
// discount on their first plan while the Referral Program runs. Only for an
// invite code the API knows.
const InviteInvitation = ({ invite }: { invite: ReferralInvite }) => {
  const { locale, translate } = useLocale();
  const name = invite.referrerName ?? invite.referrerFirstName ?? "";
  const discount = invite.programLive ? invite.friendDiscountPct : 0;

  return (
    <section aria-label={translate("Invitation")} className="flex gap-3 rounded-[14px] border border-emerald-line bg-emerald-soft p-3.5">
      <Avatar name={name} size={44} tone="soft" alt="" className="size-10 bg-mint-50 text-small text-brand-ink" />
      <span className="flex min-w-0 flex-col gap-0.75">
        <span className="text-[15px] leading-normal font-semibold text-ink">{translate("{name} invited you", { name })}</span>
        <span className="text-[13px] leading-normal text-ink-2">
          {discount > 0 ? (
            <T values={{ discount: <b className="font-semibold text-emerald">{translate("{pct} off", { pct: `${formatCount(discount, locale)}%` })}</b> }}>{"Get {discount} your first plan. It's applied for you when you buy."}</T>
          ) : (
            translate("Sign up to start managing your money together.")
          )}
        </span>
      </span>
    </section>
  );
};

export default InviteInvitation;
