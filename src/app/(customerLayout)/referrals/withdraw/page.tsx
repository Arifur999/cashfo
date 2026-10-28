import { redirect } from "next/navigation";
import { WithdrawPageClient } from "@/components/modules/Customer/Referrals/WithdrawPageClient";
import { getMoneyAccounts, getSavingsWallets } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getPayoutMethods, getReferralInfo } from "@/lib/customer/referrals";
import { getAppToday } from "@/lib/date";
import { getTranslator } from "@/lib/i18n/locale";

export async function generateMetadata() {
  const { t } = await getTranslator();
  return customerPageMetadata("/referrals", { record: t("Withdraw@@referral") });
}

// Referral Program › Withdraw: how much, where it goes, and (for an owner
// or accountant of the open workspace) the wallet it is booked into when
// paid; then the emailed code, and the request sent.
export default async function WithdrawPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  // Booking the payout as income needs the books of this workspace.
  const canBook = (activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT") && activeBusiness?.type !== "GROUP";

  const [info, methods, wallets, savings] = await Promise.all([
    getReferralInfo(),
    getPayoutMethods(),
    canBook ? getMoneyAccounts(activeBusinessId) : Promise.resolve([]),
    canBook ? getSavingsWallets(activeBusinessId) : Promise.resolve([]),
  ]);

  return (
    <WithdrawPageClient
      info={info}
      methods={methods}
      businessId={canBook ? activeBusinessId : null}
      wallets={wallets}
      savingsWallets={savings}
      currency={activeBusiness?.currency ?? "BDT"}
      userName={user.name}
      email={user.email}
      today={getAppToday()}
    />
  );
}
