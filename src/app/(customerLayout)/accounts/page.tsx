import { redirect } from "next/navigation";
import { AccountsPageClient } from "@/components/modules/Customer/Accounts/AccountsPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getAccounts } from "@/lib/customer/accounts";
import { getCurrentUser } from "@/lib/customer/auth";
import { getLocale } from "@/lib/i18n/locale";
import { displayLanguage } from "@/lib/customer/accountDisplay";

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
      preferredLanguage={displayLanguage(await getLocale())}
      currency={activeBusiness?.currency ?? "BDT"}
    />
  );
}
