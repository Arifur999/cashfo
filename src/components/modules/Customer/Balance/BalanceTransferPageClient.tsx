"use client";

import { ArrowLeftRight, ArrowRight, CircleOff, Eye, Info, PiggyBank, Plus, Printer, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createElement, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { VoidTransactionDialog } from "@/components/modules/Customer/Transactions/VoidTransactionDialog";
import Loader from "@/components/shared/Loader";
import AmountText from "@/components/smartly/AmountText";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowActions, ListRowLink } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import Pagination from "@/components/smartly/Pagination";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account, Transaction, TransactionListResponse } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import type { DateRangePreset } from "@/lib/customer/dateRangePresets";
import { periodText, transactionHref } from "@/lib/customer/ledger";
import { cancelledLabel, isCancelled } from "@/lib/customer/transactionDisplay";
import { listTransfersForPrintAction } from "@/lib/customer/transferActions";
import { isSavingsTransfer, transferAmount, transferParties, type TransferTotals } from "@/lib/customer/transfers";
import { walletIcon, walletPalette } from "@/lib/customer/walletVisuals";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { pageHref } from "@/lib/table/pageParams";
import { cn } from "@/lib/utils";
import { TransferDrawer } from "./TransferDrawer";

interface BalanceTransferPageClientProps {
  businessId: string;
  // This page of the history, newest first. What savings goals moved is left
  // out, as in the cards; an older backend lists it, marked as savings.
  transfers: Transaction[];
  meta: TransactionListResponse["meta"];
  // The cards' figures, over every page of the period.
  totals: TransferTotals;
  // false when the figures cover only the latest 1,000 (an older backend
  // without the summary endpoint; see the page).
  complete: boolean;
  // Every wallet, for the icons and colours on the rows.
  wallets: Account[];
  currency: string;
  canManage: boolean;
  range: DateRangePreset;
  // The period resolved on the server, for the printed copy.
  periodFrom?: string;
  periodTo?: string;
  // Whether the list leaves out what savings goals moved (false on an older
  // backend), so Print loads the same rows.
  excludeSavings: boolean;
  today: string;
  pageSizes: number[];
  defaultPageSize: number;
}

const PERIODS: { value: DateRangePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-year", label: "This year" },
];

// From → To and the note share the free width, so a long note isn't cut
// beside an empty stretch of the wallets' column.
const COLUMNS = "md:grid-cols-[96px_minmax(0,1fr)_minmax(0,1fr)_120px_96px]";
const ICON_BUTTON = "flex size-8 items-center justify-center rounded-md pointer-coarse:size-11";
// A voided transfer and the reversal that undid it are set back as a whole,
// as the board draws them: every cell fades (the wallet tiles, the amount,
// the chip) but the actions, which stay at full strength. A faded cell is a
// layer of its own that would cover the row's stretched link, so the link's
// cell is lifted above them (z-index works on a grid item without moving
// the link's containing block off the row).
const CANCELLED_ROW = "[&>[role=cell]:not([data-slot=list-row-actions])]:grayscale [&>[role=cell]:has([data-slot=list-row-link])]:z-1";

