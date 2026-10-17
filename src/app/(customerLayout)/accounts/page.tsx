import { redirect } from "next/navigation";
import { AccountsPageClient } from "@/components/modules/Customer/Books/Accounts/AccountsPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { displayLanguage } from "@/lib/customer/accountDisplay";
import { getAccounts } from "@/lib/customer/accounts";
import { getCurrentUser } from "@/lib/customer/auth";
import { getMonthlyBreakdown } from "@/lib/customer/reports";
import { getAppToday } from "@/lib/date";
import { getLocale } from "@/lib/i18n/locale";

// Books › Accounts: the chart of accounts with this year's income and
// expenses, read here so the page arrives filled in.
export default async function AccountsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const today = getAppToday();
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const [groups, income, expense, locale] = await Promise.all([getAccounts(activeBusinessId), getMonthlyBreakdown(activeBusinessId, "INCOME", yearStart, today), getMonthlyBreakdown(activeBusinessId, "EXPENSE", yearStart, today), getLocale()]);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return <AccountsPageClient businessId={activeBusinessId} businessName={activeBusiness?.name ?? ""} groups={groups} income={income} expense={expense} today={today} canManage={canManage} preferredLanguage={displayLanguage(locale)} currency={activeBusiness?.currency ?? "BDT"} />;
}
