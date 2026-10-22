import { redirect } from "next/navigation";
import { BalanceTransferPageClient } from "@/components/modules/Customer/Balance/BalanceTransferPageClient";
import { getWallets } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { resolveDateRange, type DateRangePreset } from "@/lib/customer/dateRangePresets";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getAllTransactions, getTransactions, getTransactionsSummary } from "@/lib/customer/transactions";
import { summaryTransferTotals, transferTotals } from "@/lib/customer/transfers";
import { getAppToday } from "@/lib/date";
import { pageHref, pastEnd, readPageParam, readPageSizeParam } from "@/lib/table/pageParams";

export const generateMetadata = () => customerPageMetadata("/balance/transfer");

const PRESETS: DateRangePreset[] = ["all", "this-month", "last-month", "this-year"];

// 25 transfers to a page unless the reader picks more.
const PAGE_SIZES = [25, 50, 100];
const PAGE_SIZE = 25;

export default async function BalanceTransferPage({ searchParams }: PageProps<"/balance/transfer">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  const range = PRESETS.find((preset) => preset === params.range) ?? "all";
  const { dateFrom, dateTo } = resolveDateRange(range);
  const page = readPageParam(params);
  const limit = readPageSizeParam(params, PAGE_SIZES, PAGE_SIZE);
  const filters = { transactionType: "TRANSFER" as const, dateFrom, dateTo };
  // A savings goal's Add funds is posted as a transfer into a savings
  // wallet. This page is money moved between wallets, so the list and the
  // cards alike leave out what a goal moved.
  const walletFilters = { ...filters, excludeSavings: true };

  // One round trip: a page of the history, the summary of every transfer
  // and of the wallet-to-wallet ones (the difference is what the goals
  // moved), and the wallets for the rows' icons.
  const [walletPage, all, walletOnly, wallets] = await Promise.all([
    getTransactions(activeBusinessId, { ...walletFilters, page, limit }),
    getTransactionsSummary(activeBusinessId, filters),
    getTransactionsSummary(activeBusinessId, walletFilters),
    getWallets(activeBusinessId),
  ]);
  const fromSummaries = all && walletOnly ? summaryTransferTotals(all, walletOnly) : null;

  // A backend older than excludeSavings refuses it (a 400, read as an empty
  // page and a null summary). Its list then shows every transfer, a goal's
  // marked as savings, and without the summaries the cards' figures come the
  // old way: every transfer in the range, read 100 at a time.
  const [{ data: transfers, meta }, everyTransfer] = await Promise.all([
    walletOnly ? walletPage : getTransactions(activeBusinessId, { ...filters, page, limit }),
    fromSummaries ? null : getAllTransactions(activeBusinessId, filters),
  ]);
  const totals = fromSummaries ?? transferTotals(everyTransfer?.data ?? []);
  const complete = everyTransfer?.complete ?? true;

  // A page past the end (transfers voided away, an old link) opens the last one.
  const last = pastEnd(page, meta.totalPages, meta.total);
  if (last) redirect(pageHref("/balance/transfer", params, last));

  return (
    <BalanceTransferPageClient
      businessId={activeBusinessId}
      transfers={transfers}
      meta={meta}
      totals={totals}
      complete={complete}
      wallets={wallets}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
      range={range}
      periodFrom={dateFrom}
      periodTo={dateTo}
      excludeSavings={!!walletOnly}
      today={getAppToday()}
      pageSizes={PAGE_SIZES}
      defaultPageSize={PAGE_SIZE}
    />
  );
}
