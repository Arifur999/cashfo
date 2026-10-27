"use client";

import { CalendarClock, Star } from "lucide-react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { canCancel, planState, type BillingPlan, type Subscription } from "@/lib/customer/billingDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface CurrentPlanCardProps {
  subscription: Subscription;
  // The plan in force, to pay for (renew, or keep after a trial).
  plan: BillingPlan | null;
  readOnly: boolean;
  busy: boolean;
  onPay: (plan: BillingPlan) => void;
  onCancel: () => void;
  onResume: () => void;
}

// The paid plan or trial in force: until when, and what can be done about
// it -- pay to keep a trial, pay a plan that's overdue, renew, stop at the
// period's end or undo that.
export function CurrentPlanCard({ subscription, plan, readOnly, busy, onPay, onCancel, onResume }: CurrentPlanCardProps) {
  const { t, locale } = useLocale();
  const state = planState(subscription);
  const day = (iso: string | null) => (iso ? formatDate(iso, "d MMM yyyy", locale) : "—");
  const price = subscription.lockedPrice ?? subscription.price;

  const view = {
    trial: { chip: t("Free trial"), tone: "mint" as const, line: t("Your free trial ends on {date}. Pay before then to keep {plan}; otherwise you go back to Free.", { date: day(subscription.trialEndsAt), plan: subscription.planName }) },
    active: { chip: t("Active"), tone: "income" as const, line: t("Paid until {date}. {price} each time it renews.", { date: day(subscription.currentPeriodEnd), price: formatCurrency(price, "BDT", locale) }) },
    cancelling: { chip: t("Ends soon"), tone: "warning" as const, line: t("Ends on {date}. You go back to the Free plan then.", { date: day(subscription.currentPeriodEnd) }) },
    pastDue: { chip: t("Payment due"), tone: "expense" as const, line: t("Your plan's period is over. Pay by {date} to keep {plan}.", { date: day(subscription.graceEndsAt), plan: subscription.planName }) },
    ended: { chip: t("Ended"), tone: "neutral" as const, line: t("This plan has ended.") },
    free: { chip: "", tone: "neutral" as const, line: "" },
  }[state];

  return (
    <Card padding="none" className={cn("flex flex-wrap items-center gap-3.5 px-4 py-4 md:px-5.5", state === "pastDue" && "border-expense-line")}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-field bg-emerald-soft text-emerald [&_svg]:size-5">{state === "trial" ? <CalendarClock aria-hidden="true" /> : <Star aria-hidden="true" />}</span>
      <span className="flex min-w-56 flex-1 flex-col gap-0.5">
        <h2 className="flex flex-wrap items-center gap-2 text-title font-semibold text-ink">
          {t("Your plan: {plan}", { plan: subscription.planName })}
          <Chip tone={view.tone} size="sm">
            {view.chip}
          </Chip>
        </h2>
        <span className={cn("text-small leading-normal", state === "pastDue" ? "text-expense" : "text-ink-muted")}>{view.line}</span>
      </span>
      <span className="flex flex-wrap gap-2">
        {plan && (state === "trial" || state === "pastDue" || state === "active") && (
          <Button size="sm" variant={state === "active" ? "secondary" : "primary"} onClick={() => onPay(plan)} disabled={readOnly || busy} className="pointer-coarse:h-11">
            {t(state === "active" ? "Renew now" : "Pay now")}
          </Button>
        )}
        {state === "active" && canCancel(subscription) && (
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={readOnly || busy} className="pointer-coarse:h-11">
            {t("Cancel plan")}
          </Button>
        )}
        {state === "cancelling" && (
          <Button size="sm" onClick={onResume} disabled={readOnly || busy} className="pointer-coarse:h-11">
            {t("Keep my plan")}
          </Button>
        )}
      </span>
    </Card>
  );
}
