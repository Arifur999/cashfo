import { redirect } from "next/navigation";
import { AccountsPageClient } from "@/components/accounts/AccountsPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getAccounts } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";

export default async function AccountsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) {
    redirect("/dashboard");
  }

  const groups = await getAccounts(activeBusinessId);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return (
    <AccountsPageClient
      businessId={activeBusinessId}
      initialGroups={groups}
      canManage={canManage}
      preferredLanguage={user.preferredLanguage}
    />
  );
}
