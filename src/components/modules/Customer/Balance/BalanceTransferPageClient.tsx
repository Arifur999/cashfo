"use client";

import { ArrowLeftRight, ArrowRight, Eye, Pencil, PiggyBank, Plus, Printer, Trash2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createElement, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { VoidTransactionDialog } from "@/components/modules/Customer/Transactions/VoidTransactionDialog";
import Loader from "@/components/shared/Loader";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import Chip from "@/components/smartly/Chip";
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
  // The wallet the history is narrowed to (?account=), or "" for all.
  accountId: string;
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

// The board's table: #, Date, From, To, Note, Amount, Charge, Balance,
// Action. Below xl the note goes under the wallets.
const COLUMNS = "md:grid-cols-[28px_92px_minmax(0,1fr)_minmax(0,1fr)_104px_72px_104px_76px] xl:grid-cols-[28px_92px_minmax(0,1fr)_minmax(0,1fr)_170px_104px_76px_112px_76px]";
const ICON_BUTTON = "flex size-8 items-center justify-center rounded-full pointer-coarse:size-11";
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
export function BalanceTransferPageClient({ businessId, transfers, meta, complete, wallets, currency, canManage, range, accountId, periodFrom, periodTo, excludeSavings, today, pageSizes, defaultPageSize }: BalanceTransferPageClientProps) {
  const { t, locale, fmt } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Admin > System > Feature Flags: pdf_export off hides Print.
  const pdfExportOn = useFeature("pdf_export");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [voiding, setVoiding] = useState<Transaction | null>(null);
  // A row's Edit: the popup filled in with it.
  const [editing, setEditing] = useState<Transaction | null>(null);
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
      // The same rows as the screen: its wallet filter, and each row's balance after.
      const result = await listTransfersForPrintAction(businessId, { dateFrom: periodFrom, dateTo: periodTo, excludeSavings, accountId: accountId || undefined });
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
  const editingParties = editing ? transferParties(editing, locale) : null;
  // Edit only while both wallets are active: an archived one can't be picked
  // in the popup, so the transfer would land on another wallet.
  const bothActive = (transfer: Transaction) => {
    const { fromId, toId } = transferParties(transfer, locale);
    return [fromId, toId].every((id) => !!id && walletById.get(id)?.wallet.status !== "ARCHIVED" && walletById.has(id));
  };
  // A dash for nothing, as the board's empty Charge cells read.
  const moneyOrDash = (value: string | null | undefined) => (value && Number(value) !== 0 ? formatCurrency(value, currency, fmt) : "—");

  return (
    <PageFrame className="gap-6">
      <PageHeader
        eyebrow={`${t("Money")} · ${t("Wallets")}`}
        title={t("Balance transfer")}
        actions={
          <>
            {pdfExportOn && meta.total > 0 && (
              <Button variant="secondary" onClick={print} disabled={preparing} aria-busy={preparing || undefined} className="print:hidden">
                {preparing ? <Loader size={16} label={t("Loading...")} /> : <Printer className="text-ink-2" />}
                {t("Print")}
              </Button>
            )}
            {canManage && (
              <Button onClick={() => setDrawerOpen(true)} className="rounded-full px-4.5 print:hidden">
                <Plus strokeWidth={2.5} className="size-4" />
                {t("New transfer")}
              </Button>
            )}
          </>
        }
      />

      {/* On paper the period switch is gone, so this line says what was printed. */}
      <p className="hidden text-small text-ink-2 print:block">
        {`${periodText(t, periodFrom, periodTo, fmt)} · ${t("Printed {date}", { date: formatDate(today, undefined, fmt) })}`}
        {paged && !printed && ` · ${t("Page {page} of {total}", { page: formatCount(meta.page, fmt), total: formatCount(meta.totalPages, fmt) })}`}
      </p>
      {printed && !printed.complete && (
        <p className="hidden text-small font-semibold text-ink print:block">
          {t("Only the latest {count} transfers are printed -- pick a shorter period to print them all.", { count: formatCount(printed.transfers.length, fmt) })}
        </p>
      )}

      {!complete && (
        <Banner tone="warning" inline icon={<TriangleAlert />}>
          {t("Totals cover the latest 1,000 transfers only -- pick a shorter range for exact figures.")}
        </Banner>
      )}

      <ListCard
        id="transfer-list"
        label={t("Transfer history")}
        title={t("Transfer history")}
        actions={
          <div className="flex flex-wrap items-center gap-2.5 print:hidden max-md:w-full">
            <NativeSelect size="sm" aria-label={t("Account")} value={accountId} onChange={(event) => router.push(hrefWith({ account: event.target.value || undefined }))} frameClassName="w-48 max-md:flex-1" className="h-10">
              <option value="">{t("All accounts")}</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {accountDisplayName(wallet, lang)}
                </option>
              ))}
            </NativeSelect>
            <SegmentedControl options={PERIODS.map((period) => ({ value: period.value, label: t(period.label) }))} value={range} onChange={updateRange} label={t("Period")} className="max-md:flex max-md:w-full max-md:[&>button]:flex-1 max-md:[&>button]:px-1.5" />
          </div>
        }
        footer={
          meta.total > 0 &&
          // One short page: the board's count and order (no pager, and no
          // page size worth choosing); otherwise the pager.
          (!paged && meta.total <= Math.min(...pageSizes) ? (
            <ListFooter className="flex-row items-center justify-between gap-3 py-3.5 print:hidden">
              <span>{plural(t, meta.total, "Showing {count} transfer", "Showing {count} transfers", undefined, fmt)}</span>
              <span>{t("Newest first")}</span>
            </ListFooter>
          ) : (
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
          ))
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
              <ListHeadCell>#</ListHeadCell>
              <ListHeadCell>{t("Date")}</ListHeadCell>
              <ListHeadCell>{t("From")}</ListHeadCell>
              <ListHeadCell>{t("To@@wallet")}</ListHeadCell>
              <ListHeadCell className="hidden xl:block">{t("Note")}</ListHeadCell>
              <ListHeadCell align="end">{t("Amount")}</ListHeadCell>
              <ListHeadCell align="end">{t("Charge")}</ListHeadCell>
              <ListHeadCell align="end">{t("Balance")}</ListHeadCell>
              <ListHeadCell align="end" className="print:hidden">
                {t("Action")}
              </ListHeadCell>
            </ListHead>
            {listed.map((transfer, index) => {
              const parties = namesOf(transfer);
              const cancelled = cancelledLabel(transfer);
              const voided = isCancelled(transfer);
              const savings = isSavingsTransfer(transfer);
              const amount = formatCurrency(transferAmount(transfer), currency, fmt);
              const href = transactionHref(transfer.id, here);
              return (
                // Phones: From → To and the amount, then the date and the
                // actions, then the note.
                <ListRow key={transfer.id} columns={COLUMNS} muted={voided} className={cn("md:min-h-15", voided && CANCELLED_ROW)}>
                  <ListCell className="text-small text-ink-muted tabular-nums max-md:hidden">{formatCount((printed ? 0 : (meta.page - 1) * meta.limit) + index + 1, fmt)}</ListCell>
                  <ListCell className="text-caption text-ink-soft max-md:col-start-1 max-md:row-start-2 md:text-small">{formatDate(transfer.transactionDate, undefined, fmt)}</ListCell>
                  <ListCell className="max-md:col-start-1 max-md:row-start-1">
                    <ListRowLink href={href} aria-label={t("{from} to {to}, {amount}", { from: parties.from, to: parties.to, amount })} className="flex min-w-0 items-center gap-2">
                      <Party name={parties.from} savings={parties.fromSavings} found={parties.fromId ? walletById.get(parties.fromId) : undefined} />
                      <ArrowRight className="size-4 shrink-0 text-ink-faint md:hidden" aria-hidden="true" />
                      <span className="contents md:hidden">
                        <Party name={parties.to} savings={parties.toSavings} found={parties.toId ? walletById.get(parties.toId) : undefined} />
                      </span>
                    </ListRowLink>
                  </ListCell>
                  <ListCell className="max-md:hidden">
                    <Party name={parties.to} savings={parties.toSavings} found={parties.toId ? walletById.get(parties.toId) : undefined} />
                  </ListCell>
                  <ListCell className="flex items-center gap-2 text-small text-ink-muted max-md:col-span-2 max-md:row-start-3 max-md:empty:hidden md:max-xl:hidden">
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
                  <ListCell align="end" className={cn("text-small tabular-nums max-md:hidden", transfer.charge && Number(transfer.charge) !== 0 ? "text-expense" : "text-ink-faint")}>
                    {moneyOrDash(transfer.charge)}
                  </ListCell>
                  {/* The receiving wallet's balance just after; a voided row moved nothing. */}
                  <ListCell align="end" className="text-small font-semibold text-ink-2 tabular-nums max-md:hidden">
                    {voided || !transfer.balanceAfter ? <span className="font-normal text-ink-faint">—</span> : formatCurrency(transfer.balanceAfter, currency, fmt)}
                  </ListCell>
                  <ListRowActions className="max-md:col-start-2 max-md:row-start-2 print:hidden">
                    {canManage && transfer.voidable && !savings && bothActive(transfer) ? (
                      <button type="button" onClick={() => setEditing(transfer)} aria-label={t("Edit transfer")} title={t("Edit")} className={cn(ICON_BUTTON, "text-ink-2 hover:bg-surface-sunken")}>
                        <Pencil className="size-4" aria-hidden="true" />
                      </button>
                    ) : (
                      <Link href={href} aria-label={t("View details")} title={t("View details")} className={cn(ICON_BUTTON, "text-ink-soft hover:bg-surface-sunken")}>
                        <Eye className="size-4" aria-hidden="true" />
                      </Link>
                    )}
                    {canManage && transfer.voidable && (
                      <button type="button" onClick={() => setVoiding(transfer)} aria-label={t("Delete transfer")} title={t("Delete transfer")} className={cn(ICON_BUTTON, "text-expense hover:bg-expense-soft")}>
                        <Trash2 className="size-4" aria-hidden="true" />
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
      {editing && editingParties?.fromId && editingParties.toId && (
        <TransferDrawer
          open
          onClose={() => setEditing(null)}
          businessId={businessId}
          currency={currency}
          editing={{
            id: editing.id,
            fromId: editingParties.fromId,
            toId: editingParties.toId,
            amount: transferAmount(editing),
            date: editing.transactionDate.slice(0, 10),
            note: editing.description ?? "",
            charge: Number(editing.charge ?? 0),
            chargeCategory: editing.chargeCategory ?? null,
          }}
        />
      )}
      {voiding && voidingParties && (
        <VoidTransactionDialog
          open
          onClose={() => setVoiding(null)}
          businessId={businessId}
          transactionId={voiding.id}
          title={t("Balance transfer")}
          heading={t("Delete this transfer?")}
          description={t("Both wallets go back to their balances from before this transfer, and it leaves the list. A record of it stays in the ledger, marked as voided.")}
          confirmLabel="Delete transfer"
          doneLabel="Transfer deleted"
          reasonHint="At least {count} characters. It's saved with the transfer."
          detail={
            <div className="flex items-center justify-between gap-3 rounded-[14px] border border-line bg-strip px-3.5 py-3 text-body">
              <span className="flex min-w-0 items-center gap-2 font-medium text-ink">
                <span className="truncate">{voidingParties.from}</span>
                <ArrowRight className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
                <span className="truncate">{voidingParties.to}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-px">
                <span className="font-bold text-info tabular-nums">{formatCurrency(transferAmount(voiding), currency, fmt)}</span>
                <span className="text-caption font-normal text-ink-muted">{formatDate(voiding.transactionDate, undefined, fmt)}</span>
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
      <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-sm [&_svg]:size-3.5", tile)}>{createElement(savings ? PiggyBank : found ? walletIcon(found.wallet) : ArrowLeftRight, { "aria-hidden": true })}</span>
      <span className="truncate font-medium whitespace-nowrap text-ink">{name}</span>
    </span>
  );
}
