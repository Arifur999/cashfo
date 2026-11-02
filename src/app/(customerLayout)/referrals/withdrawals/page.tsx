import { WithdrawalsClient } from "@/components/modules/Customer/Referrals/WithdrawalsClient";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { referralInfoForPage, referralPageContext } from "@/lib/customer/referralPage";
import { getWithdrawals, WITHDRAWALS_PAGE_SIZE } from "@/lib/customer/referrals";

export const generateMetadata = () => customerPageMetadata("/referrals/withdrawals");

// Referrals > Withdrawals: every request and the payments it covers.
export default async function WithdrawalsPage() {
  const { currency, today } = await referralPageContext();
  const [info, withdrawals] = await Promise.all([referralInfoForPage(), getWithdrawals(1)]);
  return <WithdrawalsClient info={info} withdrawals={withdrawals} currency={currency} today={today} pageSize={WITHDRAWALS_PAGE_SIZE} />;
}
