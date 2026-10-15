import { redirect } from "next/navigation";
import { AccountLedgerPageClient } from "@/components/modules/Customer/Balance/AccountLedgerPageClient";
import { displayLanguage } from "@/lib/customer/accountDisplay";
import { getAccount, getAccounts, getAccountSummary, getLedger, getWallets } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import type { Account } from "@/lib/customer/api";
import { getCurrentUser } from "@/lib/customer/auth";
import { isIsoDay, resolveDateRange, type DateRangePreset } from "@/lib/customer/dateRangePresets";
import { getLocale } from "@/lib/i18n/locale";

const PRESETS: DateRangePreset[] = ["all", "this-month", "last-month", "this-year", "custom"];

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
  const page = typeof params.page === "string" ? Math.max(1, Number(params.page) || 1) : 1;

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
        getLedger(activeBusinessId, accountId, { dateFrom, dateTo, page }),
        getAccountSummary(activeBusinessId, accountId, { dateFrom, dateTo }),
      ])
    : [null, null, null];

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
    />
  );
}
