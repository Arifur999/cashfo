"use client";

import { Lock, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import IconTile from "@/components/smartly/IconTile";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { GroupSettlementResult } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { cashInHand, type MonthRange, shiftMonth, whoPaysWhom } from "@/lib/customer/groupDisplay";
import { closeGroupSettlementAction } from "@/lib/customer/groupExpensesActions";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface CloseMonthDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
  range: MonthRange;
  settlement: GroupSettlementResult;
}

// Lock a month: its figures are saved as a permanent record. Asks once,
// with the facts in front of you and what locking means.
export function CloseMonthDialog({ open, onClose, businessId, currency, range, settlement }: CloseMonthDialogProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const monthLabel = monthName(range.key, locale, "long", true);
  const nextMonth = monthName(shiftMonth(range.key, 1), locale);
  const contributions = settlement.members.reduce((sum, row) => sum + Number(row.contributed), 0);
  const pending = whoPaysWhom(settlement.members).length;

  const facts = [
    { label: t("Period"), value: `${range.from.slice(8)} – ${range.to.slice(8)} ${monthName(range.key, locale, "short")}` },
    { label: t("Total expense"), value: formatCurrency(settlement.totalExpense, currency) },
    { label: t("Members"), value: String(settlement.memberCount) },
    { label: t("Share each"), value: formatCurrency(settlement.perMemberShare, currency) },
    { label: t("Contributions"), value: formatCurrency(contributions, currency) },
    { label: t("Cash in hand"), value: formatCurrency(cashInHand(settlement), currency) },
  ];

  function confirm() {
    if (isPending) return;
    startTransition(async () => {
      const result = await closeGroupSettlementAction(businessId, { periodStart: range.from, periodEnd: range.to });
      if (result.success) {
        toast.success(`${monthLabel} ${t("is closed")}`);
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to close the month"));
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-145 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0">
        <div className="flex items-start gap-4 px-6 pt-6">
          <IconTile tone="money" size={40}>
            <Lock />
          </IconTile>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <AlertDialogTitle className="text-h3 text-ink">
              {t("Close")} {monthLabel}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-body leading-relaxed text-ink-2">
              {t("This saves")} {monthName(range.key, locale)} {t("as a permanent record and starts")} {nextMonth} {t("fresh.")}
            </AlertDialogDescription>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-surface-sunken md:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label} className="flex flex-col gap-0.5 bg-surface px-4 py-3">
                <dt className="text-caption font-normal text-ink-muted">{fact.label}</dt>
                <dd className="text-title font-bold text-ink tabular-nums">{fact.value}</dd>
              </div>
            ))}
          </dl>

          {pending > 0 && (
            <p className="text-small text-ink-2">
              {pending} {t(pending === 1 ? "settle-up payment is" : "settle-up payments are")} {t("still open. Record them first so everyone starts")} {nextMonth} {t("at")} {formatCurrency(0, currency)}, {t("or close now and settle by hand.")}
            </p>
          )}

          <div className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning-soft px-4 py-3 text-small leading-relaxed text-warning">
            <TriangleAlert className="mt-0.5 size-4.5 shrink-0" aria-hidden="true" />
            <span>
              {t("After closing,")} {monthName(range.key, locale)}
              {t("'s numbers are locked. Editing an entry dated inside it later won't change this record, and the app asks before allowing that edit. A month can't be closed twice.")}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-line bg-cream px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Not yet")}
          </Button>
          <Button type="button" onClick={confirm} disabled={isPending} className="px-5">
            {isPending && <Loader />}
            {t("Close")} {monthName(range.key, locale)}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
