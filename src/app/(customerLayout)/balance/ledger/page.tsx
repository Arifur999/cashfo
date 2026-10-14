import { redirect } from "next/navigation";
import { AccountLedgerPageClient } from "@/components/modules/Customer/Balance/AccountLedgerPageClient";
import { getAccount, getAccountSummary, getLedger, getWallets } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { resolveDateRange, type DateRangePreset } from "@/lib/customer/dateRangePresets";
import { getLocale } from "@/lib/i18n/locale";
import { displayLanguage } from "@/lib/customer/accountDisplay";

export default async function AccountLedgerPage({ searchParams }: PageProps<"/balance/ledger">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const currency = activeBusiness?.currency ?? "BDT";

  const accountId = typeof params.accountId === "string" ? params.accountId : "";
  const range = (typeof params.range === "string" ? params.range : "all") as DateRangePreset;
  const customFrom = typeof params.dateFrom === "string" ? params.dateFrom : undefined;
  const customTo = typeof params.dateTo === "string" ? params.dateTo : undefined;
  const page = typeof params.page === "string" ? Number(params.page) : 1;

  // Same account set as Balance Overview -- money accounts only (cash/
  // bank/mfs), including archived ones (struck through), rather than the
  // full chart of accounts (Income/Expense/Equity have no Adjustment
  // concept the way a money account does).
  const accounts = await getWallets(activeBusinessId);

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
      accounts={accounts}
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
