import { redirect } from "next/navigation";
import { AccountsPageClient } from "@/components/modules/Customer/Books/Accounts/AccountsPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { displayLanguage } from "@/lib/customer/accountDisplay";
import { getAccounts, getAccountSummary } from "@/lib/customer/accounts";
import type { AccountGroup, AccountType, LanguagePreference } from "@/lib/customer/api";
import { getCurrentUser } from "@/lib/customer/auth";
import { accountDisplayName } from "@/lib/customer/accountDisplay";
import { flattenAccounts, groupOf, yearRows } from "@/lib/customer/booksDisplay";
import { getAppToday } from "@/lib/date";
import { getLocale } from "@/lib/i18n/locale";

// What moved through each income or expense account this year.
async function yearByAccount(businessId: string, groups: AccountGroup[], type: AccountType, dateFrom: string, dateTo: string, language: LanguagePreference) {
  const accounts = flattenAccounts(groupOf(groups, type)).map((row) => row.account);
  const summaries = await Promise.all(accounts.map((account) => getAccountSummary(businessId, account.id, { dateFrom, dateTo })));
  return yearRows(accounts.map((account, index) => ({ name: accountDisplayName(account, language), totalIn: summaries[index].totalIn, totalOut: summaries[index].totalOut })));
}

// Books › Accounts: the chart of accounts with this year's income and
// expenses, read here so the page arrives filled in.
export default async function AccountsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const today = getAppToday();
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const [groups, locale] = await Promise.all([getAccounts(activeBusinessId), getLocale()]);
  const language = displayLanguage(locale);
  const [income, expense] = await Promise.all([yearByAccount(activeBusinessId, groups, "INCOME", yearStart, today, language), yearByAccount(activeBusinessId, groups, "EXPENSE", yearStart, today, language)]);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return <AccountsPageClient businessId={activeBusinessId} businessName={activeBusiness?.name ?? ""} groups={groups} income={income} expense={expense} today={today} canManage={canManage} preferredLanguage={language} currency={activeBusiness?.currency ?? "BDT"} />;
}
