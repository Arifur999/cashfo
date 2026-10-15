"use client";

import { ArrowLeftRight, ArrowRight, CircleOff, Eye, Info, Plus, Printer, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createElement, useState } from "react";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { TransactionDrawer } from "@/components/modules/Customer/QuickEntry/TransactionDrawer";
import { VoidTransactionDialog } from "@/components/modules/Customer/Transactions/VoidTransactionDialog";
import AmountText from "@/components/smartly/AmountText";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import EmptyState from "@/components/smartly/EmptyState";
import IconTile from "@/components/smartly/IconTile";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { Account, Transaction } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import type { DateRangePreset } from "@/lib/customer/dateRangePresets";
import { cancelledLabel, isCancelled } from "@/lib/customer/transactionDisplay";
import { transferAmount, transferParties, transferTotals } from "@/lib/customer/transfers";
import { walletIcon, walletPalette } from "@/lib/customer/walletVisuals";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface BalanceTransferPageClientProps {
  businessId: string;
  transfers: Transaction[];
  // false when there were more than the page reads (see getAllTransactions).
  complete: boolean;
  // Every wallet, for the icons and colours on the rows.
  wallets: Account[];
  currency: string;
  canManage: boolean;
  range: DateRangePreset;
}

const PERIODS: { value: DateRangePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-year", label: "This year" },
];

const GRID = "md:grid-cols-[96px_minmax(0,1fr)_240px_120px_76px]";

