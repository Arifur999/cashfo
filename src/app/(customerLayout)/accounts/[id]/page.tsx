import { notFound } from "next/navigation";
import { AccountDetailPageClient } from "@/components/modules/Customer/Books/Accounts/AccountDetailPageClient";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import { getAccount, getAccounts, getAccountSummary, getLedger } from "@/lib/customer/accounts";
import { flattenAccounts } from "@/lib/customer/booksDisplay";
import { isIsoDay, resolveDateRange, type DateRangePreset } from "@/lib/customer/dateRangePresets";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { requireBusinessWorkspace } from "@/lib/customer/requireBusinessWorkspace";
import { getLocale } from "@/lib/i18n/locale";

// The tab names the account in the reader's language, as the page does,
// from the read the page makes.
export async function generateMetadata({ params }: PageProps<"/accounts/[id]">) {
  const { id } = await params;
  // A failed read is the page's to show (its error or PIN screen); the tab
  // keeps the list's name. A PIN-locked workspace keeps its records' names
  // out of the tab, and so out of the browser's history, which outlives the
  // unlock.
  const books = await requireBusinessWorkspace().catch(() => null);
  const account = books?.ok && !books.business.hasPinLock ? await getAccount(books.businessId, id).catch(() => null) : null;
  const record = account ? accountDisplayName(account, displayLanguage(await getLocale())) : null;
  return customerPageMetadata(`/accounts/${id}`, { record });
}

const PRESETS: DateRangePreset[] = ["this-month", "last-month", "this-year", "all", "custom"];

// Books › Accounts › one account's statement for a period; this month
// unless the URL says otherwise.
export default async function AccountDetailPage({ params, searchParams }: PageProps<"/accounts/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const books = await requireBusinessWorkspace();
  if (!books.ok) return books.notice;
  const { businessId: activeBusinessId, business: activeBusiness } = books;

  const range = PRESETS.find((preset) => preset === sp.range) ?? "this-month";
  const customFrom = isIsoDay(sp.dateFrom) ? sp.dateFrom : undefined;
  const customTo = isIsoDay(sp.dateTo) ? sp.dateTo : undefined;
  const { dateFrom, dateTo } = resolveDateRange(range, customFrom, customTo);
  const page = typeof sp.page === "string" && /^\d+$/.test(sp.page) ? Number(sp.page) : 1;

  const [account, groups, ledger, summary, locale] = await Promise.all([getAccount(activeBusinessId, id), getAccounts(activeBusinessId), getLedger(activeBusinessId, id, { dateFrom, dateTo, page }), getAccountSummary(activeBusinessId, id, { dateFrom, dateTo }), getLocale()]);
  if (!account) notFound();

  const canManage = activeBusiness.role === "OWNER" || activeBusiness.role === "ACCOUNTANT";

  return <AccountDetailPageClient businessId={activeBusinessId} account={account} accounts={groups.flatMap((group) => flattenAccounts(group.accounts).map((row) => row.account))} ledger={ledger} summary={summary} canManage={canManage} preferredLanguage={displayLanguage(locale)} currency={activeBusiness.currency} range={range} customFrom={customFrom} customTo={customTo} dateFrom={dateFrom} dateTo={dateTo} />;
}
