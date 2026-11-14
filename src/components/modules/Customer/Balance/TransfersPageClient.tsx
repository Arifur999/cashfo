"use client";

import { ArrowLeftRight, Pencil, Plus, Printer, Search, Trash2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createElement, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useOnline } from "@/components/modules/Customer/Layout/useOnline";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { ListCard, ListCell, ListFooter, ListHead, ListHeadCell, ListRow, ListRowActions } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import Pagination from "@/components/smartly/Pagination";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account, ActiveMonth, Transaction, TransactionListResponse } from "@/lib/customer/api";
import { periodHref, type PickedPeriod } from "@/lib/customer/period";
import { accountColor, maskedMoney, walletColorStyle } from "@/lib/customer/balanceDisplay";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { periodText } from "@/lib/customer/ledger";
import { createTransferAction } from "@/lib/customer/quickEntryActions";
import { voidTransactionAction } from "@/lib/customer/transactionActions";
import { listTransfersForPrintAction } from "@/lib/customer/transferActions";
import { transferAmount, transferParties } from "@/lib/customer/transfers";
import { walletIcon } from "@/lib/customer/walletVisuals";
import { formatCount } from "@/lib/i18n/digits";
import IconAction from "@/components/smartly/IconAction";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PeriodPicker, periodLabel as periodName } from "../Shared/PeriodPicker";
import { plural } from "@/lib/i18n/message";
import { pageHref } from "@/lib/table/pageParams";
import { cn } from "@/lib/utils";
import { HideBalancesButton } from "./HideBalancesButton";
import { PrintPreview } from "./PrintPreview";
import { TransferDeleteDialog, type DeletedTransfer } from "./TransferDeleteDialog";
import { TransferDialog, type EditedTransfer } from "./TransferDialog";
import { type StatementTransfer, TransferStatement } from "./TransferStatement";
import { useBalancesHidden } from "./useBalancesHidden";

const ALL_TIME: PickedPeriod = { kind: "all" };

interface TransfersPageClientProps {
  businessId: string;
  // This page of the history, newest first: wallet to wallet, standing ones.
  transfers: Transaction[];
  meta: TransactionListResponse["meta"];
  // Over every page the filters match.
  totals: { moved: number; charges: number; count: number };
  // Every money account (archived too), for names, colours and icons.
  wallets: Account[];
  currency: string;
  canManage: boolean;
  period: PickedPeriod;
  // The months with transfers; null when the API can't say.
  activeMonths: ActiveMonth[] | null;
  accountId: string;
  search: string;
  periodFrom?: string;
  periodTo?: string;
  today: string;
  pageSizes: number[];
  defaultPageSize: number;
  // Accounts' "Transfer from here": New transfer opens from that account.
  openNew: boolean;
  fromId: string | null;
}

// #, Date, From, To, Note, Amount, Charge, Action; phones scroll sideways.
const COLUMNS = "grid-cols-[24px_92px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.25fr)_104px_84px_68px] min-w-235";
const SEARCH_DELAY = 350;

