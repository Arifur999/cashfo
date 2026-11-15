import { InviteLinksClient } from "@/components/modules/Customer/Referrals/InviteLinksClient";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { referralInfoForPage, referralPageContext } from "@/lib/customer/referralPage";
import { getReferralLinks } from "@/lib/customer/referrals";

export const generateMetadata = () => customerPageMetadata("/referrals/links");

// Referrals > Invite links.
export default async function InviteLinksPage() {
  const { currency, origin, today } = await referralPageContext();
  const [info, links] = await Promise.all([referralInfoForPage(), getReferralLinks()]);
  return <InviteLinksClient links={links} code={info?.referralCode ?? null} origin={origin} currency={currency} today={today} commissionPct={info ? info.program.commissionPct : null} />;
}
