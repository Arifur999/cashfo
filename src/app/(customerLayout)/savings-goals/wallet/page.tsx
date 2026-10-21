import { redirect } from "next/navigation";
import { SavingsWalletPageClient } from "@/components/modules/Customer/SavingsGoals/SavingsWalletPageClient";
import { getSavingsWallets } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";

export const generateMetadata = () => customerPageMetadata("/savings-goals/wallet");

export default async function SavingsWalletPage({ searchParams }: PageProps<"/savings-goals/wallet">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const wallets = await getSavingsWallets(activeBusinessId);

  return (
    <SavingsWalletPageClient
      businessId={activeBusinessId}
      wallets={wallets}
      canManage={canManage}
      currency={activeBusiness?.currency ?? "BDT"}
      // "Add savings wallet" elsewhere links here with ?add=1: the drawer
      // opens at once, rather than asking for the same click again.
      openAdd={params.add === "1"}
    />
  );
}
