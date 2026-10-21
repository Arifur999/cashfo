import { redirect } from "next/navigation";
import { AccountLedgerPageClient } from "@/components/modules/Customer/Balance/AccountLedgerPageClient";
import { displayLanguage } from "@/lib/customer/accountDisplay";
import { getAccount, getAccounts, getAccountSummary, getLedger, getWallets } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import type { Account } from "@/lib/customer/api";
import { getCurrentUser } from "@/lib/customer/auth";
import { isIsoDay, resolveDateRange, type DateRangePreset } from "@/lib/customer/dateRangePresets";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getAppToday } from "@/lib/date";
import { getLocale } from "@/lib/i18n/locale";
import { pageHref, pastEnd, readPageParam } from "@/lib/table/pageParams";

export const generateMetadata = () => customerPageMetadata("/balance/ledger");

const PRESETS: DateRangePreset[] = ["all", "this-month", "last-month", "this-year", "custom"];

// Rows on one page of a statement.
const PAGE_SIZE = 50;

// Every account in the chart, parents before their children.
function flatten(accounts: Account[]): Account[] {
  return accounts.flatMap((account) => [account, ...flatten(account.children)]);
}

export default async function AccountLedgerPage({ searchParams }: PageProps<"/balance/ledger">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const currency = activeBusiness?.currency ?? "BDT";

  const accountId = typeof params.accountId === "string" ? params.accountId : "";
  const range = PRESETS.find((preset) => preset === params.range) ?? "all";
  const customFrom = isIsoDay(params.dateFrom) ? params.dateFrom : undefined;
  const customTo = isIsoDay(params.dateTo) ? params.dateTo : undefined;
  const page = readPageParam(params);

  // The wallets lead the picker (archived ones included, struck through);
  // the rest of the chart -- income, expense, equity -- is there for anyone
  // who types its name.
  const [wallets, groups] = await Promise.all([getWallets(activeBusinessId), getAccounts(activeBusinessId)]);
  const walletIds = new Set(wallets.map((wallet) => wallet.id));
  const others = flatten(groups.flatMap((group) => group.accounts)).filter((account) => !walletIds.has(account.id));

  const { dateFrom, dateTo } = resolveDateRange(range, customFrom, customTo);

  const [account, ledger, summary] = accountId
    ? await Promise.all([
        getAccount(activeBusinessId, accountId),
        getLedger(activeBusinessId, accountId, { dateFrom, dateTo, page, limit: PAGE_SIZE }),
        getAccountSummary(activeBusinessId, accountId, { dateFrom, dateTo }),
      ])
    : [null, null, null];

  // A page past the end (entries voided away, an old link) opens the last
  // page instead of an empty statement.
  const last = ledger ? pastEnd(page, ledger.meta.totalPages, ledger.meta.total) : null;
  if (last) redirect(pageHref("/balance/ledger", params, last));

  return (
    <AccountLedgerPageClient
      wallets={wallets}
      others={others}
      account={account}
      ledger={ledger}
      summary={summary}
      preferredLanguage={displayLanguage(await getLocale())}
      currency={currency}
      accountId={accountId}
      range={range}
      customFrom={customFrom}
      customTo={customTo}
      periodFrom={dateFrom}
      periodTo={dateTo}
      today={getAppToday()}
    />
  );
}
