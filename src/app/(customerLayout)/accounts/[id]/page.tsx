import { notFound, redirect } from "next/navigation";
import { AccountDetailPageClient } from "@/components/modules/Customer/Books/Accounts/AccountDetailPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { displayLanguage } from "@/lib/customer/accountDisplay";
import { getAccount, getAccounts, getAccountSummary, getLedger } from "@/lib/customer/accounts";
import { getCurrentUser } from "@/lib/customer/auth";
import { flattenAccounts } from "@/lib/customer/booksDisplay";
import { isIsoDay, resolveDateRange, type DateRangePreset } from "@/lib/customer/dateRangePresets";
import { getLocale } from "@/lib/i18n/locale";

const PRESETS: DateRangePreset[] = ["this-month", "last-month", "this-year", "all", "custom"];

// Books › Accounts › one account's statement for a period; this month
// unless the URL says otherwise.
export default async function AccountDetailPage({ params, searchParams }: PageProps<"/accounts/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const range = PRESETS.find((preset) => preset === sp.range) ?? "this-month";
  const customFrom = isIsoDay(sp.dateFrom) ? sp.dateFrom : undefined;
  const customTo = isIsoDay(sp.dateTo) ? sp.dateTo : undefined;
  const { dateFrom, dateTo } = resolveDateRange(range, customFrom, customTo);
  const page = typeof sp.page === "string" && /^\d+$/.test(sp.page) ? Number(sp.page) : 1;

  const [account, groups, ledger, summary, locale] = await Promise.all([getAccount(activeBusinessId, id), getAccounts(activeBusinessId), getLedger(activeBusinessId, id, { dateFrom, dateTo, page }), getAccountSummary(activeBusinessId, id, { dateFrom, dateTo }), getLocale()]);
  if (!account) notFound();

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return <AccountDetailPageClient businessId={activeBusinessId} account={account} accounts={groups.flatMap((group) => flattenAccounts(group.accounts).map((row) => row.account))} ledger={ledger} summary={summary} canManage={canManage} preferredLanguage={displayLanguage(locale)} currency={activeBusiness?.currency ?? "BDT"} range={range} customFrom={customFrom} customTo={customTo} dateFrom={dateFrom} dateTo={dateTo} />;
}
