import { ReferralProfileClient } from "@/components/modules/Customer/Referrals/ReferralProfileClient";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { referralInfoForPage, referralPageContext } from "@/lib/customer/referralPage";
import { getPayoutMethods, getReferralProfile } from "@/lib/customer/referrals";

export const generateMetadata = () => customerPageMetadata("/referrals/profile");

// Referrals > Profile & payouts.
export default async function ReferralProfilePage() {
  const { user, today } = await referralPageContext();
  const [info, profile, methods] = await Promise.all([referralInfoForPage(), getReferralProfile(), getPayoutMethods()]);
  return <ReferralProfileClient profile={profile} methods={methods} allowed={info?.program.methods ?? []} avatarUrl={user.avatarUrl ?? null} canEarn={info?.canEarn ?? false} today={today} />;
}
