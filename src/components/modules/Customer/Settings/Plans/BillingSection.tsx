"use client";

import { Crown, Download, Gift, Layers, Pencil, Receipt } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import IconAction from "@/components/smartly/IconAction";
import { getBillingPaymentsAction } from "@/lib/customer/billingActions";
import { billingHistoryCsv, phoneShown, type BillingDetails } from "@/lib/customer/billingDetails";
import { daysLeft, gatewayLabel, planState, type BillingOverview, type BillingPayment, type BillingPayments, type PaymentStatus } from "@/lib/customer/billingDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { saveFile } from "../Data/dataFiles";
import { BillingDetailsDialog } from "./BillingDetailsDialog";
import { checkoutHref } from "./checkoutRoute";

const CARD = "overflow-hidden rounded-[18px] border border-line-card bg-surface shadow-card";
const PAGE = 10;
// Download CSV reads every page at the API's largest page size.
const CSV_PAGE = 50;

const STATUS_LOOK: Record<PaymentStatus, { label: string; className: string }> = {
  SUCCESS: { label: "Paid", className: "bg-income-soft text-income" },
  PENDING: { label: "Being checked", className: "bg-warning-soft text-warning" },
  REFUNDED: { label: "Refunded", className: "bg-warning-soft text-warning" },
  FAILED: { label: "Failed", className: "bg-expense-soft text-expense" },
};

interface BillingSectionProps {
  overview: BillingOverview;
  payments: BillingPayments | null;
  readOnly: boolean;
  busy: boolean;
  // Scrolls up to the plan cards.
  onSeePlans: () => void;
  onCancel: () => void;
  onResume: () => void;
  onDetailsSaved: (details: BillingDetails) => void;
}

// The UpgradePlan board's Billing: the payments with their receipts, the
// plan the customer is on, and the details printed on receipts. Nothing
// renews by itself here (each period is paid by hand), so the board's
// Auto-renew switch is not shown.
export function BillingSection({ overview, payments, readOnly, busy, onSeePlans, onCancel, onResume, onDetailsSaved }: BillingSectionProps) {
  const { t } = useLocale();
  return (
    <>
      <div id="billing" className="flex scroll-mt-3 flex-col gap-1 pt-2.5">
        <h2 className="text-[20px] leading-[1.3] font-semibold tracking-[-0.01em] text-ink">{t("Billing")}</h2>
        <p className="text-[13.5px] text-ink-muted">{t("Your payments, receipts and the details printed on them.")}</p>
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <HistoryCard overview={overview} initial={payments} onSeePlans={onSeePlans} />
        <div className="flex min-w-0 flex-col gap-4">
          <CurrentPlanCard overview={overview} payments={payments} readOnly={readOnly} busy={busy} onSeePlans={onSeePlans} onCancel={onCancel} onResume={onResume} />
          {overview.billingDetails && <DetailsCard details={overview.billingDetails} readOnly={readOnly} onSaved={onDetailsSaved} />}
        </div>
      </div>
    </>
  );
}

