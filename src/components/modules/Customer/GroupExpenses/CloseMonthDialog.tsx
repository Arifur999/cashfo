"use client";

import { CalendarClock, Lock, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import IconTile from "@/components/smartly/IconTile";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { GroupSettlementResult } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { formatCurrency } from "@/lib/customer/currency";
import { cashInHand, countLabel, dayLabel, mealRateText, type MonthRange, sharedCostEach, shiftMonth, shortName, whoPaysWhom } from "@/lib/customer/groupDisplay";
import { mealText } from "@/lib/customer/groupMeals";
import { closeGroupSettlementAction } from "@/lib/customer/groupExpensesActions";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CloseX, FOCUS_WITHIN, SETTLE_UP_ID } from "./GroupBits";

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
  // A mess usually carries its balances over.
  mess: boolean;
  // Who keeps the cash, by their short name.
  holderName?: string;
}

const prefersReducedMotion = () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Lock a month: its figures are saved as a permanent record. Asks once,
// with the facts in front of you, what locking means, and (when the month
// is still running, or payments are still open) what is left to do first.
export function CloseMonthDialog({ open, onClose, businessId, currency, range, today, settlement, sharedEqually, mess, holderName }: CloseMonthDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Carry each balance into the next month as an opening entry.
  const [carry, setCarry] = useState(false);
  const pending = whoPaysWhom(settlement.members).length;
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    // A mess with balances still open carries them, as it usually does.
    if (open) setCarry(mess && pending > 0);
  }
  // Set by "Record payments first": focus goes to Settle up as it shuts.
  const settleFirst = useRef(false);
  const monthLabel = monthName(range.key, fmt, "long", true);
  const month = monthName(range.key, fmt);
  const nextKey = shiftMonth(range.key, 1);
  const nextMonth = monthName(nextKey, fmt);
  // Each member's contributions less what was returned to them.
  const contributions = settlement.members.reduce((sum, row) => sum + Number(row.contributed), 0);
  const running = today < range.to;
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  // The month's days, short: "1 – 30 Sep", "10 Sep – 9 Oct".
  const days = range.from.slice(0, 7) === range.to.slice(0, 7) ? `${formatCount(Number(range.from.slice(8)), fmt)} – ${dayLabel(range.to, fmt)}` : `${dayLabel(range.from, fmt)} – ${dayLabel(range.to, fmt)}`;
  // Who starts next month furthest behind and furthest ahead, for the carry card.
  const sorted = [...settlement.members].sort((a, b) => Number(a.balance) - Number(b.balance));
  const behind = sorted[0] && Number(sorted[0].balance) < -0.004 ? sorted[0] : null;
  const ahead = sorted.length > 0 && Number(sorted[sorted.length - 1].balance) > 0.004 ? sorted[sorted.length - 1] : null;
  const cash = cashInHand(settlement);
  const who = [behind && t("{name} starts {month} owing {amount}", { name: shortName(behind.name), month: nextMonth, amount: money(-Number(behind.balance)) }), ahead && t("{name} starts {amount} ahead", { name: shortName(ahead.name), amount: money(ahead.balance) })].filter(Boolean).join(", ");
  const carryText = [t("Each balance becomes an opening entry on {day}.", { day: dayLabel(shiftMonth(range.key, 1) + range.from.slice(7), fmt) }), who && who + "."].filter(Boolean).join(" ");
  const holderText = holderName && cash > 0.004 ? t("The {amount} stays with {name}.", { amount: money(cash), name: holderName }) : "";

  const meals = Number(settlement.mealUnits) > 0;
  const facts = [
    { label: t("Period"), value: days },
    { label: t("Total expense"), value: money(settlement.totalExpense) },
    { label: t("Members"), value: formatCount(settlement.memberCount, fmt) },
    // Split by shares, exact amounts or with someone joining mid-month, nobody pays an even part.
    meals ? { label: t("Meals"), value: mealText(Number(settlement.mealUnits), fmt) } : { label: t("Share each"), value: sharedEqually ? money(sharedCostEach(settlement)) : "—" },
    meals ? { label: t("Meal rate"), value: mealRateText(settlement.mealRate, currency, fmt) } : { label: t("Net contributions"), value: money(contributions) },
    { label: t("Cash in hand"), value: money(cash) },
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
        className="w-145 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-[20px] border border-line bg-surface p-0 shadow-overlay ring-0"
      >
        <div className="flex max-h-[calc(100dvh-32px)] flex-col">
          <div className="flex items-start gap-3.5 px-6 pt-5.5">
            <IconTile tone="money" size={40}>
              <Lock />
            </IconTile>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <AlertDialogTitle className="text-h3 text-ink">{t("Close {month}?", { month: monthLabel })}</AlertDialogTitle>
              <AlertDialogDescription className="text-body leading-normal text-ink-soft">{t("This saves {month} as a permanent record and starts {next} fresh.", { month, next: nextMonth })}</AlertDialogDescription>
            </div>
            <CloseX onClick={onClose} disabled={isPending} className="rounded-full" />
          </div>

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 py-5">
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-field border border-line bg-line md:grid-cols-3">
              {facts.map((fact) => (
                <div key={fact.label} className="flex flex-col gap-0.5 bg-surface px-3.5 py-2.5">
                  <dt className="text-caption font-normal text-ink-muted">{fact.label}</dt>
                  <dd className="text-[15px] leading-normal font-bold text-ink tabular-nums">{fact.value}</dd>
                </div>
              ))}
            </dl>

            {running && (
              <p className="flex items-start gap-2 text-small text-ink-2">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                {t("{month} runs until {day}. Anything recorded after closing won't be in this record.", { month, day: dayLabel(range.to, fmt) })}
              </p>
            )}

            {/* Real radios under the cards: arrow keys move between them. */}
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-body font-semibold text-ink">{t("What happens to the balances?")}</legend>
              {[
                {
                  value: true,
                  title: t("Carry them into {month}", { month: nextMonth }),
                  aside: mess ? t("usual for a mess") : null,
                  body: [carryText, holderText].filter(Boolean).join(" "),
                  warn: null,
                },
                {
                  value: false,
                  title: t("Everyone has settled in cash"),
                  aside: null,
                  body:
                    pending > 0
                      ? countLabel(t, fmt, pending, "Record the {count} settle-up payment first, so everyone starts {month} at {zero}.", "Record the {count} settle-up payments first, so everyone starts {month} at {zero}.", { month: nextMonth, zero: money(0) })
                      : t("Everyone is even, so {month} starts at {zero} for all.", { month: nextMonth, zero: money(0) }),
                  warn: pending > 0 ? t("None recorded yet.") : null,
                },
              ].map((option) => {
                const on = carry === option.value;
                return (
                  <label key={String(option.value)} className={cn("relative flex cursor-pointer items-start gap-3 rounded-md border px-3.5 py-3 text-left transition-colors", FOCUS_WITHIN, on ? "border-[1.5px] border-emerald bg-mint-50/60" : "border-line bg-surface hover:border-input")}>
                    <input type="radio" name="close-carry" checked={on} onChange={() => setCarry(option.value)} disabled={isPending} className="sr-only" />
                    <span aria-hidden="true" className={cn("mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border-[1.5px]", on ? "border-emerald" : "border-line-strong")}>
                      {on && <span className="size-2.5 rounded-full bg-emerald" />}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-body font-semibold text-ink">
                        {option.title}
                        {option.aside && <span className="font-normal text-ink-muted"> · {option.aside}</span>}
                      </span>
                      <span className="text-small leading-normal text-ink-soft">{option.body}</span>
                      {option.warn && <span className="text-small font-semibold text-warning">{option.warn}</span>}
                    </span>
                  </label>
                );
              })}
            </fieldset>

            <div className="flex items-start gap-2.5 rounded-md border border-warning-line bg-warning-50 px-3.5 py-3 text-small leading-normal text-warning-ink">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              <span>{t("After closing, {month}'s numbers are locked. If someone later edits an entry dated {days}, this record won't change, and the app asks before allowing that edit. {month} can't be closed twice.", { month, days })}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line bg-surface px-6 py-3.5">
            {pending > 0 && (
              <Button type="button" variant="ghost" onClick={settleUpFirst} disabled={isPending} className="mr-auto max-sm:w-full">
                {t("Record payments first")}
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="max-sm:flex-1">
              {t("Not yet")}
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