// Transfers (board: Balance — Transfers): what moved between the
// workspace's own accounts, what it cost in charges and how many, and the
// history -- each transfer with both accounts' balances after it, its note
// and charge, Edit and Delete.
export function TransfersPageClient(props: TransfersPageClientProps) {
  const { businessId, transfers, meta, totals, wallets, currency, canManage, period, activeMonths, accountId, search, periodFrom, periodTo, today, pageSizes, defaultPageSize, openNew, fromId } = props;
  const { t, locale, fmt } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const online = useOnline();
  const pdfExportOn = useFeature("pdf_export");
  const { hidden, toggle } = useBalancesHidden();
  const [creating, setCreating] = useState(false);
  const [presetFrom, setPresetFrom] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditedTransfer | null>(null);
  const [deleting, setDeleting] = useState<(DeletedTransfer & { fromId: string; toId: string; chargeCategory: string | null }) | null>(null);
  const [printing, setPrinting] = useState<{ transfers: Transaction[]; complete: boolean } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [query, setQuery] = useState(search);
  const [isPending, startTransition] = useTransition();

  // ?new=1 (Accounts' "Transfer from here", Home) opens New transfer.
  const [prevOpenNew, setPrevOpenNew] = useState(false);
  if (openNew !== prevOpenNew) {
    setPrevOpenNew(openNew);
    if (openNew) {
      setCreating(true);
      setPresetFrom(fromId);
    }
  }
  // Then the URL forgets it, so Back or a refresh doesn't open it again.
  useEffect(() => {
    if (!searchParams.has("new") && !searchParams.has("from")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    params.delete("from");
    const rest = params.toString();
    window.history.replaceState(null, "", rest ? `${pathname}?${rest}` : pathname);
  }, [pathname, searchParams]);

  function hrefWith(next: Record<string, string | undefined | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    // Other filters start at the first page.
    params.delete("page");
    params.delete("new");
    params.delete("from");
    const rest = params.toString();
    return rest ? `${pathname}?${rest}` : pathname;
  }

  // Typing searches once it settles; the URL keeps the search.
  useEffect(() => {
    const next = query.trim();
    if (next === search) return;
    const timer = window.setTimeout(() => router.replace(hrefWith({ q: next || undefined }), { scroll: false }), SEARCH_DELAY);
    return () => window.clearTimeout(timer);
    // hrefWith reads the current URL each time; search is the URL's own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
  // A search from the URL (Back, a link) shows in the box.
  const [prevSearch, setPrevSearch] = useState(search);
  if (search !== prevSearch) {
    setPrevSearch(search);
    setQuery(search);
  }

  const lang = displayLanguage(locale);
  const walletById = new Map(wallets.map((wallet) => [wallet.id, wallet]));
  const symbol = currencySymbol(currency, fmt);
  const money = (value: number | string) => (hidden ? maskedMoney(symbol) : formatCurrency(value, currency, fmt));
  const periodLabel = periodName(period, t, fmt);
  const accountName = accountId ? (walletById.get(accountId) ? accountDisplayName(walletById.get(accountId)!, lang) : t("Removed account")) : t("All accounts");
  const paged = meta.totalPages > 1;

  const namesOf = (transfer: Transaction) => {
    const parties = transferParties(transfer, locale);
    const name = (id: string | null, fallback: string) => {
      const found = id ? walletById.get(id) : undefined;
      return found ? accountDisplayName(found, lang) : fallback;
    };
    return { ...parties, from: name(parties.fromId, parties.from), to: name(parties.toId, parties.to) };
  };
  // Edit only while both accounts are active: an archived one can't be picked.
  const bothActive = (fromWallet: string | null, toWallet: string | null) => [fromWallet, toWallet].every((id) => !!id && walletById.has(id) && walletById.get(id)?.status !== "ARCHIVED");

  function startEdit(transfer: Transaction) {
    const parties = transferParties(transfer, locale);
    if (!parties.fromId || !parties.toId) return;
    setEditing({
      id: transfer.id,
      fromId: parties.fromId,
      toId: parties.toId,
      amount: transferAmount(transfer),
      date: transfer.transactionDate.slice(0, 10),
      note: transfer.description ?? "",
      charge: Number(transfer.charge ?? 0),
      chargeCategory: transfer.chargeCategory ?? null,
    });
  }

  function confirmDelete() {
    if (!deleting || isPending || !online) return;
    const gone = deleting;
    startTransition(async () => {
      try {
        const result = await voidTransactionAction(businessId, gone.id, "Deleted from Transfers");
        if (!result.success) {
          toast.error(t(result.message ?? "Couldn't delete the transfer."));
          return;
        }
        setDeleting(null);
        router.refresh();
        // Undo posts it again, as it was.
        toast.success(t("Transfer deleted. {from} and {to} are back to their earlier balances.", { from: gone.from, to: gone.to }), {
          action: {
            label: t("Undo"),
            onClick: async () => {
              const again = await createTransferAction(businessId, {
                fromAccountId: gone.fromId,
                toAccountId: gone.toId,
                amount: gone.amount,
                date: gone.date,
                description: gone.note || undefined,
                ...(gone.charge > 0 && { charge: gone.charge, ...(gone.chargeCategory && { chargeCategory: gone.chargeCategory }) }),
              }).catch(() => null);
              if (again?.success) {
                toast.success(t("Transfer restored"));
                router.refresh();
              } else toast.error(t(again?.message ?? "Couldn't restore the transfer."));
            },
          },
        });
      } catch {
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  // The whole list goes on paper: one page as it stands, more loaded first.
  async function openPrint() {
    if (!paged) {
      setPrinting({ transfers, complete: true });
      return;
    }
    setPreparing(true);
    try {
      const result = await listTransfersForPrintAction(businessId, { dateFrom: periodFrom, dateTo: periodTo, accountId: accountId || undefined, search: search || undefined });
      if (!result.success || !result.data) toast.error(t("Couldn't load the transfers to print"));
      else setPrinting(result.data);
    } catch {
      toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
    } finally {
      setPreparing(false);
    }
  }

  const statementRows: StatementTransfer[] = (printing?.transfers ?? []).map((transfer) => {
    const parties = namesOf(transfer);
    return {
      id: transfer.id,
      date: transfer.transactionDate,
      from: parties.from,
      to: parties.to,
      note: transfer.description ?? "",
      amount: transferAmount(transfer),
      charge: Number(transfer.charge ?? 0),
      chargeCategory: transfer.chargeCategory ?? null,
      cancelled: null,
    };
  });

  // The statement's days: the period's, or for all time the first and last
  // transfer's (the board), or that there are none yet.
  const statementDays = statementRows.map((row) => row.date).sort();
  const statementRange =
    periodFrom || periodTo ? periodText(t, periodFrom, periodTo, fmt) : statementDays.length ? periodText(t, statementDays[0], statementDays[statementDays.length - 1], fmt) : t("No transfers yet");

  // Nothing to list: what was searched, or the account and period.
  const allTime = period.kind === "all";
  const emptyText = search
    ? t('No transfer matches "{query}".', { query: search })
    : accountId
      ? allTime
        ? t("No transfers for {account} in all time.", { account: accountName })
        : t("No transfers for {account} in {period}.", { account: accountName, period: periodLabel })
      : allTime
        ? t("No transfers in all time.")
        : t("No transfers in {period}.", { period: periodLabel });

  const party = (id: string | null, name: string, after: string | null | undefined) => {
    const wallet = id ? walletById.get(id) : undefined;
    return (
      <span className="flex min-w-0 items-center gap-2" style={wallet ? walletColorStyle(accountColor(wallet)) : undefined}>
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg [&_svg]:size-3.5", wallet ? "wallet-tile" : "bg-surface-sunken text-ink-muted")}>
          {createElement(wallet ? walletIcon(wallet) : ArrowLeftRight, { "aria-hidden": true })}
        </span>
        <span className="flex min-w-0 flex-col gap-px">
          <span className="truncate font-medium text-ink">{name}</span>
          {after && <span className="text-caption whitespace-nowrap text-ink-faint tabular-nums">{t("After: {amount}", { amount: money(after) })}</span>}
        </span>
      </span>
    );
  };

  return (
    <PageFrame className="gap-5 leading-[normal]">
      {printing && (
        <PrintPreview subtitle={`A4 · ${accountName} · ${periodLabel}`} onClose={() => setPrinting(null)} overlayClassName="gap-3 bg-print-bar/55 pt-4 pb-4" articleClassName="sm:px-10 sm:py-9">
          <TransferStatement
            transfers={statementRows}
            account={accountName}
            periodLabel={periodLabel}
            range={statementRange}
            moved={totals.moved}
            charges={totals.charges}
            standing={totals.count}
            capped={!printing.complete}
            today={today}
            currency={currency}
          />
        </PrintPreview>
      )}
      <div className="contents print:hidden">
        <PageHeader
          className="md:items-center"
          title={t("Transfers")}
          actions={
            <>
              <HideBalancesButton hidden={hidden} onToggle={toggle} className="size-10" />
              {pdfExportOn && (
                <Button variant="secondary" onClick={openPrint} disabled={preparing} aria-busy={preparing || undefined} className="px-3.5">
                  {preparing ? <Loader size={16} label={t("Loading...")} /> : <Printer className="text-ink-soft" />}
                  {t("Print")}
                </Button>
              )}
              {canManage && (
                <Button onClick={() => setCreating(true)} className="gap-1.5 rounded-full px-4">
                  <Plus strokeWidth={2.5} className="size-4" />
                  {t("New transfer")}
                </Button>
              )}
            </>
          }
        />

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
            <Figure label={t("Money moved")} value={money(totals.moved)} tone="text-info" />
            <Figure label={t("Charges paid")} value={totals.charges > 0 ? (hidden ? maskedMoney(symbol) : `− ${formatCurrency(totals.charges, currency, fmt)}`) : formatCurrency(0, currency, fmt)} tone={totals.charges > 0 ? "text-expense" : "text-ink"} />
            <Figure label={t("Transfers")} value={formatCount(totals.count, fmt)} tone="text-ink" />
          </div>
          <span className="text-[12.5px] text-ink-muted">{`${accountName} · ${periodLabel}`}</span>
        </div>

        <ListCard
          id="transfer-list"
          label={t("Transfer history")}
          scrollable
          tableClassName="overflow-x-auto"
          header={
            <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 md:flex-nowrap md:gap-4 md:px-6">
              <h2 className="text-body-lg font-semibold whitespace-nowrap text-ink">{t("Transfer history")}</h2>
              <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-input bg-surface pr-1.5 pl-3 focus-within:border-focus-ring focus-within:focus-halo md:flex-auto md:max-w-85">
                <Search className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                <span className="sr-only">{t("Search note, account or amount")}</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === "Escape" && setQuery("")}
                  maxLength={80}
                  placeholder={t("Search note, account or amount")}
                  className="h-9 min-w-0 flex-1 bg-transparent px-0.5 text-[13.5px] text-ink outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} aria-label={t("Clear search")} title={t("Clear search")} className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-2">
                    <X className="size-3.25" strokeWidth={2.5} aria-hidden="true" />
                  </button>
                )}
              </label>
              <span className="hidden flex-1 md:block" />
              <div className="flex flex-wrap items-center gap-3">
                <NativeSelect size="sm" aria-label={t("Account")} value={accountId} onChange={(event) => router.push(hrefWith({ account: event.target.value || undefined }))} frameClassName="h-10 min-w-42.5 rounded-full [&>svg]:right-3.5" className="h-10 rounded-full pr-8.5 pl-3.5 text-[13.5px]">
                  <option value="">{t("All accounts")}</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.status === "ARCHIVED" ? t("{name} (archived)", { name: accountDisplayName(wallet, lang) }) : accountDisplayName(wallet, lang)}
                    </option>
                  ))}
                </NativeSelect>
                <PeriodPicker
                  period={period}
                  today={today}
                  activeMonths={activeMonths}
                  allowAll
                  defaultPeriod={ALL_TIME}
                  onPick={(next) => router.push(periodHref(pathname, Object.fromEntries(searchParams.entries()), next))}
                />
              </div>
            </div>
          }
          footer={
            !paged && meta.total <= Math.min(...pageSizes) ? (
              <ListFooter className="flex-row items-center justify-between gap-3 py-3.5">
                <span>{plural(t, meta.total, "Showing {count} transfer", "Showing {count} transfers", undefined, fmt)}</span>
                <span>{t("Newest first")}</span>
              </ListFooter>
            ) : (
              <ListFooter>
                <Pagination
                  page={meta.page}
                  totalPages={meta.totalPages}
                  total={meta.total}
                  pageSize={meta.limit}
                  hrefFor={(target) => pageHref(pathname, searchParams, target)}
                  pageSizes={pageSizes}
                  onPageSizeChange={(size) => router.push(hrefWith({ limit: size === defaultPageSize ? undefined : String(size) }), { scroll: false })}
                  focusTargetId="transfer-list"
                />
              </ListFooter>
            )
          }
        >
          <>
              <ListHead showOnPhone columns={COLUMNS} className="h-9.25 border-t">
                <ListHeadCell>#</ListHeadCell>
                <ListHeadCell>{t("Date")}</ListHeadCell>
                <ListHeadCell>{t("From")}</ListHeadCell>
                <ListHeadCell>{t("To@@wallet")}</ListHeadCell>
                <ListHeadCell>{t("Note")}</ListHeadCell>
                <ListHeadCell align="end">{t("Amount")}</ListHeadCell>
                <ListHeadCell align="end">{t("Charge")}</ListHeadCell>
                <ListHeadCell align="end">{t("Action")}</ListHeadCell>
              </ListHead>
              {transfers.map((transfer, index) => {
                const parties = namesOf(transfer);
                const charge = Number(transfer.charge ?? 0);
                const editable = canManage && transfer.voidable && bothActive(parties.fromId, parties.toId);
                return (
                  <ListRow key={transfer.id} columns={COLUMNS} className="md:min-h-16">
                    <ListCell className="text-small text-ink-muted tabular-nums">{formatCount((meta.page - 1) * meta.limit + index + 1, fmt)}</ListCell>
                    <ListCell className="text-small text-ink-2">{formatDate(transfer.transactionDate, undefined, fmt)}</ListCell>
                    <ListCell>{party(parties.fromId, parties.from, transfer.fromBalanceAfter)}</ListCell>
                    <ListCell>{party(parties.toId, parties.to, transfer.toBalanceAfter ?? transfer.balanceAfter)}</ListCell>
                    <ListCell className="flex flex-col gap-px" title={transfer.description ?? undefined}>
                      <span className="line-clamp-2 leading-[1.35] text-ink-2">{transfer.description ? t(transfer.description) : "—"}</span>
                      {charge > 0 && <span className="truncate text-caption text-ink-faint">{t("Charge saved as {category}", { category: t(transfer.chargeCategory ?? "Bank charge") })}</span>}
                    </ListCell>
                    <ListCell align="end" className="font-semibold whitespace-nowrap text-info tabular-nums">
                      {money(transferAmount(transfer))}
                    </ListCell>
                    <ListCell align="end" className={cn("whitespace-nowrap tabular-nums", charge > 0 ? "text-expense" : "text-ink-faint")}>
                      {charge > 0 ? (hidden ? maskedMoney(symbol) : `− ${formatCurrency(charge, currency, fmt)}`) : "—"}
                    </ListCell>
                    <ListRowActions>
                      {editable && (
                        <IconAction onClick={() => startEdit(transfer)} aria-label={t("Edit transfer")} title={t("Edit")}>
                          <Pencil aria-hidden="true" />
                        </IconAction>
                      )}
                      {canManage && transfer.voidable && parties.fromId && parties.toId && (
                        <IconAction
                          tone="danger"
                          onClick={() =>
                            setDeleting({
                              id: transfer.id,
                              date: transfer.transactionDate.slice(0, 10),
                              from: parties.from,
                              to: parties.to,
                              fromId: parties.fromId!,
                              toId: parties.toId!,
                              amount: transferAmount(transfer),
                              charge,
                              chargeCategory: transfer.chargeCategory ?? null,
                              note: transfer.description,
                            })
                          }
                          disabled={!online}
                          aria-label={t("Delete transfer")}
                          title={t("Delete")}
                        >
                          <Trash2 aria-hidden="true" />
                        </IconAction>
                      )}
                    </ListRowActions>
                  </ListRow>
                );
              })}
              {transfers.length === 0 && <p className="border-b border-divider px-6 py-7 text-center text-body text-ink-muted">{emptyText}</p>}
          </>
        </ListCard>
      </div>

      <TransferDialog
        open={creating}
        onClose={() => {
          setCreating(false);
          setPresetFrom(null);
        }}
        businessId={businessId}
        currency={currency}
        fromId={presetFrom}
      />
      {editing && <TransferDialog open onClose={() => setEditing(null)} businessId={businessId} currency={currency} editing={editing} />}
      <TransferDeleteDialog transfer={deleting} currency={currency} busy={isPending} onClose={() => setDeleting(null)} onConfirm={confirmDelete} />
    </PageFrame>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card padding="none" className="flex min-w-0 flex-col gap-1 rounded-[14px] px-4.5 py-3.5 shadow-xs">
      <span className="text-[12.5px] font-medium text-ink-muted">{label}</span>
      <span className={cn("text-[22px] font-bold tracking-[-0.02em] tabular-nums wrap-anywhere", tone)}>{value}</span>
    </Card>
  );
}
