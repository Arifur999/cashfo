import { AccountsPageClient } from "@/components/modules/Customer/Books/Accounts/AccountsPageClient";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import { getAccounts, getAccountSummary } from "@/lib/customer/accounts";
import type { AccountGroup, AccountType, LanguagePreference } from "@/lib/customer/api";
import { flattenAccounts, groupOf, yearRows } from "@/lib/customer/booksDisplay";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { requireBusinessWorkspace } from "@/lib/customer/requireBusinessWorkspace";
import { getAppToday } from "@/lib/date";
import { getLocale } from "@/lib/i18n/locale";

export const generateMetadata = () => customerPageMetadata("/accounts");

// What moved through each income or expense account this year. One read per
// account until the API can total them all at once.
async function yearByAccount(businessId: string, groups: AccountGroup[], type: AccountType, dateFrom: string, dateTo: string, language: LanguagePreference) {
  const accounts = flattenAccounts(groupOf(groups, type)).map((row) => row.account);
  const summaries = await Promise.all(accounts.map((account) => getAccountSummary(businessId, account.id, { dateFrom, dateTo })));
  return yearRows(accounts.map((account, index) => ({ id: account.id, name: accountDisplayName(account, language), totalIn: summaries[index].totalIn, totalOut: summaries[index].totalOut })));
}

// Books › Accounts: the chart of accounts with this year's income and
// expenses, read here so the page arrives filled in. Only a business
// workspace has Books; any other shows the way to one.
export default async function AccountsPage() {
  const books = await requireBusinessWorkspace();
  if (!books.ok) return books.notice;
  const { businessId: activeBusinessId, business: activeBusiness } = books;

  const today = getAppToday();
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const [groups, locale] = await Promise.all([getAccounts(activeBusinessId), getLocale()]);
  const language = displayLanguage(locale);
  const [income, expense] = await Promise.all([yearByAccount(activeBusinessId, groups, "INCOME", yearStart, today, language), yearByAccount(activeBusinessId, groups, "EXPENSE", yearStart, today, language)]);
  const canManage = activeBusiness.role === "OWNER" || activeBusiness.role === "ACCOUNTANT";

  return <AccountsPageClient businessId={activeBusinessId} businessName={activeBusiness.name} groups={groups} income={income} expense={expense} today={today} canManage={canManage} preferredLanguage={language} currency={activeBusiness.currency} />;
}
