"use client";

import { CalendarClock, Lock, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import IconTile from "@/components/smartly/IconTile";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import type { GroupSettlementResult } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { formatCurrency } from "@/lib/customer/currency";
import { cashInHand, countLabel, dayLabel, type MonthRange, rangeLabel, sharedCostEach, shiftMonth, whoPaysWhom } from "@/lib/customer/groupDisplay";
import { closeGroupSettlementAction } from "@/lib/customer/groupExpensesActions";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CloseX, SETTLE_UP_ID } from "./GroupBits";

interface CloseMonthDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
  range: MonthRange;
  today: string;
  settlement: GroupSettlementResult;
  // Costs shared equally by everyone all month: only then is there one
  // "Share each" figure, as on the Settlement tab.
  sharedEqually: boolean;
}

const prefersReducedMotion = () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Lock a month: its figures are saved as a permanent record. Asks once,
// with the facts in front of you, what locking means, and (when the month
// is still running, or payments are still open) what is left to do first.
export function CloseMonthDialog({ open, onClose, businessId, currency, range, today, settlement, sharedEqually }: CloseMonthDialogProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Carry each balance into the next month as an opening entry.
  const [carry, setCarry] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setCarry(false);
  }
  // Set by "Record payments first": focus goes to Settle up as it shuts.
  const settleFirst = useRef(false);
  const monthLabel = monthName(range.key, locale, "long", true);
  const month = monthName(range.key, locale);
  const nextKey = shiftMonth(range.key, 1);
  const nextMonth = monthName(nextKey, locale);
  // Each member's contributions less what was returned to them.
  const contributions = settlement.members.reduce((sum, row) => sum + Number(row.contributed), 0);
  const pending = whoPaysWhom(settlement.members).length;
  const running = today < range.to;

  const facts = [
    { label: t("Period"), value: rangeLabel(range, locale) },
    { label: t("Total expense"), value: formatCurrency(settlement.totalExpense, currency) },
    { label: t("Members"), value: formatCount(settlement.memberCount, locale) },
    // Split by shares, exact amounts or with someone joining mid-month, nobody pays an even part.
    Number(settlement.mealUnits) > 0 ? { label: t("Meal rate"), value: formatCurrency(settlement.mealRate, currency) } : { label: t("Share each"), value: sharedEqually ? formatCurrency(sharedCostEach(settlement), currency) : "—" },
    { label: t("Net contributions"), value: formatCurrency(contributions, currency) },
    { label: t("Cash in hand"), value: formatCurrency(cashInHand(settlement), currency) },
  ];

  function confirm() {
    if (isPending) return;
    startTransition(async () => {
      const result = await attempt(() => closeGroupSettlementAction(businessId, { periodStart: range.from, periodEnd: range.to, carryForward: carry }), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (result.success) {
        toast.success(t("{month} is closed", { month: monthLabel }), {
          action: { label: t("Go to {month}", { month: nextMonth }), onClick: () => router.push(`/group-expenses/${businessId}?tab=dashboard&month=${nextKey}`) },
        });
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to close the month"));
      }
    });
  }

  function settleUpFirst() {
    settleFirst.current = true;
    onClose();
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          if (!settleFirst.current) return;
          settleFirst.current = false;
          const target = document.getElementById(SETTLE_UP_ID);
          if (!target) return;
          event.preventDefault();
          target.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
          target.focus({ preventScroll: true });
        }}
        className="w-145 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0"
      >
        <div className="flex max-h-[calc(100dvh-32px)] flex-col">
          <div className="flex items-start gap-4 px-6 pt-6">
            <IconTile tone="money" size={40}>
              <Lock />
            </IconTile>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <AlertDialogTitle className="text-h3 text-ink">{t("Close {month}?", { month: monthLabel })}</AlertDialogTitle>
              <AlertDialogDescription className="text-body leading-relaxed text-ink-2">{t("This saves {month} as a permanent record and starts {next} fresh.", { month, next: nextMonth })}</AlertDialogDescription>
            </div>
            <CloseX onClick={onClose} disabled={isPending} />
          </div>

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 py-5">
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-divider md:grid-cols-3">
              {facts.map((fact) => (
                <div key={fact.label} className="flex flex-col gap-0.5 bg-surface px-4 py-3">
                  <dt className="text-caption font-normal text-ink-muted">{fact.label}</dt>
                  <dd className="text-title font-bold text-ink tabular-nums">{fact.value}</dd>
                </div>
              ))}
            </dl>

            {running && (
              <p className="flex items-start gap-2 text-small text-ink-2">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                {t("{month} runs until {day}. Anything recorded after closing won't be in this record.", { month, day: dayLabel(range.to, locale) })}
              </p>
            )}

            {pending > 0 && (
              <p className="text-small text-ink-2">
                {countLabel(
                  t,
                  locale,
                  pending,
                  "{count} settle-up payment is still open. Record it first so everyone starts {month} at {zero}, or close now and settle by hand.",
                  "{count} settle-up payments are still open. Record them first so everyone starts {month} at {zero}, or close now and settle by hand.",
                  { month: nextMonth, zero: formatCurrency(0, currency) },
                )}
              </p>
            )}

            <div className="flex items-center gap-4 rounded-md border border-line px-4 py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span id="carry-label" className="text-body font-semibold text-ink">
                  {t("Carry the balances into {month}", { month: nextMonth })}
                </span>
                <span id="carry-hint" className="text-small leading-normal text-ink-muted">
                  {t("Each member starts {month} with what they are owed or still owe, instead of settling in cash now.", { month: nextMonth })}
                </span>
              </div>
              <Switch checked={carry} onCheckedChange={setCarry} disabled={isPending} aria-labelledby="carry-label" aria-describedby="carry-hint" />
            </div>

            <div className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning-soft px-4 py-3 text-small leading-relaxed text-warning">
              <TriangleAlert className="mt-0.5 size-4.5 shrink-0" aria-hidden="true" />
              <span>{t("After closing, {month}'s numbers are locked. Editing an entry dated inside it later won't change this record, and the app asks before allowing that edit. A month can't be closed twice.", { month })}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-strip px-6 py-4">
            {pending > 0 && (
              <Button type="button" variant="ghost" onClick={settleUpFirst} disabled={isPending} className="mr-auto max-sm:w-full">
                {t("Record payments first")}
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="max-sm:flex-1">
              {t("Not now")}
            </Button>
            <Button type="button" variant="action" onClick={confirm} disabled={isPending} className="px-5 max-sm:flex-1">
              {isPending && <Loader />}
              {t("Close {month}", { month })}
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
