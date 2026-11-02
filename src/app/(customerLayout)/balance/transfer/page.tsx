import { redirect } from "next/navigation";
import { TransfersPageClient, type TransferPeriod } from "@/components/modules/Customer/Balance/TransfersPageClient";
import { getWallets } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { isMonthKey, monthRangeDays } from "@/lib/customer/balanceDisplay";
import { resolveDateRange } from "@/lib/customer/dateRangePresets";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getTransactions, getTransactionsSummary } from "@/lib/customer/transactions";
import { getAppToday } from "@/lib/date";
import { pageHref, pastEnd, readPageParam, readPageSizeParam } from "@/lib/table/pageParams";

export const generateMetadata = () => customerPageMetadata("/balance/transfer");

// 25 transfers to a page unless the reader picks more.
const PAGE_SIZES = [25, 50, 100];
const PAGE_SIZE = 25;
const SEARCH_MAX = 80;

// Balance › Transfers: money moved between the workspace's own accounts,
// what it came to and what it cost in charges, and the history -- narrowed
// to an account, a period (or a run of months) and a search.
export default async function TransfersPage({ searchParams }: PageProps<"/balance/transfer">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const today = getAppToday();

  // All time, this month, this year, or a run of months (?start=2026-09&end=2026-11).
  const period: TransferPeriod =
    params.range === "custom"
      ? { range: "custom", start: isMonthKey(params.start) ? params.start : today.slice(0, 7), end: isMonthKey(params.end) ? params.end : null }
      : { range: params.range === "this-month" || params.range === "this-year" ? params.range : "all", start: null, end: null };
  const { dateFrom, dateTo } = period.range === "custom" ? monthRangeDays(period.start!, period.end) : resolveDateRange(period.range);
  const page = readPageParam(params);
  const limit = readPageSizeParam(params, PAGE_SIZES, PAGE_SIZE);
  const accountId = typeof params.account === "string" && params.account ? params.account : undefined;
  const search = typeof params.q === "string" ? params.q.trim().slice(0, SEARCH_MAX) : "";
  // Money moved between accounts: what a savings goal moved is Savings
  // Goals' own, and a deleted transfer (voided, with its reversal) is gone.
  const filters = { transactionType: "TRANSFER" as const, dateFrom, dateTo, accountId, search: search || undefined, excludeSavings: true, standingOnly: true };

  const [list, summary, wallets] = await Promise.all([
    getTransactions(activeBusinessId, { ...filters, page, limit, withBalanceAfter: true }),
    getTransactionsSummary(activeBusinessId, filters),
    getWallets(activeBusinessId),
  ]);

  // A page past the end (transfers deleted away, an old link) opens the last one.
  const last = pastEnd(page, list.meta.totalPages, list.meta.total);
  if (last) redirect(pageHref("/balance/transfer", params, last));

  // "Transfer from here" on Accounts (?new=1&from=<account>) opens New transfer from it.
  const openNew = canManage && params.new === "1";
  const fromId = openNew && typeof params.from === "string" ? params.from : null;

  return (
    <TransfersPageClient
      businessId={activeBusinessId}
      transfers={list.data}
      meta={list.meta}
      totals={{ moved: Number(summary?.totals.TRANSFER ?? 0), charges: Number(summary?.charges ?? 0), count: summary?.standing ?? list.meta.total }}
      wallets={wallets}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
      period={period}
      accountId={accountId ?? ""}
      search={search}
      periodFrom={dateFrom}
      periodTo={dateTo}
      today={today}
      pageSizes={PAGE_SIZES}
      defaultPageSize={PAGE_SIZE}
      openNew={openNew}
      fromId={fromId}
    />
  );
}
