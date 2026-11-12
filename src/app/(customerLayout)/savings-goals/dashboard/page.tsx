import { redirect } from "next/navigation";
import { GoalsPageClient } from "@/components/modules/Customer/SavingsGoals/GoalsPageClient";
import { getMoneyAccounts, getSavingsWallets } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getSavingsAccountOverview, getSavingsGoals } from "@/lib/customer/savingsGoals";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/savings-goals/dashboard");

export default async function SavingsGoalsDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  // The active savings wallets take money in; the account overview lists
  // every one, so with none active the archived ones are offered back
  // instead of a first-run setup, and a new one can't repeat a name.
  const [goals, active, moneyAccounts, accounts] = await Promise.all([
    getSavingsGoals(activeBusinessId),
    getSavingsWallets(activeBusinessId),
    getMoneyAccounts(activeBusinessId),
    getSavingsAccountOverview(activeBusinessId),
  ]);
  const archived = active.length === 0 ? accounts.accounts.filter((row) => row.status === "ARCHIVED").map((row) => ({ id: row.id, name: row.name })) : [];

  return (
    <GoalsPageClient
      businessId={activeBusinessId}
      goals={goals}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
      savingsWallets={active}
      moneyAccounts={moneyAccounts}
      archivedWallets={archived}
      walletNames={accounts.accounts.map((row) => ({ id: row.id, name: row.name }))}
      person={{ name: user.name, email: user.email }}
      today={getAppToday()}
    />
  );
}
