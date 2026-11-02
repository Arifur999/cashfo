"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import type { SavingsGoal } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { updateSavingsPlanAction } from "@/lib/customer/savingsGoalActions";
import { savingsError } from "@/lib/customer/savingsDisplay";
import { catchUp, monthlyAverage } from "@/lib/customer/savingsPlan";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";

type Way = "add" | "plan" | "extend";

interface CatchUpDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  goal: SavingsGoal | null;
  currency: string;
  today: string;
  email: string;
  // Money can go in (a savings account exists): offers "Add the gap now".
  canAdd: boolean;
  // Opens Add money with this amount.
  onAddNow: (amount: number) => void;
  // Opens Move money into this goal.
  onMoveIn: () => void;
}

// Get a goal behind its plan back on track (design: SavingsDashboard's
// Catch up popup): add the gap now, save the needed amount a month from
// now (a fresh plan to the same end date, with a reminder on the 1st), or
// move the end date at the original pace.
export function CatchUpDialog({ open, onClose, businessId, goal, currency, today, email, canAdd, onAddNow, onMoveIn }: CatchUpDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const [way, setWay] = useState<Way | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open && goal ? goal.id : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    setWay(null);
    setError("");
  }

  if (!goal) return null;
  const plan = catchUp(goal, today);
  const average = monthlyAverage(goal, today);
  const day = (value: string) => formatDate(value, "d MMM yyyy", fmt);
  const ways: { key: Way; title: string; sub: string; tag: string; tagClass: string; button: string }[] = [];
  if (canAdd)
    ways.push({
      key: "add",
      title: t("Add {amount} now", { amount: money(plan.addNow) }),
      sub: t("Fills the gap in one go. You choose the account on the next step."),
      tag: t("Fastest"),
      tagClass: "bg-income-soft text-income",
      button: t("Add {amount}", { amount: money(plan.addNow) }),
    });
  ways.push({
    key: "plan",
    title: t("Save {amount} a month from now", { amount: money(plan.perMonth) }),
    sub: `${average ? `${t("Up from the {amount} a month you have averaged.", { amount: money(average) })} ` : ""}${t("Same end date, {date}. A reminder email goes out on the 1st of each month.", { date: day(goal.targetDate) })}`,
    tag: t("Same date"),
    tagClass: "bg-info-soft text-info",
    button: t("Use this plan"),
  });
  ways.push({
    key: "extend",
    title: t("Move the end date to {date}", { date: day(plan.newEnd) }),
    sub: t(plan.monthsLater === 1 ? "Keep your original pace of about {amount} a month. You reach {target} {count} month later." : "Keep your original pace of about {amount} a month. You reach {target} {count} months later.", {
      amount: money(plan.originalPace),
      target: money(goal.targetAmount),
      count: formatCount(plan.monthsLater, fmt),
    }),
    tag: t("Easiest"),
    tagClass: "bg-surface-sunken text-ink-2",
    button: t("Move end date"),
  });
  const picked = ways.find((item) => item.key === way) ?? ways[0];

  function apply() {
    if (isPending || !goal) return;
    if (picked.key === "add") {
      onAddNow(plan.addNow);
      return;
    }
    startTransition(async () => {
      const result = await updateSavingsPlanAction(businessId, goal.id, picked.key === "plan" ? { mode: "RESET" } : { mode: "EXTEND", targetDate: plan.newEnd });
      if (!result.success) {
        setError(savingsError(result.message, "Failed to update goal", t, currency, fmt));
        return;
      }
      toast.success(
        picked.key === "plan"
          ? t("New plan for {name}: save {amount} a month until {date}. Reminders go to {email}.", { name: goal.name, amount: money(plan.perMonth), date: day(goal.targetDate), email })
          : t("{name} now ends on {date}. About {amount} a month gets you there.", { name: goal.name, date: day(plan.newEnd), amount: money(plan.originalPace) }),
      );
      onClose();
      router.refresh();
    });
  }

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      width={560}
      busy={isPending}
      title={t("Get {name} back on track", { name: goal.name })}
      sub={fillNodes(t("By today you planned to have {expected}. You have {saved}, so you are {gap}. Pick one way to fix it."), {
        expected: <b className="font-semibold text-ink">{money(plan.expected)}</b>,
        saved: <b className="font-semibold text-ink">{money(goal.currentAmount)}</b>,
        gap: <b className="font-semibold text-warning">{t("{amount} behind", { amount: money(plan.gap) })}</b>,
      })}
      footer={
        <>
          <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={isPending}>
            {t("Not now")}
          </Button>
          <Button type="button" size="lg" onClick={apply} disabled={isPending}>
            {isPending && <Loader size={16} onDark label={t("Loading...")} />}
            {picked.button}
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label={t("Ways to catch up")} className="flex flex-col gap-2.5">
        {ways.map((item) => {
          const on = item.key === picked.key;
          return (
            <button
              key={item.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setWay(item.key)}
              className={cn("flex items-start gap-3 rounded-[14px] p-3.5 text-left", on ? "border-[1.5px] border-emerald bg-mint-50" : "border border-line bg-surface hover:border-line-strong")}
            >
              <span aria-hidden="true" className={cn("mt-0.5 size-4.5 shrink-0 rounded-full bg-surface", on ? "border-[5px] border-emerald" : "border-[1.5px] border-line-strong")} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.75">
                <span className="text-[14.5px] font-semibold text-ink">{item.title}</span>
                <span className="text-[12.5px] leading-normal text-ink-2">{item.sub}</span>
              </span>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", item.tagClass)}>{item.tag}</span>
            </button>
          );
        })}
      </div>
      <button type="button" onClick={onMoveIn} className="inline-flex min-h-9 items-center gap-1.5 self-start text-small font-semibold text-emerald hover:text-emerald-hover">
        {t("Or move money in from another goal")}
        <ArrowRight className="size-3.25" strokeWidth={2.5} aria-hidden="true" />
      </button>
      {error && (
        <p role="alert" className="text-small text-expense">
          {error}
        </p>
      )}
    </PopupDialog>
  );
}
