import { redirect } from "next/navigation";
import { AccountLedgerPageClient } from "@/components/modules/Customer/Balance/AccountLedgerPageClient";
import { displayLanguage } from "@/lib/customer/accountDisplay";
import { getAccount, getAccounts, getAccountSummary, getLedger, getWallets } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import type { Account, LedgerKind } from "@/lib/customer/api";
import { getCurrentUser } from "@/lib/customer/auth";
import { LEDGER_KIND_META } from "@/lib/customer/balanceDisplay";
import { isIsoDay, resolveDateRange, type DateRangePreset } from "@/lib/customer/dateRangePresets";
import { statementBackPath } from "@/lib/customer/ledger";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getAppToday } from "@/lib/date";
import { getLocale } from "@/lib/i18n/locale";
import { pageHref, pastEnd, readPageParam } from "@/lib/table/pageParams";

export const generateMetadata = () => customerPageMetadata("/balance/ledger");

const PRESETS: DateRangePreset[] = ["all", "this-month", "last-month", "this-year", "custom"];
// Rows on one page of a ledger.
const PAGE_SIZE = 50;
const SEARCH_MAX = 80;

// Every account in the chart, parents before their children.
function flatten(accounts: Account[]): Account[] {
  return accounts.flatMap((account) => [account, ...flatten(account.children)]);
}

// Balance › Ledger: one account over a period -- the equation from its
// opening balance to its closing one, then every entry with a running
// balance, narrowed by received or sent, kind and a search. A deleted entry
// (voided, with its reversal) is gone, balances included.
export default async function AccountLedgerPage({ searchParams }: PageProps<"/balance/ledger">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const currency = activeBusiness?.currency ?? "BDT";
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  const accountId = typeof params.accountId === "string" ? params.accountId : "";
  const range = PRESETS.find((preset) => preset === params.range) ?? "all";
  const customFrom = isIsoDay(params.dateFrom) ? params.dateFrom : undefined;
  const customTo = isIsoDay(params.dateTo) ? params.dateTo : undefined;
  const page = readPageParam(params);
  const direction = params.dir === "in" || params.dir === "out" ? params.dir : undefined;
  const kind = typeof params.kind === "string" && params.kind in LEDGER_KIND_META ? (params.kind as LedgerKind) : undefined;
  const search = typeof params.q === "string" ? params.q.trim().slice(0, SEARCH_MAX) : "";

  // The wallets lead the picker (archived ones included); the rest of the
  // chart -- income, expense, equity -- is there for anyone who types its name.
  const [wallets, groups] = await Promise.all([getWallets(activeBusinessId), getAccounts(activeBusinessId)]);
  const walletIds = new Set(wallets.map((wallet) => wallet.id));
  const others = flatten(groups.flatMap((group) => group.accounts)).filter((account) => !walletIds.has(account.id));

  const { dateFrom, dateTo } = resolveDateRange(range, customFrom, customTo);
  const [account, ledger, summary] = accountId
    ? await Promise.all([
        getAccount(activeBusinessId, accountId),
        getLedger(activeBusinessId, accountId, { dateFrom, dateTo, page, limit: PAGE_SIZE, direction, kind, search: search || undefined, standingOnly: true }),
        getAccountSummary(activeBusinessId, accountId, { dateFrom, dateTo }),
      ])
    : [null, null, null];

  // A page past the end (entries deleted away, an old link) opens the last
  // page instead of an empty ledger.
  const last = ledger ? pastEnd(page, ledger.meta.totalPages, ledger.meta.total) : null;
  if (last) redirect(pageHref("/balance/ledger", params, last));

  return (
    <AccountLedgerPageClient
      businessId={activeBusinessId}
      wallets={wallets}
      others={others}
      account={account}
      ledger={ledger}
      summary={summary}
      preferredLanguage={displayLanguage(await getLocale())}
      currency={currency}
      canManage={canManage}
      accountId={accountId}
      range={range}
      customFrom={customFrom}
      customTo={customTo}
      periodFrom={dateFrom}
      periodTo={dateTo}
      filters={{ direction: direction ?? null, kind: kind ?? null, search }}
      today={getAppToday()}
      backHref={statementBackPath(params.from)}
    />
  );
}
