import { WithdrawPageClient } from "@/components/modules/Customer/Referrals/WithdrawPageClient";
import { getMoneyAccounts, getSavingsWallets } from "@/lib/customer/accounts";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { referralInfoForPage, referralPageContext } from "@/lib/customer/referralPage";
import { getAvailableEarnings, getPayoutMethods, getReferralProfile } from "@/lib/customer/referrals";
import { getTranslator } from "@/lib/i18n/locale";

export async function generateMetadata() {
  const { t } = await getTranslator();
  return customerPageMetadata("/referrals/withdrawals", { record: t("Withdraw@@referral") });
}

// Referrals > Withdrawals > Withdraw: the payments to withdraw, where the
// money goes, and (for an owner or accountant of the open workspace) the
// wallet it is booked into when paid; then the code, and the request sent.
export default async function WithdrawPage() {
  const { user, activeBusinessId, activeBusiness, currency, today } = await referralPageContext();
  // Booking the payout as income needs the books of this workspace.
  const canBook = (activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT") && activeBusiness?.type !== "GROUP";

  const [info, lines, methods, wallets, savings, profile] = await Promise.all([
    referralInfoForPage(),
    getAvailableEarnings(),
    getPayoutMethods(),
    canBook ? getMoneyAccounts(activeBusinessId) : Promise.resolve([]),
    canBook ? getSavingsWallets(activeBusinessId) : Promise.resolve([]),
    getReferralProfile(),
  ]);

  return (
    <WithdrawPageClient
      info={info}
      lines={lines}
      methods={methods}
      businessId={canBook ? activeBusinessId : null}
      wallets={wallets}
      savingsWallets={savings}
      currency={currency}
      userName={user.name}
      codeTo={profile ? (profile.phone && profile.phoneVerified ? { phone: profile.phone } : { email: profile.email }) : null}
      today={today}
    />
  );
}
