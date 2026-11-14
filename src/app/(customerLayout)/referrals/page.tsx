import { redirect } from "next/navigation";
import { ReferralsPageClient } from "@/components/modules/Customer/Referrals/ReferralsPageClient";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { referralPageContext } from "@/lib/customer/referralPage";
import { getReferralInfo, getReferredFriends } from "@/lib/customer/referrals";

export const generateMetadata = () => customerPageMetadata("/referrals");

// Referrals > Dashboard. An older email or bell row's ?tab=withdrawals goes
// to the Withdrawals page.
export default async function ReferralsPage({ searchParams }: PageProps<"/referrals">) {
  if ((await searchParams).tab === "withdrawals") redirect("/referrals/withdrawals");
  const { currency, origin, today } = await referralPageContext();
  // The phone's "Friends" card lists the newest ones (ReferralMobile).
  const [info, friends] = await Promise.all([getReferralInfo(), getReferredFriends(1, undefined, undefined)]);
  return <ReferralsPageClient info={info} friends={friends} currency={currency} origin={origin} today={today} />;
}
