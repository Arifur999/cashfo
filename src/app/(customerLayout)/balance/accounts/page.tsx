import { redirect } from "next/navigation";
import { AccountsPageClient } from "@/components/modules/Customer/Balance/AccountsPageClient";
import { getWalletsOverview } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/balance/accounts");

// Balance › Accounts: every cash, bank and mobile wallet, how each got to
// its balance, and the ways to manage them (the old Overview and Wallet
// pages, one page now).
export default async function AccountsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const overview = await getWalletsOverview(activeBusinessId);

  return <AccountsPageClient businessId={activeBusinessId} overview={overview} canManage={canManage} currency={activeBusiness?.currency ?? "BDT"} today={getAppToday()} />;
}
