"use client";

import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  BookText,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Download,
  Landmark,
  Package,
  PiggyBank,
  Printer,
  ScrollText,
  Search,
  Store,
  Tag,
  TrendingUp,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createElement, useEffect, useState } from "react";
import { toast } from "sonner";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { ListCard, ListCell, ListFooter, ListHead, ListHeadCell, ListRow, ListRowButton, ListSummaryRow } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { getStatementRowsAction } from "@/lib/customer/accountActions";
import { accountDisplayName, balanceText } from "@/lib/customer/accountDisplay";
import type { Account, AccountLedger, AccountSummary, ActiveMonth, LanguagePreference, LedgerKind, LedgerRow } from "@/lib/customer/api";
import { accountColor, directionOf, kindOf, LEDGER_KIND_META, ledgerCsv, ledgerFileName, maskedMoney, partyOf, walletColorStyle } from "@/lib/customer/balanceDisplay";
import { currencySymbol, formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { periodHref, type PickedPeriod } from "@/lib/customer/period";
import { isDebitPositive, periodText, readsAsMoney, statementBackLabel, type StatementLine, statementPage, voidedNet } from "@/lib/customer/ledger";
import { walletIcon } from "@/lib/customer/walletVisuals";
import { formatDay } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PeriodPicker, periodLabel as periodName } from "../Shared/PeriodPicker";
import { plural } from "@/lib/i18n/message";
import { pageHref } from "@/lib/table/pageParams";
import { cn } from "@/lib/utils";
import { AccountPicker } from "./AccountPicker";
import { HideBalancesButton } from "./HideBalancesButton";
import { LedgerEntryDialog } from "./LedgerEntryDialog";
import { LedgerStatement } from "./LedgerStatement";
import { PrintPreview } from "./PrintPreview";
import { useBalancesHidden } from "./useBalancesHidden";

interface AccountLedgerPageClientProps {
  businessId: string;
  wallets: Account[];
  others: Account[];
  account: Account | null;
  ledger: AccountLedger | null;
  summary: AccountSummary | null;
  preferredLanguage: LanguagePreference;
  currency: string;
  canManage: boolean;
  accountId: string;
  period: PickedPeriod;
  // The months this account has anything in; null when the API can't say.
  activeMonths: ActiveMonth[] | null;
  // The period's first and last day (none for all time).
  periodFrom?: string;
  periodTo?: string;
  // What the rows are narrowed to (the URL's dir, kind and q).
  filters: { direction: "in" | "out" | null; kind: LedgerKind | null; search: string };
  today: string;
  // The page the ledger was opened from (?from=, a path on this site).
  backHref?: string | null;
}

const ALL_TIME: PickedPeriod = { kind: "all" };

// #, Date, Received / Sent, Type, To / From, Note, Amount, Balance; phones
// scroll it sideways.
const COLUMNS = "grid-cols-[26px_92px_104px_132px_minmax(0,1.15fr)_minmax(0,1fr)_118px_112px] gap-x-3.5 md:px-5 min-w-250";
const SEARCH_DELAY = 350;

const KIND_ICON: Record<LedgerKind, LucideIcon> = {
  INCOME: TrendingUp,
  EXPENSE: Tag,
  TRANSFER: Landmark,
  SAVINGS: PiggyBank,
  SAVINGS_WITHDRAW: PiggyBank,
  LOAN_OUT: UserRound,
  LOAN_IN: UserRound,
  PAYMENT_IN: Store,
  PAYMENT_OUT: Store,
  ASSET_PURCHASE: Package,
  ASSET_SALE: Package,
  INVESTMENT: TrendingUp,
  INVESTMENT_RETURN: TrendingUp,
  ADJUSTMENT: CircleCheckBig,
  OTHER: BookText,
};

