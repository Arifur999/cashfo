"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Gift } from "lucide-react";
import Link from "next/link";
import T from "@/components/shared/T";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { referralSettingsQuery } from "@/queries/referral.queries";
import SettingsSideCard, { SIDE_CARD_LINK } from "./SettingsSideCard";

// What a referral earns, read from Referrals & Payouts' commission rules and
// changed there: a share of a friend's first payment, the friend's discount
// and how long the money waits. Every admin may read them; the link goes
// where the money roles change them.
const ReferralRulesCard = () => {
  const { locale } = useLocale();
  const query = useQuery(referralSettingsQuery());
  const rules = query.data?.data;
  const bold = (value: React.ReactNode) => <b className="font-semibold text-ink">{value}</b>;
  const pct = (value: number) => `${formatCount(value, locale)}%`;

  return (
    <SettingsSideCard
      icon={Gift}
      tone="mint"
      title="Referral rules"
      action={
        <Link href="/admin/referrals/settings" className={SIDE_CARD_LINK}>
          <T>Change in Referrals & Payouts</T> <ChevronRight aria-hidden="true" className="size-3.5" strokeWidth={2.25} />
        </Link>
      }
    >
      {rules ? (
        <>
          {!rules.programLive && (
            <>
              <T>The program is paused.</T>{" "}
            </>
          )}
          <T values={{ commission: bold(pct(rules.commissionPct)) }}>{"Referrers earn {commission} of a friend's first payment."}</T>{" "}
          {rules.friendDiscountPct > 0 && (
            <>
              <T values={{ discount: bold(`${pct(rules.friendDiscountPct)}`) }}>{"The friend gets {discount} off."}</T>{" "}
            </>
          )}
          {rules.holdDays > 0 ? (
            <T values={{ days: formatCount(rules.holdDays, locale) }}>{rules.holdDays === 1 ? "Money is ready {days} day later." : "Money is ready {days} days later."}</T>
          ) : (
            <T>Money is ready at once.</T>
          )}
        </>
      ) : (
        <T>{query.isError ? "Couldn't load" : "Loading..."}</T>
      )}
    </SettingsSideCard>
  );
};

export default ReferralRulesCard;
