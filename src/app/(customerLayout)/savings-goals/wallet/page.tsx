import { redirect } from "next/navigation";
import { SavingsAccountsPageClient } from "@/components/modules/Customer/SavingsGoals/SavingsAccountsPageClient";
import { getSavingsWallets } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getSavingsAccountOverview, getSavingsGoals, getSavingsWalletGoals } from "@/lib/customer/savingsGoals";

export const generateMetadata = () => customerPageMetadata("/savings-goals/wallet");

export default async function SavingsAccountsPage({ searchParams }: PageProps<"/savings-goals/wallet">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  // The money summary and every account (archived too), the active ones in
  // their order for the cards, which goals each holds money for, and the
  // goals for their colours.
  const [overview, active, walletGoals, goals] = await Promise.all([
    getSavingsAccountOverview(activeBusinessId),
    getSavingsWallets(activeBusinessId),
    getSavingsWalletGoals(activeBusinessId),
    getSavingsGoals(activeBusinessId),
  ]);

  return (
    <SavingsAccountsPageClient
      businessId={activeBusinessId}
      overview={overview}
      activeIds={active.map((wallet) => wallet.id)}
      walletGoals={walletGoals}
      goals={goals.map((goal) => ({ id: goal.id, status: goal.status }))}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
      // "Add savings account" elsewhere links here with ?add=1, and the
      // goals page's archived note with ?archived=1.
      openAdd={params.add === "1"}
      showArchived={params.archived === "1"}
    />
  );
}