function HistoryCard({ overview, initial, onSeePlans }: { overview: BillingOverview; initial: BillingPayments | null; onSeePlans: () => void }) {
  const { t, fmt } = useLocale();
  const [rows, setRows] = useState(initial?.data ?? []);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initial?.meta.total ?? 0);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();

  // The page read again (a payment just started): the first page anew.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setRows(initial?.data ?? []);
    setPage(1);
    setTotal(initial?.meta.total ?? 0);
  }

  const money = (amount: string | number) => formatCurrency(amount, "BDT", fmt);
  const longDate = (iso: string) => formatDate(iso, "d MMMM yyyy", fmt);
  const allShown = rows.length >= total;
  const paidSum = rows.filter((row) => row.status === "SUCCESS").reduce((sum, row) => sum + Number(row.amount), 0);
  const sub =
    total === 0
      ? t("Every payment and receipt shows up here.")
      : allShown
        ? t("{count} payments · {amount} paid", { count: formatCount(total, fmt), amount: money(paidSum) })
        : t("{count} payments", { count: formatCount(total, fmt) });

  function more() {
    startLoading(async () => {
      const result = await getBillingPaymentsAction(page + 1, PAGE);
      if (!result.success || !result.data) {
        toast.error(t(result.message ?? "Couldn't load your payments"));
        return;
      }
      const seen = new Set(rows.map((row) => row.id));
      setRows([...rows, ...result.data.data.filter((row) => !seen.has(row.id))]);
      setPage(page + 1);
      setTotal(result.data.meta.total);
    });
  }

  // Every payment, all pages, as one CSV.
  function downloadCsv() {
    startSaving(async () => {
      const all: BillingPayment[] = [];
      for (let next = 1; next <= 40; next += 1) {
        const result = await getBillingPaymentsAction(next, CSV_PAGE);
        if (!result.success || !result.data) {
          toast.error(t(result.message ?? "Couldn't load your payments"));
          return;
        }
        all.push(...result.data.data);
        if (result.data.data.length < CSV_PAGE || all.length >= result.data.meta.total) break;
      }
      const url = URL.createObjectURL(new Blob([`﻿${billingHistoryCsv(all, (iso) => formatDate(iso, "d MMMM yyyy", "en"))}`], { type: "text/csv;charset=utf-8" }));
      saveFile(url, "smartly-billing-history.csv");
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(t("Billing history downloaded"));
    });
  }

  const pending = overview.pendingPayment;
  const trial = planState(overview.subscription) === "trial";
  return (
    <section aria-labelledby="bh-title" className={cn(CARD, "min-w-0")}>
      <div className="flex items-center gap-3 px-5.5 pt-4.5 pb-3.5">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 id="bh-title" className="text-[16px] font-semibold text-ink">
            {t("Billing history")}
          </h3>
          <span className="text-[13px] text-ink-muted">{sub}</span>
        </span>
        {total > 0 && (
          <Button variant="secondary" size="sm" className="h-9 text-[13px]" onClick={downloadCsv} disabled={saving}>
            {saving ? <Loader size={13} /> : <Download className="size-3.5" aria-hidden="true" />}
            {t("Download CSV")}
          </Button>
        )}
      </div>
      {total > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-170 table-fixed border-collapse text-[13.5px] tabular-nums">
              <thead>
                <tr className="bg-strip text-[12.5px] text-ink-muted">
                  <th scope="col" className="w-[29%] px-5.5 py-2.5 text-left font-medium">{t("Date")}</th>
                  <th scope="col" className="w-[15%] px-2 py-2.5 text-left font-medium">{t("Plan")}</th>
                  <th scope="col" className="w-[16%] px-2 py-2.5 text-left font-medium">{t("Paid with")}</th>
                  <th scope="col" className="w-[13%] px-2 py-2.5 text-right font-medium">{t("Amount")}</th>
                  <th scope="col" className="w-[14%] py-2.5 pr-2 pl-4 text-left font-medium">{t("Status")}</th>
                  <th scope="col" className="w-[13%] py-2.5 pr-5.5 pl-2 text-right font-medium">{t("Receipt")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const look = STATUS_LOOK[row.status];
                  const line = row.status === "FAILED" ? t("Payment did not go through") : row.invoice ? row.invoice.invoiceNumber : row.displayId;
                  return (
                    <tr key={row.id} className="border-t border-divider">
                      <td className="px-5.5 py-2.75 align-middle">
                        <span className="flex min-w-0 flex-col gap-px">
                          <span className="truncate font-medium text-ink">{longDate(row.paidAt ?? row.createdAt)}</span>
                          <span className="truncate text-[11.5px] text-ink-faint" lang={row.status === "FAILED" ? undefined : "en"}>
                            {line}
                          </span>
                        </span>
                      </td>
                      <td className="truncate px-2 py-2.75 text-ink">{t(row.planName)}</td>
                      <td className="truncate px-2 py-2.75 text-ink-2">{t(gatewayLabel(row.gateway))}</td>
                      <td className={cn("px-2 py-2.75 text-right font-semibold whitespace-nowrap", row.status === "SUCCESS" ? "text-ink" : "text-ink-faint")}>{money(row.amount)}</td>
                      <td className="py-2.75 pr-2 pl-4">
                        <span className={cn("inline-flex h-5.5 items-center gap-1.25 rounded-full px-2.25 text-[12px] font-semibold whitespace-nowrap", look.className)}>
                          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                          {t(look.label)}
                        </span>
                      </td>
                      <td className="py-2.75 pr-5.5 pl-2 text-right whitespace-nowrap">
                        {row.status === "SUCCESS" || row.status === "REFUNDED" || row.status === "PENDING" ? (
                          <Link href={checkoutHref({ payment: row.id })} className="inline-flex items-center gap-1.25 text-[13px] font-semibold text-emerald hover:underline">
                            <Receipt className="size-3.5" aria-hidden="true" />
                            {t(row.status === "PENDING" ? "Open" : "View")}
                          </Link>
                        ) : (
                          <span className="text-ink-faint">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!allShown && (
            <div className="flex items-center justify-between gap-3 border-t border-divider px-5.5 py-2.5 text-small text-ink-muted">
              <span>{t("Showing {shown} of {total}", { shown: formatCount(rows.length, fmt), total: formatCount(total, fmt) })}</span>
              <Button variant="secondary" size="xs" onClick={more} disabled={loading} className="pointer-coarse:h-11">
                {loading && <Loader size={12} />}
                {t("Show more")}
              </Button>
            </div>
          )}
          <p className="border-t border-divider bg-strip px-5.5 py-3 text-[12.5px] text-ink-muted">{t("Refunds reach your bKash, Nagad, Rocket or card within 7 working days.")}</p>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2.5 border-t border-divider px-5.5 pt-8.5 pb-9.5 text-center">
          <span className="flex size-13 items-center justify-center rounded-full bg-emerald-soft text-emerald">
            <Receipt className="size-5.5" aria-hidden="true" />
          </span>
          <b className="text-[15px] font-semibold text-ink">{t(trial ? "No payments yet, your trial is free" : "No payments yet")}</b>
          <span className="max-w-105 text-[13.5px] leading-normal text-ink-muted">
            {pending
              ? t("Your {amount} payment is being checked. It shows up here with its receipt once it is confirmed.", { amount: money(pending.amount) })
              : t(trial ? "You are on the free trial, so there is nothing to pay. When you pick Monthly or Yearly, every payment and its receipt shows up here." : "You are on Free, so there is nothing to pay. When you pick Monthly or Yearly, every payment and its receipt shows up here.")}
          </span>
          <button type="button" onClick={onSeePlans} className="mt-1 h-9.5 rounded-full bg-forest px-4 text-[13.5px] font-semibold text-white hover:bg-forest-hover">
            {t("See plans")}
          </button>
        </div>
      )}
    </section>
  );
}

function CurrentPlanCard({ overview, payments, readOnly, busy, onSeePlans, onCancel, onResume }: { overview: BillingOverview; payments: BillingPayments | null; readOnly: boolean; busy: boolean; onSeePlans: () => void; onCancel: () => void; onResume: () => void }) {
  const { t, fmt } = useLocale();
  const { subscription: sub, usage } = overview;
  const state = planState(sub);
  const money = (amount: string | number) => formatCurrency(amount, "BDT", fmt);
  const longDate = (iso: string) => formatDate(iso, "d MMMM yyyy", fmt);
  const count = (value: number) => formatCount(value, fmt);
  const paid = state === "active" || state === "cancelling" || state === "pastDue";
  const lastPaid = payments?.data.find((row) => row.status === "SUCCESS");

  let look: { Icon: typeof Crown; tile: string; name: string; price: string };
  let rows: { k: string; v: string }[];
  if (paid) {
    look = { Icon: Crown, tile: "bg-forest text-mint-200", name: t(sub.planName), price: money(sub.lockedPrice ?? sub.price) };
    rows = [
      ...(sub.currentPeriodEnd ? [{ k: t(state === "active" ? "Paid until" : "Ends on"), v: longDate(sub.currentPeriodEnd) }] : []),
      ...(lastPaid ? [{ k: t("Paid with"), v: t(gatewayLabel(lastPaid.gateway)) }] : []),
      ...(sub.currentPeriodStart ? [{ k: t("Started"), v: longDate(sub.currentPeriodStart) }] : []),
    ];
  } else if (state === "trial") {
    look = { Icon: Gift, tile: "bg-mint-50 text-brand-ink", name: t("Pro free trial"), price: money(0) };
    rows = sub.trialEndsAt ? [
      { k: t("Ends on"), v: longDate(sub.trialEndsAt) },
      { k: t("Days left"), v: t("{count} days", { count: count(daysLeft(sub.trialEndsAt)) }) },
    ] : [];
  } else {
    look = { Icon: Layers, tile: "bg-surface-sunken text-ink-soft", name: t("Free"), price: money(0) };
    rows = [
      { k: t("Transactions this month"), v: usage.transactionLimit < 0 ? count(usage.transactionsThisMonth) : t("{used} of {limit}", { used: count(usage.transactionsThisMonth), limit: count(usage.transactionLimit) }) },
      { k: t("Renews"), v: t("Nothing to renew") },
    ];
  }

  return (
    <section aria-labelledby="cp-h" className={CARD}>
      <div className="flex items-center gap-3 px-5 pt-4.5 pb-3.5">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[10px]", look.tile)}>
          <look.Icon className="size-4.5" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="text-[12px] text-ink-muted">{t("Current plan")}</span>
          <h3 id="cp-h" className="truncate text-[16px] font-semibold text-ink">
            {look.name}
          </h3>
        </span>
        <b className="text-[15px] font-bold whitespace-nowrap text-ink tabular-nums">{look.price}</b>
      </div>
      {rows.length > 0 && (
        <dl className="px-5">
          {rows.map((row) => (
            <div key={row.k} className="flex min-h-9.5 items-center gap-2.5 border-t border-divider">
              <dt className="flex-1 text-[13px] text-ink-muted">{row.k}</dt>
              <dd className="text-[13.5px] font-semibold whitespace-nowrap text-ink tabular-nums">{row.v}</dd>
            </div>
          ))}
        </dl>
      )}
      {paid ? (
        <div className="mt-1 flex flex-col gap-2 border-t border-divider bg-strip px-5 pt-3 pb-4">
          <span className="text-[12.5px] leading-[1.45] text-ink-muted">
            {state === "cancelling" && sub.currentPeriodEnd
              ? t("Pro ends on {date}. Your data stays, and you can come back any time.", { date: longDate(sub.currentPeriodEnd) })
              : state === "pastDue"
                ? t("This period has ended. Pay for the next one to keep Pro.")
                : t("Nothing renews by itself. We remind you 3 days before it ends, and you pay again only if you want to.")}
          </span>
          {state === "active" && (
            <button type="button" onClick={onCancel} disabled={readOnly || busy} className="self-start text-[13px] font-semibold text-expense hover:underline disabled:opacity-50">
              {t("Cancel plan")}
            </button>
          )}
          {state === "cancelling" && (
            <button type="button" onClick={onResume} disabled={readOnly || busy} className="self-start text-[13px] font-semibold text-emerald hover:underline disabled:opacity-50">
              {t("Keep my plan")}
            </button>
          )}
          {state === "pastDue" && !readOnly && (
            <Link href={checkoutHref({ plan: sub.planId })} className="self-start text-[13px] font-semibold text-emerald hover:underline">
              {t("Pay for the next period")}
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 border-t border-divider px-5 pt-3 pb-4.5">
          <span className="text-[12.5px] leading-normal text-ink-muted">
            {t(state === "trial" ? "Nothing is charged when the trial ends. Pick Monthly or Yearly to keep Pro." : "You pay nothing on Free. Pro removes the monthly limit and adds reports, PDF export and income goals.")}
          </span>
          <button type="button" onClick={onSeePlans} className="h-9.5 rounded-full bg-forest text-[13.5px] font-semibold text-white hover:bg-forest-hover">
            {t(state === "trial" ? "Choose a plan" : "See Pro plans")}
          </button>
        </div>
      )}
    </section>
  );
}

function DetailsCard({ details, readOnly, onSaved }: { details: BillingDetails; readOnly: boolean; onSaved: (details: BillingDetails) => void }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const rows = [
    { k: t("Name"), v: details.name },
    { k: t("Phone"), v: phoneShown(details.phone) ?? "–" },
    { k: t("Receipts to"), v: details.email },
  ];
  return (
    <section aria-labelledby="bd-h" className={CARD}>
      <div className="flex items-center gap-2.5 px-5 pt-4 pb-2.5">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 id="bd-h" className="text-[16px] font-semibold text-ink">
            {t("Billing details")}
          </h3>
          <span className="text-[12.5px] text-ink-muted">{t("Shown on your receipts")}</span>
        </span>
        {!readOnly && (
          <IconAction onClick={() => setOpen(true)} aria-label={t("Edit billing details")} title={t("Edit billing details")}>
            <Pencil className="size-3.75" aria-hidden="true" />
          </IconAction>
        )}
      </div>
      <dl className="px-5 pb-1.5">
        {rows.map((row) => (
          <div key={row.k} className="flex min-h-10 items-center gap-3 border-t border-divider">
            <dt className="shrink-0 text-[13px] text-ink-muted">{row.k}</dt>
            <dd className="min-w-0 flex-1 truncate text-right text-[13.5px] font-semibold text-ink" lang={row.v === details.name ? undefined : "en"}>
              {row.v}
            </dd>
          </div>
        ))}
      </dl>
      <BillingDetailsDialog
        open={open}
        details={details}
        onClose={() => setOpen(false)}
        onSaved={(saved) => {
          setOpen(false);
          onSaved(saved);
        }}
      />
    </section>
  );
}