// Transfer: money moved between the customer's own wallets -- what moved
// in the period, the note that it is never income or expense, and the
// history, 25 to a page, with a void action on each standing transfer.
export function BalanceTransferPageClient({ businessId, transfers, meta, totals, complete, wallets, currency, canManage, range, periodFrom, periodTo, excludeSavings, today, pageSizes, defaultPageSize }: BalanceTransferPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Admin > System > Feature Flags: pdf_export off hides Print.
  const pdfExportOn = useFeature("pdf_export");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [voiding, setVoiding] = useState<Transaction | null>(null);
  // Print's copy of the whole period while the print dialog is open; null
  // the rest of the time, when the list shows the page on screen.
  const [printed, setPrinted] = useState<{ transfers: Transaction[]; complete: boolean } | null>(null);
  const [preparing, setPreparing] = useState(false);

  // ?new=1 (Balance's Move money, the drawer's Add a wallet) opens the drawer.
  const asked = canManage && searchParams.get("new") === "1";
  const [prevAsked, setPrevAsked] = useState(false);
  if (asked !== prevAsked) {
    setPrevAsked(asked);
    if (asked) setDrawerOpen(true);
  }
  // Then the URL forgets it, so Back or a refresh doesn't open it again.
  useEffect(() => {
    if (!searchParams.has("new")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  const walletById = new Map(wallets.map((wallet, index) => [wallet.id, { wallet, index }]));
  const here = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
  const paged = meta.totalPages > 1;

  function hrefWith(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    // Another period or page size starts at its first page.
    params.delete("page");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function updateRange(next: DateRangePreset) {
    router.push(hrefWith({ range: next === "all" ? undefined : next }));
  }

  function setPageSize(size: number) {
    router.push(hrefWith({ limit: size === defaultPageSize ? undefined : String(size) }), { scroll: false });
  }

  // One page is printed as it stands. More than one: the whole period is
  // loaded first and listed for the paper copy, then the page comes back.
  async function print() {
    if (!paged) {
      window.print();
      return;
    }
    setPreparing(true);
    try {
      const result = await listTransfersForPrintAction(businessId, { dateFrom: periodFrom, dateTo: periodTo, excludeSavings });
      // The screen has rows, so an empty answer is a failed one.
      if (!result.success || !result.data?.transfers.length) {
        toast.error(t("Couldn't load the transfers to print"));
        return;
      }
      const loaded = result.data;
      flushSync(() => {
        setPreparing(false);
        setPrinted(loaded);
      });
      window.addEventListener("afterprint", () => setPrinted(null), { once: true });
      window.print();
    } catch {
      toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
    } finally {
      setPreparing(false);
    }
  }
  const listed = printed?.transfers ?? transfers;

  // A wallet's name in the reader's language, from the wallet list where it
  // is there (as the pickers name it), else from the transfer's own entry.
  const lang = displayLanguage(locale);
  const namesOf = (transfer: Transaction) => {
    const parties = transferParties(transfer, locale);
    const name = (id: string | null, fallback: string) => {
      const found = id ? walletById.get(id) : undefined;
      return found ? accountDisplayName(found.wallet, lang) : fallback;
    };
    return { ...parties, from: name(parties.fromId, parties.from), to: name(parties.toId, parties.to) };
  };
  const voidingParties = voiding ? namesOf(voiding) : null;
  // The card counts the transfers that still stand. "None yet" follows the
  // history below, so it never sits above a list with rows in it.
  const countCaption =
    meta.total === 0
      ? range === "all"
        ? t("No transfer yet")
        : t("No transfers in this period")
      : totals.voided > 0
        ? plural(t, totals.voided, "{count} voided transfer isn't counted", "{count} voided transfers aren't counted", undefined, locale)
        : t("Only transfers that still stand are counted");

  return (
    <PageFrame className="gap-6">
      <PageHeader
        eyebrow={`${t("Money")} · ${t("Wallets")}`}
        title={t("Transfer")}
        description={t("Move money between your own wallets.")}
        actions={
          <>
            {pdfExportOn && meta.total > 0 && (
              <Button variant="secondary" onClick={print} disabled={preparing} aria-busy={preparing || undefined} className="print:hidden">
                {preparing ? <Loader size={16} label={t("Loading...")} /> : <Printer className="text-ink-2" />}
                {t("Print")}
              </Button>
            )}
            {canManage && (
              <Button onClick={() => setDrawerOpen(true)} className="print:hidden">
                <Plus strokeWidth={2.5} className="size-4" />
                {t("Move money")}
              </Button>
            )}
          </>
        }
      />

      {/* On paper the period switch is gone, so this line says what was printed. */}
      <p className="hidden text-small text-ink-2 print:block">
        {`${periodText(t, periodFrom, periodTo, locale)} · ${t("Printed {date}", { date: formatDate(today, undefined, locale) })}`}
        {paged && !printed && ` · ${t("Page {page} of {total}", { page: formatCount(meta.page, locale), total: formatCount(meta.totalPages, locale) })}`}
      </p>
      {printed && !printed.complete && (
        <p className="hidden text-small font-semibold text-ink print:block">
          {t("Only the latest {count} transfers are printed -- pick a shorter period to print them all.", { count: formatCount(printed.transfers.length, locale) })}
        </p>
      )}

      {!complete && (
        <Banner tone="warning" inline icon={<TriangleAlert />}>
          {t("Totals cover the latest 1,000 transfers only -- pick a shorter range for exact figures.")}
        </Banner>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="flex min-w-0 flex-col gap-2">
          <span className="text-small font-medium text-ink-muted">{t("Moved in this period")}</span>
          <AmountText value={totals.moved} currency={currency} size="h2" className="text-h1 wrap-anywhere" />
          <span className="text-caption font-normal text-ink-muted">
            {totals.savings > 0 ? t("Not counting {amount} put into savings goals", { amount: formatCurrency(totals.savings, currency) }) : t("Voided transfers aren't counted")}
          </span>
        </Card>
        <Card className="flex min-w-0 flex-col gap-2">
          <span className="text-small font-medium text-ink-muted">{t("Transfers")}</span>
          <span className="text-h1 text-ink tabular-nums">{formatCount(totals.standing, locale)}</span>
          <span className="text-caption font-normal text-ink-muted">{countCaption}</span>
        </Card>
        <div className="flex gap-4 rounded-lg border border-info/25 bg-info-soft p-5 md:col-span-2 xl:col-span-1">
          <IconTile tone="info">
            <Info />
          </IconTile>
          <div className="flex flex-col gap-1">
            <span className="text-body font-semibold text-info">{t("Your total balance doesn't change")}</span>
            <span className="text-small leading-relaxed text-info">{t("Moving money between your wallets never changes your total, and it's never income or expense. Money put into a savings goal moves to Savings Goals.")}</span>
          </div>
        </div>
      </section>

      <ListCard
        id="transfer-list"
        label={t("Transfer history")}
        title={t("Transfer history")}
        description={meta.total > 0 ? t("Newest first") : undefined}
        actions={<SegmentedControl options={PERIODS.map((period) => ({ value: period.value, label: t(period.label) }))} value={range} onChange={updateRange} label={t("Period")} className="print:hidden max-md:flex max-md:w-full max-md:[&>button]:flex-1 max-md:[&>button]:px-1.5" />}
        footer={
          meta.total > 0 && (
            <ListFooter className="print:hidden">
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                pageSize={meta.limit}
                hrefFor={(target) => pageHref(pathname, searchParams, target)}
                pageSizes={pageSizes}
                onPageSizeChange={setPageSize}
                focusTargetId="transfer-list"
              />
            </ListFooter>
          )
        }
      >
        {transfers.length === 0 ? (
          range === "all" ? (
            <ListEmpty
              tone="info"
              icon={<ArrowLeftRight />}
              title={t("No transfer yet")}
              description={t("Move money between your wallets and it shows up here.")}
              action={canManage && <Button onClick={() => setDrawerOpen(true)}>{t("Move money")}</Button>}
            />
          ) : (
            <ListEmpty
              tone="info"
              icon={<ArrowLeftRight />}
              title={t("No transfers in this period")}
              description={t("Try another period, or move money now.")}
              action={
                <>
                  <Button variant="secondary" onClick={() => updateRange("all")}>
                    {t("Show all time")}
                  </Button>
                  {canManage && <Button onClick={() => setDrawerOpen(true)}>{t("Move money")}</Button>}
                </>
              }
            />
          )
        ) : (
          <>
            <ListHead columns={COLUMNS}>
              <ListHeadCell>{t("Date")}</ListHeadCell>
              <ListHeadCell>{t("From → To")}</ListHeadCell>
              <ListHeadCell>{t("Note")}</ListHeadCell>
              <ListHeadCell align="end">{t("Amount")}</ListHeadCell>
              <ListHeadCell align="end" className="print:hidden">
                <span className="sr-only">{t("Actions")}</span>
              </ListHeadCell>
            </ListHead>
            {listed.map((transfer) => {
              const parties = namesOf(transfer);
              const cancelled = cancelledLabel(transfer);
              const voided = isCancelled(transfer);
              const savings = isSavingsTransfer(transfer);
              const amount = formatCurrency(transferAmount(transfer), currency);
              const href = transactionHref(transfer.id, here);
              return (
                // Phones: From → To and the amount, then the date and the
                // actions, then the note.
                <ListRow key={transfer.id} columns={COLUMNS} muted={voided} className={cn(voided && CANCELLED_ROW)}>
                  <ListCell className="text-caption text-ink-2 max-md:col-start-1 max-md:row-start-2 md:text-body">{formatDate(transfer.transactionDate, undefined, locale)}</ListCell>
                  <ListCell className="max-md:col-start-1 max-md:row-start-1">
                    <ListRowLink href={href} aria-label={t("{from} to {to}, {amount}", { from: parties.from, to: parties.to, amount })} className="flex min-w-0 items-center gap-3">
                      <Party name={parties.from} savings={parties.fromSavings} found={parties.fromId ? walletById.get(parties.fromId) : undefined} />
                      <ArrowRight className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
                      <Party name={parties.to} savings={parties.toSavings} found={parties.toId ? walletById.get(parties.toId) : undefined} />
                    </ListRowLink>
                  </ListCell>
                  <ListCell className="flex items-center gap-2 text-small text-ink-muted max-md:col-span-2 max-md:row-start-3 max-md:empty:hidden md:text-body">
                    {transfer.description ? <span className="truncate">{transfer.description}</span> : null}
                    {cancelled && (
                      <Chip tone="expense" size="sm" className="font-semibold">
                        {t(cancelled)}
                      </Chip>
                    )}
                    {savings && (
                      <Chip tone="habits" size="sm" className="font-semibold">
                        {t("Savings")}
                      </Chip>
                    )}
                  </ListCell>
                  <ListCell align="end" className={cn("font-semibold text-info tabular-nums max-md:col-start-2 max-md:row-start-1", voided && "line-through")}>
                    {amount}
                  </ListCell>
                  <ListRowActions className="max-md:col-start-2 max-md:row-start-2 print:hidden">
                    <Link href={href} aria-label={t("View details")} title={t("View details")} className={cn(ICON_BUTTON, "text-ink-2 hover:bg-surface-sunken")}>
                      <Eye className="size-4" aria-hidden="true" />
                    </Link>
                    {canManage && transfer.voidable && (
                      <button type="button" onClick={() => setVoiding(transfer)} aria-label={t("Void transfer")} title={t("Void transfer")} className={cn(ICON_BUTTON, "text-expense hover:bg-expense-soft")}>
                        <CircleOff className="size-4" aria-hidden="true" />
                      </button>
                    )}
                    {/* A goal's deposit is undone in Savings Goals, not voided here. */}
                    {canManage && savings && !voided && (
                      <Link href="/savings-goals/dashboard" aria-label={t("Kept by the savings goal. Open Savings Goals")} title={t("Kept by the savings goal")} className={cn(ICON_BUTTON, "text-pillar-habits hover:bg-pillar-habits-soft")}>
                        <PiggyBank className="size-4" aria-hidden="true" />
                      </Link>
                    )}
                  </ListRowActions>
                </ListRow>
              );
            })}
          </>
        )}
      </ListCard>

      <TransferDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} businessId={businessId} currency={currency} />
      {voiding && voidingParties && (
        <VoidTransactionDialog
          open
          onClose={() => setVoiding(null)}
          businessId={businessId}
          transactionId={voiding.id}
          title={t("Transfer")}
          heading={t("Void this transfer?")}
          description={t("Both wallets go back to their balances from before this transfer. It stays in your history, marked as voided.")}
          confirmLabel="Void transfer"
          doneLabel="Transfer voided"
          reasonHint="At least {count} characters. It's saved with the transfer."
          detail={
            <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-strip px-4 py-3 text-body">
              <span className="flex min-w-0 items-center gap-2 font-medium text-ink">
                <span className="truncate">{voidingParties.from}</span>
                <ArrowRight className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
                <span className="truncate">{voidingParties.to}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-px">
                <span className="font-bold text-info tabular-nums">{formatCurrency(transferAmount(voiding), currency)}</span>
                <span className="text-caption font-normal text-ink-muted">{formatDate(voiding.transactionDate, undefined, locale)}</span>
              </span>
            </div>
          }
        />
      )}
    </PageFrame>
  );
}

interface PartyProps {
  name: string;
  // The wallet and its place in the list, for its icon and colour.
  found?: { wallet: Account; index: number };
  // A savings wallet: the piggy bank, as Savings Goals draws them.
  savings: boolean;
}

// A wallet's small tile and name, as the rows show it.
function Party({ name, found, savings }: PartyProps) {
  const tile = savings ? "bg-pillar-habits-soft text-pillar-habits" : found ? walletPalette(found.index).tile : "bg-surface-sunken text-ink-2 dark:bg-surface-raised";
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md [&_svg]:size-3.5", tile)}>{createElement(savings ? PiggyBank : found ? walletIcon(found.wallet) : ArrowLeftRight, { "aria-hidden": true })}</span>
      <span className="truncate font-medium whitespace-nowrap text-ink">{name}</span>
    </span>
  );
}