// Transfer: money moved between the customer's own wallets -- what moved
// in the period, the note that it is never income or expense, and the
// history with a void action on each standing transfer.
export function BalanceTransferPageClient({ businessId, transfers, complete, wallets, currency, canManage, range }: BalanceTransferPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Admin > System > Feature Flags: pdf_export off hides Print.
  const pdfExportOn = useFeature("pdf_export");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [voiding, setVoiding] = useState<Transaction | null>(null);

  const totals = transferTotals(transfers);
  const walletById = new Map(wallets.map((wallet, index) => [wallet.id, { wallet, index }]));

  function updateRange(next: DateRangePreset) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("range");
    else params.set("range", next);
    router.push(`/balance/transfer?${params.toString()}`);
  }

  // A wallet's small tile and name, as the rows and the void dialog show it.
  function Party({ id, name }: { id: string | null; name: string }) {
    const found = id ? walletById.get(id) : undefined;
    return (
      <span className="flex min-w-0 items-center gap-2">
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md [&_svg]:size-3.5", found ? walletPalette(found.index).tile : "bg-surface-sunken text-ink-2")}>{createElement(found ? walletIcon(found.wallet) : ArrowLeftRight, { "aria-hidden": true })}</span>
        <span className="truncate font-medium whitespace-nowrap text-ink">{name}</span>
      </span>
    );
  }

  const voidingParties = voiding ? transferParties(voiding) : null;

  return (
    <PageFrame className="gap-6">
      <PageHeader
        eyebrow={`${t("Money")} · ${t("Wallets")}`}
        title={t("Transfer")}
        description={t("Move money between your own wallets.")}
        actions={
          <>
            {pdfExportOn && transfers.length > 0 && (
              <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
                <Printer className="text-ink-2" />
                {t("Print")}
              </Button>
            )}
            {canManage && (
              <Button onClick={() => setDrawerOpen(true)}>
                <Plus strokeWidth={2.5} className="size-4" />
                {t("New transfer")}
              </Button>
            )}
          </>
        }
      />

      {!complete && (
        <Banner tone="warning" inline icon={<TriangleAlert />}>
          {t("Showing and totalling the latest 1,000 only -- pick a shorter range to see the rest.")}
        </Banner>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="flex flex-col gap-2">
          <span className="text-small font-medium text-ink-muted">{t("Moved in this period")}</span>
          <AmountText value={totals.moved} currency={currency} size="h2" className="text-h1" />
          <span className="text-caption font-normal text-ink-muted">
            {t("Across")} {totals.count} {t("transfers")}
          </span>
        </Card>
        <Card className="flex flex-col gap-2">
          <span className="text-small font-medium text-ink-muted">{t("Transfers")}</span>
          <span className="text-h1 text-ink tabular-nums">{totals.count}</span>
          <span className="text-caption font-normal text-ink-muted">{totals.voided > 0 ? `${totals.voided} ${t(totals.voided === 1 ? "voided transfer isn't counted" : "voided transfers aren't counted")}` : t("Only transfers that still stand are counted")}</span>
        </Card>
        <div className="flex gap-4 rounded-lg border border-info/25 bg-info-soft p-5">
          <IconTile tone="info">
            <Info />
          </IconTile>
          <div className="flex flex-col gap-1">
            <span className="text-body font-semibold text-info">{t("Your total balance doesn't change")}</span>
            <span className="text-small leading-relaxed text-info">{t("A transfer only moves money between your wallets. It's never counted as income or expense.")}</span>
          </div>
        </div>
      </section>

      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <h2 className="text-title text-ink">{t("Transfer history")}</h2>
          <SegmentedControl options={PERIODS.map((period) => ({ value: period.value, label: t(period.label) }))} value={range} onChange={updateRange} label={t("Period")} className="print:hidden" />
        </div>
        {transfers.length === 0 ? (
          <EmptyState
            bordered={false}
            tone="info"
            icon={<ArrowLeftRight />}
            title={t("No transfer yet")}
            description={t("Move money between your wallets and it shows up here.")}
            action={canManage && <Button onClick={() => setDrawerOpen(true)}>{t("New transfer")}</Button>}
            className="border-t border-line"
          />
        ) : (
          <>
            <div className={cn("hidden items-center gap-x-4 border-y border-line bg-cream px-6 py-3 text-caption text-ink-muted md:grid", GRID)}>
              <span>{t("Date")}</span>
              <span>{t("From → To")}</span>
              <span>{t("Note")}</span>
              <span className="text-right">{t("Amount")}</span>
              <span className="text-right print:hidden">{t("Actions")}</span>
            </div>
            {transfers.map((transfer) => {
              const { from, fromId, to, toId } = transferParties(transfer);
              const cancelled = cancelledLabel(transfer);
              const voided = isCancelled(transfer);
              return (
                <div key={transfer.id} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-surface-sunken px-4 py-3 text-body md:h-15 md:px-6 md:py-0", GRID, voided && "opacity-60")}>
                  <span className="order-3 text-caption text-ink-2 md:order-none md:text-body">{formatDate(transfer.transactionDate)}</span>
                  <Link href={`/transactions/${transfer.id}`} className="flex min-w-0 items-center gap-3">
                    <Party id={fromId} name={from} />
                    <ArrowRight className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
                    <Party id={toId} name={to} />
                  </Link>
                  <span className="order-4 col-span-2 flex min-w-0 items-center gap-2 text-small text-ink-muted md:order-none md:col-span-1 md:text-body">
                    <span className="truncate">{transfer.description}</span>
                    {cancelled && (
                      <Chip tone="expense" size="sm" className="font-semibold">
                        {t(cancelled)}
                      </Chip>
                    )}
                  </span>
                  <span className={cn("row-start-1 text-right font-semibold text-info tabular-nums md:row-start-auto", voided && "line-through")}>{formatCurrency(transferAmount(transfer), currency)}</span>
                  <span className="hidden justify-end gap-1 md:flex print:hidden">
                    <Link href={`/transactions/${transfer.id}`} aria-label={t("View details")} title={t("View details")} className="flex size-8 items-center justify-center rounded-md text-ink-2 hover:bg-cream">
                      <Eye className="size-4" aria-hidden="true" />
                    </Link>
                    {canManage && transfer.voidable && (
                      <button type="button" onClick={() => setVoiding(transfer)} aria-label={t("Void transfer")} title={t("Void transfer")} className="flex size-8 items-center justify-center rounded-md text-expense hover:bg-expense-soft">
                        <CircleOff className="size-4" aria-hidden="true" />
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
            <div className="flex items-center justify-between px-6 py-4 text-small text-ink-muted">
              <span>
                {t("Showing")} {transfers.length} {t("transfers")}
              </span>
              <span>{t("Newest first")}</span>
            </div>
          </>
        )}
      </Card>

      <TransactionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} businessId={businessId} currency={currency} initialKind="TRANSFER" />
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
          detail={
            <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-cream px-4 py-3 text-body">
              <span className="flex min-w-0 items-center gap-2 font-medium text-ink">
                <span className="truncate">{voidingParties.from}</span>
                <ArrowRight className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
                <span className="truncate">{voidingParties.to}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-px">
                <span className="font-bold text-info tabular-nums">{formatCurrency(transferAmount(voiding), currency)}</span>
                <span className="text-caption font-normal text-ink-muted">{formatDate(voiding.transactionDate)}</span>
              </span>
            </div>
          }
        />
      )}
    </PageFrame>
  );
}