// Account ledger (board: Balance — Ledger): one account over a period, the
// equation from its opening balance to its closing one, then every entry --
// received or sent, its kind, with whom, its note and the balance after it
// -- narrowed by direction, kind and a search, each opening its details.
// CSV downloads what is shown; Print previews the whole period.
export function AccountLedgerPageClient(props: AccountLedgerPageClientProps) {
  const { businessId, wallets, others, account, ledger, summary, preferredLanguage, currency, canManage, accountId, period, activeMonths, periodFrom, periodTo, filters, today, backHref } = props;
  const { t, fmt } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pdfExportOn = useFeature("pdf_export");
  const { hidden, toggle } = useBalancesHidden();
  const [opened, setOpened] = useState<{ row: LedgerRow; kind: LedgerKind; direction: "in" | "out" } | null>(null);
  const [printing, setPrinting] = useState<{ rows: LedgerRow[]; complete: boolean } | null>(null);
  const [busy, setBusy] = useState<"print" | "csv" | null>(null);
  const [query, setQuery] = useState(filters.search);

  function hrefWith(next: Record<string, string | undefined | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    const rest = params.toString();
    return rest ? `${pathname}?${rest}` : pathname;
  }
  // Another account or period is a step Back can undo; a filter replaces it.
  const go = (next: Record<string, string | undefined | null>) => router.push(hrefWith(next));
  const narrow = (next: Record<string, string | undefined | null>) => router.replace(hrefWith(next), { scroll: false });

  // Typing searches once it settles.
  useEffect(() => {
    const next = query.trim();
    if (next === filters.search) return;
    const timer = window.setTimeout(() => narrow({ q: next || undefined }), SEARCH_DELAY);
    return () => window.clearTimeout(timer);
    // narrow reads the current URL each time; filters.search is the URL's own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
  const [prevSearch, setPrevSearch] = useState(filters.search);
  if (filters.search !== prevSearch) {
    setPrevSearch(filters.search);
    setQuery(filters.search);
  }

  const ready = account && ledger && summary;
  const money = account ? readsAsMoney(account) : true;
  const debitPositive = account ? isDebitPositive(account.accountType) : true;
  const symbol = currencySymbol(currency, fmt);
  const shown = (value: string | number) => (hidden ? maskedMoney(symbol) : balanceText(value, currency, fmt));
  const lines = ledger ? statementPage(ledger) : null;
  const residual = ledger && summary && lines?.exact ? voidedNet(ledger, summary) : 0;
  const transfers = summary ? Number(summary.adjustment) : 0;
  const showTransfers = money || transfers !== 0;
  const accountName = account ? accountDisplayName(account, preferredLanguage) : "";
  const periodLabel = periodName(period, t, fmt);
  // Before an account is picked, the line names the chosen period, so the
  // picker visibly does something.
  const emptyPeriodText =
    period.kind === "all"
      ? t("You'll see its opening balance, every movement and the running balance for all time, ready to print.")
      : period.kind === "month"
        ? t("You'll see its opening balance, every movement and the running balance for {period}, ready to print.", { period: periodLabel })
        : period.kind === "year"
          ? t("You'll see its opening balance, every movement and the running balance for {year}, ready to print.", { year: toLocaleDigits(String(period.year), fmt) })
          : t("You'll see its opening balance, every movement and the running balance from {from} to {to}, ready to print.", {
              from: formatDay(period.from, "d MMM yyyy", fmt),
              to: formatDay(period.to, "d MMM yyyy", fmt),
            });
  const rangeText = periodText(t, periodFrom, periodTo, fmt);
  // On paper, all time reads as the first to the last entry's day (the board).
  const printDays = (printing?.rows ?? []).map((row) => row.date.slice(0, 10)).sort();
  const printRange = periodFrom || periodTo || printDays.length === 0 ? rangeText : periodText(t, printDays[0], printDays[printDays.length - 1], fmt);
  const narrowed = !!(filters.direction || filters.kind || filters.search);
  const counts = ledger?.counts ?? { all: ledger?.meta.total ?? 0, in: 0, out: 0 };
  const kinds = ledger?.kinds ?? [];

  // Every row the screen's filters match, across pages.
  async function allRows(withFilters: boolean) {
    const result = await getStatementRowsAction(businessId, accountId, {
      dateFrom: periodFrom,
      dateTo: periodTo,
      standingOnly: true,
      ...(withFilters && { direction: filters.direction ?? undefined, kind: filters.kind ?? undefined, search: filters.search || undefined }),
    });
    if (!result.success || !result.data) throw new Error(result.message ?? "");
    return result.data;
  }

  async function openPrint() {
    if (!ledger) return;
    if (ledger.meta.totalPages <= 1 && !narrowed) {
      setPrinting({ rows: ledger.entries, complete: true });
      return;
    }
    setBusy("print");
    try {
      setPrinting(await allRows(false));
    } catch {
      toast.error(t("Couldn't load the whole statement. Try again."));
    } finally {
      setBusy(null);
    }
  }

  async function downloadCsv() {
    if (!ledger || !account) return;
    setBusy("csv");
    try {
      const { rows, complete } = ledger.meta.totalPages <= 1 ? { rows: ledger.entries, complete: true } : await allRows(true);
      const plain = (value: string | number) => Number(value).toFixed(2);
      const body = ledgerCsv({
        account: accountName,
        period: `${periodLabel} (${rangeText})`,
        opening: plain(ledger.balanceBroughtForward),
        closing: plain(ledger.closingBalance),
        heads: {
          account: t("Account"),
          period: t("Period"),
          opening: t("Opening balance"),
          closing: t("Closing balance"),
          columns: [t("Date"), t("Type"), t("Received or sent"), t("To / From"), t("Note"), t("Reference"), t("In"), t("Out"), t("Balance")],
        },
        rows: rows.map((row) => {
          const kind = kindOf(row);
          const direction = directionOf(row, debitPositive);
          const party = partyOf(row, kind);
          return {
            date: row.date.slice(0, 10),
            kind: t(LEDGER_KIND_META[kind].label),
            direction: t(direction === "in" ? "Received" : "Sent"),
            party: party ? t(party) : "",
            note: row.description ? t(row.description) : "",
            reference: row.referenceNo ?? "",
            in: direction === "in" ? plain(row.amount) : "",
            out: direction === "out" ? plain(row.amount) : "",
            balance: plain(row.runningBalance),
          };
        }),
      });
      const name = ledgerFileName(account.name, today);
      const url = URL.createObjectURL(new Blob([body], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success(plural(t, rows.length, "Downloaded {name} ({count} entry)", "Downloaded {name} ({count} entries)", { name }, fmt), {
        // A period longer than one file takes: say so instead of a quiet cut.
        ...(!complete && { description: t("The file holds the first {count} entries. Pick a shorter period for the rest.", { count: formatCount(rows.length, fmt) }) }),
      });
    } catch {
      toast.error(t("Couldn't download the CSV. Try again."));
    } finally {
      setBusy(null);
    }
  }

  const lineLabel = (line: StatementLine) => (line.kind === "brought-forward" ? t("Brought forward") : line.kind === "carried-forward" ? t("Carried forward") : line.kind === "opening" ? t("Opening balance") : t("Closing balance"));
  // Filtered rows jump between balances, so only the period's own lines stand around them.
  const topLine = lines && (!narrowed || lines.top.kind === "opening") ? lines.top : null;
  const bottomLine = lines && (!narrowed || lines.bottom.kind === "closing") ? lines.bottom : null;

  const emptyText = !ledger
    ? ""
    : filters.search
      ? t('Nothing matches "{query}".', { query: filters.search })
      : filters.direction === "in"
        ? t("Nothing received in this period.")
        : filters.direction === "out"
          ? t("Nothing sent in this period.")
          : filters.kind
            ? t("No entries of this type in this period.")
            : t("No entries for {name} in this period. The balance stays {amount}.", { name: accountName, amount: shown(ledger.closingBalance) });

  return (
    <PageFrame className="gap-5 leading-[normal]">
      {printing && ready && (
        <PrintPreview subtitle={`A4 · ${accountName} · ${periodLabel}`} onClose={() => setPrinting(null)}>
          <LedgerStatement
            account={account}
            rows={printing.rows}
            figures={{ opening: ledger.balanceBroughtForward, moneyIn: summary.totalIn, moneyOut: summary.totalOut, transfers: summary.adjustment, closing: ledger.closingBalance }}
            capped={!printing.complete}
            periodLabel={periodLabel}
            range={printRange}
            month={period.kind === "month" ? `${period.year}-${String(period.month).padStart(2, "0")}` : null}
            today={today}
            currency={currency}
            preferredLanguage={preferredLanguage}
          />
        </PrintPreview>
      )}
      <div className="contents print:hidden">
        {backHref && (
          <Link href={backHref} className="-mb-2 inline-flex items-center gap-2 self-start text-small font-semibold text-emerald hover:text-emerald-hover">
            <ArrowLeft className="size-3.75" aria-hidden="true" />
            {t(statementBackLabel(backHref))}
          </Link>
        )}
        <PageHeader
          className={ready ? "md:items-center" : undefined}
          title={t("Account ledger")}
          description={ready ? undefined : t("Every movement through one account, with a running balance.")}
          actions={
            !ready ? (
              pdfExportOn && (
                <Button variant="outline" disabled title={t("Pick an account first")} className="gap-2 px-3.5 text-ink-faint disabled:opacity-100">
                  <Printer className="text-ink-faint" />
                  {t("Print / PDF")}
                </Button>
              )
            ) : (
            <>
              <HideBalancesButton hidden={hidden} onToggle={toggle} className="size-11" />
              <Button variant="secondary" onClick={downloadCsv} disabled={!ready || busy !== null} aria-label={t("Download CSV")} title={t("Download CSV")} className="h-11 pr-4 pl-3.5">
                {busy === "csv" ? <Loader size={16} label={t("Loading...")} /> : <Download className="size-4.25 text-ink-2" />}
                CSV
              </Button>
              {pdfExportOn && (
                <Button
                  variant="secondary"
                  onClick={openPrint}
                  disabled={!ready || busy !== null}
                  aria-label={t("Print or save as PDF")}
                  title={ready ? t("Print or save as PDF") : t("Pick an account first")}
                  className="size-11 rounded-full p-0 disabled:pointer-events-auto disabled:cursor-not-allowed"
                >
                  {busy === "print" ? <Loader size={16} label={t("Loading...")} /> : <Printer className="size-4.5 text-ink-2" />}
                </Button>
              )}
            </>
            )
          }
        />

        <Card padding="none" className="flex flex-col gap-4 px-5 py-4 md:flex-row md:flex-wrap md:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:min-w-72">
            <label id="ledger-account-label" htmlFor="ledger-account" className="text-small font-medium text-ink-soft">
              {t("Account")}
            </label>
            <AccountPicker id="ledger-account" labelId="ledger-account-label" wallets={wallets} others={others} value={accountId} onChange={(id) => go({ accountId: id, dir: undefined, kind: undefined, q: undefined })} preferredLanguage={preferredLanguage} currency={currency} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-small font-medium text-ink-soft">{t("Period")}</span>
            <PeriodPicker
              period={period}
              today={today}
              activeMonths={activeMonths}
              allowAll
              defaultPeriod={ALL_TIME}
              onPick={(next) => router.push(periodHref(pathname, Object.fromEntries(searchParams.entries()), next))}
            />
          </div>
        </Card>

        {!ready || !lines ? (
          <Card padding="none" className="flex flex-col items-center justify-center gap-2.5 p-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-[14px] bg-mint-50 text-emerald">
              <ScrollText className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-1.5 text-[18px] font-semibold text-ink">{t("Pick an account to see its ledger")}</h2>
            <p className="max-w-115 text-body leading-[1.55] text-ink-muted">{emptyPeriodText}</p>
            {wallets.some((wallet) => wallet.status !== "ARCHIVED") && (
              <>
              <span className="mt-4.5 text-caption font-semibold tracking-[0.04em] text-ink-muted uppercase">{t("Your wallets")}</span>
              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:w-auto md:grid-cols-4">
                {wallets
                  .filter((wallet) => wallet.status !== "ARCHIVED")
                  .map((wallet) => (
                    <button
                      key={wallet.id}
                      type="button"
                      onClick={() => go({ accountId: wallet.id })}
                      style={walletColorStyle(accountColor(wallet))}
                      className="flex h-16 items-center gap-2.5 rounded-field border border-line bg-surface px-3.5 text-left shadow-xs transition-colors hover:border-line-strong md:w-50"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg wallet-tile [&_svg]:size-3.75">{createElement(walletIcon(wallet), { "aria-hidden": true })}</span>
                      <span className="flex min-w-0 flex-col gap-px">
                        <span className="truncate text-body font-semibold text-ink">{accountDisplayName(wallet, preferredLanguage)}</span>
                        <span className={cn("text-caption tabular-nums", Number(wallet.currentBalance) < 0 ? "text-expense" : "text-ink-muted")}>{shown(wallet.currentBalance)}</span>
                      </span>
                    </button>
                  ))}
              </div>
              <span className="mt-1.5 text-caption text-ink-muted">{t("Income, expense and other accounts are in the search above.")}</span>
              </>
            )}
          </Card>
        ) : (
          <>
            <Card role="group" aria-label={t("Opening balance plus money in, minus money out, plus transfers, equals closing balance")} className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 md:py-4.5 xl:flex xl:items-stretch xl:gap-2.5">
              <Term label={t("Opening balance")} value={shown(ledger.balanceBroughtForward)} />
              <Operator>+</Operator>
              <Term label={money ? t("Money in@@wallet") : t("Increase@@statement")} value={hidden ? maskedMoney(symbol) : formatCurrency(summary.totalIn, currency, fmt)} className={money ? "text-emerald" : undefined} />
              <Operator>−</Operator>
              <Term label={money ? t("Money out@@wallet") : t("Decrease@@statement")} value={hidden ? maskedMoney(symbol) : formatCurrency(summary.totalOut, currency, fmt)} className={money ? "text-expense" : undefined} />
              {showTransfers && (
                <>
                  <Operator>±</Operator>
                  <Term label={t("Transfers")} value={hidden ? maskedMoney(symbol) : formatSignedCurrency(transfers, currency, fmt)} className="text-info" />
                </>
              )}
              {residual !== 0 && (
                <>
                  <Operator>±</Operator>
                  <Term label={t("Voided & reversed")} value={hidden ? maskedMoney(symbol) : formatSignedCurrency(residual, currency, fmt)} className="text-ink-2" />
                </>
              )}
              <Operator equals>=</Operator>
              <div className="col-span-full flex min-w-0 flex-col gap-1 rounded-field bg-mint-50 px-3.5 py-2 xl:col-auto xl:-my-2 xl:-mr-2.5 xl:flex-[1.2]">
                <span className="text-caption font-semibold text-emerald">{t("Closing balance")}</span>
                <span className="text-h3 font-bold text-ink tabular-nums wrap-anywhere sm:text-[22px]">{shown(ledger.closingBalance)}</span>
              </div>
            </Card>

            <ListCard
              id="statement-list"
              label={t("Account ledger")}
              scrollable
              tableClassName="overflow-x-auto"
              header={
                <div className="flex flex-wrap items-center gap-3 border-b border-divider px-4 py-3 md:px-5">
                  <div role="group" aria-label={t("Show")} className="flex gap-0.5 rounded-full bg-surface-sunken p-0.75">
                    {(
                      [
                        { value: null, label: "All", count: counts.all, icon: null },
                        { value: "in", label: "Received", count: counts.in, icon: ArrowDownLeft },
                        { value: "out", label: "Sent", count: counts.out, icon: ArrowUpRight },
                      ] as const
                    ).map((option) => {
                      const on = filters.direction === option.value;
                      return (
                        <button
                          key={option.label}
                          type="button"
                          aria-pressed={on}
                          onClick={() => narrow({ dir: option.value ?? undefined })}
                          className={cn("flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap", on ? "bg-surface text-ink shadow-[0_1px_2px_rgba(18,32,29,0.12)] dark:bg-surface-raised" : "text-ink-2 hover:text-ink")}
                        >
                          {option.icon && createElement(option.icon, { className: cn("size-3.25", option.value === "in" ? "text-income" : "text-expense"), strokeWidth: 2.5, "aria-hidden": true })}
                          {t(option.label)}
                          <span className="text-[11.5px] font-medium text-ink-faint">{formatCount(option.count, fmt)}</span>
                        </button>
                      );
                    })}
                  </div>
                  <NativeSelect size="sm" aria-label={t("Type")} value={filters.kind ?? ""} onChange={(event) => narrow({ kind: event.target.value || undefined })} frameClassName="h-9.5 min-w-37.5 rounded-full" className="rounded-full pl-3.5 text-[13px]">
                    <option value="">{t("All types")}</option>
                    {(filters.kind && !kinds.includes(filters.kind) ? [...kinds, filters.kind] : kinds).map((kind) => (
                      <option key={kind} value={kind}>
                        {t(LEDGER_KIND_META[kind].label)}
                      </option>
                    ))}
                  </NativeSelect>
                  <span className="hidden flex-1 md:block" />
                  <label className="flex h-9.5 min-w-0 flex-1 items-center gap-2 rounded-full border border-input bg-surface pr-1.5 pl-3 focus-within:border-focus-ring focus-within:focus-halo md:max-w-70">
                    <Search className="size-3.75 shrink-0 text-ink-muted" aria-hidden="true" />
                    <span className="sr-only">{t("Search entries")}</span>
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={(event) => event.key === "Escape" && setQuery("")}
                      maxLength={80}
                      placeholder={t("Search entries")}
                      className="h-9 min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
                    />
                    {query && (
                      <button type="button" onClick={() => setQuery("")} aria-label={t("Clear search")} title={t("Clear search")} className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-2">
                        <X className="size-3" strokeWidth={2.5} aria-hidden="true" />
                      </button>
                    )}
                  </label>
                </div>
              }
              footer={
                (
                  <ListFooter className="flex-row items-center justify-between gap-3 border-line">
                    <span>
                      {plural(t, ledger.meta.total, "{count} entry", "{count} entries", undefined, fmt)} · {t("Page {page} of {pages}", { page: formatCount(ledger.meta.page, fmt), pages: formatCount(Math.max(1, ledger.meta.totalPages), fmt) })}
                    </span>
                    <nav aria-label={t("Pages")} className="flex gap-1.5">
                      <PageStep label={t("Previous page")} href={ledger.meta.page > 1 ? pageHref(pathname, searchParams, ledger.meta.page - 1) : null} icon={ChevronLeft} />
                      <PageStep label={t("Next page")} href={ledger.meta.page < ledger.meta.totalPages ? pageHref(pathname, searchParams, ledger.meta.page + 1) : null} icon={ChevronRight} />
                    </nav>
                  </ListFooter>
                )
              }
            >
              <ListHead showOnPhone columns={COLUMNS}>
                <ListHeadCell>#</ListHeadCell>
                <ListHeadCell>{t("Date")}</ListHeadCell>
                <ListHeadCell>{t("Received / Sent")}</ListHeadCell>
                <ListHeadCell>{t("Type")}</ListHeadCell>
                <ListHeadCell>{t("To / From")}</ListHeadCell>
                <ListHeadCell>{t("Note")}</ListHeadCell>
                <ListHeadCell align="end">{t("Amount")}</ListHeadCell>
                <ListHeadCell align="end">{t("Balance")}</ListHeadCell>
              </ListHead>
              {topLine && <BalanceLine label={lineLabel(topLine)} kind={topLine.kind} value={shown(topLine.balance)} />}
              {ledger.entries.length === 0 && (
                <div className="flex flex-col items-center gap-2.5 border-b border-divider px-6 py-7 text-center text-body text-ink-muted">
                  {emptyText}
                  {narrowed && (
                    <Button variant="secondary" size="sm" onClick={() => narrow({ dir: undefined, kind: undefined, q: undefined })}>
                      {t("Clear filters")}
                    </Button>
                  )}
                </div>
              )}
              {ledger.entries.map((row, index) => {
                const kind = kindOf(row);
                const meta = LEDGER_KIND_META[kind];
                const direction = directionOf(row, debitPositive);
                const isIn = direction === "in";
                const party = partyOf(row, kind);
                return (
                  <ListRow key={row.entryId} columns={COLUMNS} className="tabular-nums md:min-h-15">
                    <ListCell className="text-small text-ink-faint">{formatCount(lines.firstRow + index, fmt)}</ListCell>
                    <ListCell className="whitespace-nowrap text-ink-2">{formatDate(row.date, undefined, fmt)}</ListCell>
                    <ListCell>
                      <ListRowButton onClick={() => setOpened({ row, kind, direction })} aria-label={t("Open details")} className={cn("inline-flex items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap", isIn ? "text-income" : "text-expense")}>
                        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", isIn ? "bg-income-soft" : "bg-expense-soft")}>
                          {isIn ? <ArrowDownLeft className="size-3.25" strokeWidth={2.5} aria-hidden="true" /> : <ArrowUpRight className="size-3.25" strokeWidth={2.5} aria-hidden="true" />}
                        </span>
                        {t(isIn ? "Received" : "Sent")}
                      </ListRowButton>
                    </ListCell>
                    <ListCell>
                      <Chip tone={meta.tone} className="h-5.25 px-2.25">
                        {t(meta.label)}
                      </Chip>
                    </ListCell>
                    <ListCell className="flex items-center gap-2.5">
                      <Chip tone={meta.tone} size="sm" className="size-7.5 shrink-0 justify-center rounded-[9px] p-0 [&_svg]:size-3.75">
                        {createElement(KIND_ICON[kind], { "aria-hidden": true })}
                      </Chip>
                      <span className="flex min-w-0 flex-col gap-px">
                        <span className="text-[11.5px] whitespace-nowrap text-ink-faint">{t(isIn ? meta.kickerIn : meta.kickerOut)}</span>
                        <span className="truncate font-semibold text-ink">{party ? t(party) : "—"}</span>
                      </span>
                    </ListCell>
                    <ListCell className="flex flex-col gap-px">
                      <span className="truncate text-ink-2">{row.chargeFor ? t("Transfer fee · {name}", { name: row.chargeFor }) : row.description ? t(row.description) : "—"}</span>
                      {row.referenceNo && <span className="truncate text-[11.5px] text-ink-faint">{row.referenceNo}</span>}
                    </ListCell>
                    <ListCell align="end" className={cn("font-semibold whitespace-nowrap", isIn ? "text-income" : "text-expense")}>
                      {hidden ? maskedMoney(symbol) : `${isIn ? "+" : "−"} ${formatCurrency(row.amount, currency, fmt)}`}
                    </ListCell>
                    <ListCell align="end" className="font-semibold whitespace-nowrap">
                      {shown(row.runningBalance)}
                    </ListCell>
                  </ListRow>
                );
              })}
              {bottomLine && <BalanceLine label={lineLabel(bottomLine)} kind={bottomLine.kind} value={shown(bottomLine.balance)} strong={bottomLine.kind === "closing"} />}
            </ListCard>
          </>
        )}
      </div>

      <LedgerEntryDialog entry={opened} accountName={accountName} accountBalance={account?.currentBalance ?? "0"} businessId={businessId} canManage={canManage} currency={currency} onClose={() => setOpened(null)} />
    </PageFrame>
  );
}

// A balance line on the table-head band, under the Balance column.
function BalanceLine({ label, kind, value, strong = false }: { label: string; kind: StatementLine["kind"]; value: string; strong?: boolean }) {
  return (
    <ListSummaryRow kind={kind} columns={COLUMNS} className={cn("h-11.5 py-0 text-body", strong && "h-auto min-h-13.5 py-1.5")}>
      <ListCell aria-hidden="true" />
      <ListCell aria-colspan={6} className="col-span-6">
        <span className={cn("font-semibold", strong ? "font-bold text-ink" : "text-ink-2")}>{label}</span>
      </ListCell>
      <ListCell align="end" className={cn("font-semibold whitespace-nowrap text-ink tabular-nums", strong && "text-[15px] font-bold")}>
        {value}
      </ListCell>
    </ListSummaryRow>
  );
}

// The board's round page step: a link, or set back when there's no page that way.
function PageStep({ label, href, icon }: { label: string; href: string | null; icon: LucideIcon }) {
  const look = "flex size-8 items-center justify-center rounded-full border border-line bg-surface text-ink-soft [&_svg]:size-4";
  return href ? (
    <Link href={href} aria-label={label} title={label} scroll={false} className={cn(look, "hover:bg-surface-sunken")}>
      {createElement(icon, { "aria-hidden": true })}
    </Link>
  ) : (
    <span aria-hidden="true" className={cn(look, "opacity-50")}>
      {createElement(icon)}
    </span>
  );
}

function Term({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 xl:flex-1">
      <span className="text-caption text-ink-muted">{label}</span>
      <span className={cn("text-h3 font-bold text-ink tabular-nums wrap-anywhere sm:text-[20px]", className)}>{value}</span>
    </div>
  );
}

// The round operator between two terms, on one line from xl.
function Operator({ equals = false, children }: { equals?: boolean; children: React.ReactNode }) {
  return (
    <span aria-hidden="true" className={cn("hidden size-6.5 shrink-0 items-center justify-center self-center rounded-full text-body-lg font-semibold xl:flex", equals ? "bg-emerald text-on-action" : "bg-surface-sunken text-ink-2")}>
      {children}
    </span>
  );
}
