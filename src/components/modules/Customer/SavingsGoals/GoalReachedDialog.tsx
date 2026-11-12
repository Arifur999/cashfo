"use client";

import { Check } from "lucide-react";
import Button from "@/components/smartly/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { SavingsGoal } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { daysBetween, monthsSinceStart } from "@/lib/customer/savingsPlan";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface GoalReachedDialogProps {
  open: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
  currency: string;
  today: string;
  canWithdraw: boolean;
  onWithdraw: () => void;
}

// Money in filled a goal (design: SavingsDashboard's goal reached popup):
// say so, and offer to withdraw it to the main balance or keep it saved.
export function GoalReachedDialog({ open, onClose, goal, currency, today, canWithdraw, onWithdraw }: GoalReachedDialogProps) {
  const { t, fmt } = useLocale();
  if (!goal) return null;
  const months = monthsSinceStart(goal, today);
  const days = Math.max(1, daysBetween(goal.startDate, today));
  const took = months >= 1 ? t(months === 1 ? "{count} month" : "{count} months", { count: formatCount(months, fmt) }) : t(days === 1 ? "{count} day" : "{count} days", { count: formatCount(days, fmt) });
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton={false} className="flex w-110 max-w-[calc(100vw-32px)] flex-col items-center gap-2.5 rounded-[22px] border-0 bg-surface px-7 pt-7 pb-5.5 text-center leading-[normal] text-ink shadow-overlay ring-0 sm:max-w-[calc(100vw-32px)]">
        <span aria-hidden="true" className="flex size-18 items-center justify-center rounded-full bg-success">
          <span className="flex size-14 items-center justify-center rounded-full bg-surface text-success">
            <Check className="size-7" strokeWidth={2.75} />
          </span>
        </span>
        <DialogTitle className="mt-1.5 text-[21px] font-bold! text-ink">{t("{name} reached!", { name: goal.name })}</DialogTitle>
        <DialogDescription asChild className="text-body leading-[1.55] text-ink-soft">
          <p>
            {fillNodes(t("You saved {amount} in {time}. It stays in your savings accounts until you withdraw it to your main balance."), {
              amount: <b className="font-bold text-ink">{formatCurrency(goal.targetAmount, currency, fmt)}</b>,
              time: took,
            })}
          </p>
        </DialogDescription>
        <div className="mt-2.5 flex w-full flex-col gap-2.5 sm:flex-row">
          <Button variant="secondary" size="lg" onClick={onClose} className="flex-1">
            {t("Keep it saved for now")}
          </Button>
          {canWithdraw && (
            <Button size="lg" onClick={onWithdraw} className="flex-1 bg-success shadow-none hover:bg-success/90">
              {t("Withdraw to balance")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
