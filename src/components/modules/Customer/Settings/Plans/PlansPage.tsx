"use client";

import { CalendarDays, Crown, Gift, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import ErrorState from "@/components/smartly/ErrorState";
import { setCancelAtPeriodEndAction, startTrialAction } from "@/lib/customer/billingActions";
import { daysLeft, lowestMonthly, paidPlans, planState, trialOffer, yearlyDeal, type BillingOverview, type BillingPayments, type BillingPlan, type BillingPlans, type FeatureLimits } from "@/lib/customer/billingDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { MONEY_HOME } from "@/lib/customer/nav";
import { formatDate } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BillingSection } from "./BillingSection";
import { checkoutHref } from "./checkoutRoute";
import { PlanCard, type PlanCardModel } from "./PlanCard";
import { FreeOrProCard, PlanQuestions, WaysToPayCard, type CompareRow } from "./PlanDetails";
import { PlanModal } from "./PlanModal";
import { PlanStatusStrip } from "./PlanStatusStrip";

interface PlansPageProps {
  plans: BillingPlans | null;
  overview: BillingOverview | null;
  payments: BillingPayments | null;
}

// Settings › Plans & billing (UpgradePlan board): where the customer
// stands, the free trial and each paid plan as a card, Free against Pro,
// the two ways to pay, then Billing (payments and receipts, the plan, the
// details on receipts) and the questions people ask. Choosing a plan opens
// the payment page (Checkout).
export function PlansPage({ plans, overview: initialOverview, payments }: PlansPageProps) {
  const { t, fmt } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const readOnly = Boolean(user.impersonatedBy);
  const [overview, setOverview] = useState(initialOverview);
  const [modal, setModal] = useState<"started" | "cancel" | null>(null);
  const [isPending, startTransition] = useTransition();

  // The page read again (after a trial, a cancel): its answer wins.
  const [prevOverview, setPrevOverview] = useState(initialOverview);
  if (initialOverview !== prevOverview) {
    setPrevOverview(initialOverview);
    if (initialOverview) setOverview(initialOverview);
  }

  if (!plans || !overview) {
    return (
      <>
        <h1 className="text-[30px] leading-[1.2] font-semibold tracking-[-0.03em] text-ink">{t("Plans & billing")}</h1>
        <ErrorState title={t("Couldn't load the plans")} onRetry={() => router.refresh()} />
      </>
    );
  }

  const { subscription, pendingPayment } = overview;
  const state = planState(subscription);
  const isPaid = state === "active" || state === "cancelling" || state === "pastDue";
  const trialRunning = state === "trial";
  const trial = trialOffer(plans.plans);
  const canStartTrial = !!trial && overview.trialAvailable && (state === "free" || state === "ended");
  const paid = paidPlans(plans.plans);
  const freePlan = plans.plans.find((plan) => plan.billingCycle === "FREE");
  const freeLimit = freePlan?.featureLimits.maxTransactionsPerMonth ?? -1;
  const proPlan = trial ?? paid[0] ?? null;
  const money = (amount: number | string) => formatCurrency(amount, "BDT", fmt);
  const day = (iso: string) => formatDate(iso, "d MMM yyyy", "", fmt);
  const count = (value: number) => formatCount(value, fmt);
  const freeLine = freeLimit >= 0 ? t("{count} transactions a month", { count: count(freeLimit) }) : t("no monthly limit");

  function startTrial() {
    if (!trial) return;
    startTransition(async () => {
      const result = await startTrialAction(trial.id);
      if (result.success && result.data) {
        setOverview(result.data);
        setModal("started");
        router.refresh();
      } else {
        toast.error(t(result.message ?? "Couldn't start the free trial"));
      }
    });
  }

  function setCancel(cancel: boolean) {
    startTransition(async () => {
      const result = await setCancelAtPeriodEndAction(cancel);
      setModal(null);
      if (result.success && result.data) {
        setOverview(result.data);
        toast.success(t(cancel ? "Your plan ends at the end of this period." : "Your plan carries on."));
        router.refresh();
      } else {
        toast.error(t(result.message ?? (cancel ? "Couldn't cancel your plan" : "Couldn't keep your plan")));
      }
    });
  }

  // What a paid plan includes, as the cards list it: the monthly limit,
  // then each of the Pro features it has.
  const featuresOf = (limits: FeatureLimits) => {
    const transactions = limits.maxTransactionsPerMonth ?? -1;
    return [
      { label: t("Transactions a month"), value: transactions < 0 ? t("No limit") : count(transactions) },
      ...(
        [
          ["advancedReports", "Advanced reports"],
          ["pdfExport", "PDF export"],
          ["incomeGoalTracking", "Income goals"],
        ] as const
      )
        .filter(([key]) => limits[key])
        .map(([, label]) => ({ label: t(label), value: "" })),
    ];
  };

  const firstCard: PlanCardModel = (() => {
    const current = !isPaid;
    const trialDays = trial?.trialDays ?? 0;
    const action: PlanCardModel["action"] = trialRunning
      ? { kind: "button", label: t("Trial running · {count} days left", { count: count(subscription.trialEndsAt ? daysLeft(subscription.trialEndsAt) : trialDays) }), disabled: true, look: "off" }
      : canStartTrial
        ? { kind: "button", label: t("Start {days}-day free trial", { days: count(trialDays) }), onClick: startTrial, disabled: readOnly || isPending, busy: isPending, look: current ? "main" : "line" }
        : { kind: "button", label: current ? t("Current plan") : t(trial ? "Trial already used" : "Free plan"), disabled: true, look: "off" };
    return {
      key: "first",
      name: trial ? t("Free trial") : "Free",
      who: trial ? t("Try everything first") : t("Free forever"),
      icon: Gift,
      tone: "mint",
      price: money(0),
      per: trial ? t("for {days} days", { days: count(trialDays) }) : t("a month"),
      note: trial ? t("No payment, no card needed") : t("No card needed"),
      noteAccent: true,
      ribbon: null,
      features: trial ? featuresOf(trial.featureLimits) : [{ label: t("Transactions a month"), value: freeLimit < 0 ? t("No limit") : count(freeLimit) }],
      foot: current && !trialRunning && !canStartTrial ? t("Free plan: {line}", { line: freeLine }) : t("Then Free: {line}", { line: freeLine }),
      current,
      tag: current ? t("Current plan") : null,
      action,
    };
  })();

  const paidCard = (plan: BillingPlan): PlanCardModel => {
    const yearly = plan.billingCycle === "YEARLY";
    const deal = yearly ? yearlyDeal(plan, plans.plans) : null;
    const current = isPaid && subscription.planId === plan.id;
    const waiting = pendingPayment?.planId === plan.id;
    const choose = yearly ? t("Choose Yearly") : t("Choose Monthly");
    let action: PlanCardModel["action"];
    if (current) action = { kind: "button", label: t("Current plan"), disabled: true, look: "off" };
    else if (waiting) action = { kind: "button", label: t("Payment being checked"), disabled: true, look: "off" };
    else if (readOnly) action = { kind: "button", label: isPaid ? t("Switch to {plan}", { plan: t(plan.name) }) : choose, disabled: true, look: "off" };
    else action = { kind: "link", label: isPaid ? t("Switch to {plan}", { plan: t(plan.name) }) : choose, href: checkoutHref({ plan: plan.id }) };
    return {
      key: plan.id,
      name: t(plan.name),
      who: yearly ? t("Best for the whole year") : t("Pay as you go"),
      icon: yearly ? Crown : CalendarDays,
      tone: yearly ? "amber" : "sky",
      price: money(plan.price),
      per: yearly ? t("a year") : t("a month"),
      note: yearly ? (deal ? t("{percent}% off · about {amount} a month", { percent: count(deal.percentOff), amount: money(deal.perMonth) }) : t("About {amount} a month", { amount: money(Math.round(Number(plan.price) / 12)) })) : t("Pay one month at a time"),
      noteAccent: yearly && !!deal,
      ribbon: deal ? t("Best value · {percent}% off", { percent: count(deal.percentOff) }) : null,
      features: featuresOf(plan.featureLimits),
      foot: current && subscription.currentPeriodEnd ? t("Active until {date}", { date: day(subscription.currentPeriodEnd) }) : yearly ? (deal ? t("Instead of {amount} for 12 months", { amount: money(deal.twelveMonths) }) : t("Paid once a year")) : t("Stop any month, your data stays"),
      current,
      tag: current ? t("Current plan") : null,
      action,
    };
  };

  const cards = [firstCard, ...paid.map(paidCard)];
  const yearlyPlan = paid.find((plan) => plan.billingCycle === "YEARLY");
  const deal = yearlyPlan ? yearlyDeal(yearlyPlan, plans.plans) : null;
  const monthlyPlan = paid.find((plan) => plan.billingCycle === "MONTHLY");
  const lowest = lowestMonthly(plans.plans);

  const compare: CompareRow[] = proPlan
    ? [
        {
          label: t("Transactions a month"),
          free: freeLimit < 0 ? t("No limit") : count(freeLimit),
          pro: (proPlan.featureLimits.maxTransactionsPerMonth ?? -1) < 0 ? t("No limit") : count(proPlan.featureLimits.maxTransactionsPerMonth ?? 0),
          freeKind: "text",
          proKind: "text",
        },
        ...(
          [
            ["advancedReports", "Advanced reports"],
            ["pdfExport", "PDF export"],
            ["incomeGoalTracking", "Income goals"],
          ] as const
        ).map(([key, label]) => ({ label: t(label), free: "", pro: "", freeKind: freePlan?.featureLimits[key] ? ("yes" as const) : ("no" as const), proKind: proPlan.featureLimits[key] ? ("yes" as const) : ("no" as const) })),
        { label: t("Price"), free: money(0), pro: lowest !== null ? t("from {amount} a month", { amount: money(lowest) }) : "–", freeKind: "text", proKind: "text" },
      ]
    : [];

  const questions = [
    trial && { q: t("What happens when the free trial ends?"), a: t("You move to Free. All your data stays, and you can add up to {count} transactions a month. Pick Monthly or Yearly any time to get Pro back.", { count: count(Math.max(0, freeLimit)) }) },
    { q: t("Will money be taken automatically?"), a: t("No. Nothing renews by itself. We remind you 3 days before your plan ends, and you pay again only if you want to.") },
    { q: t("How does sending money myself work?"), a: t("Send the exact amount to our bKash, Nagad or Rocket number, or to our bank account, and type the TrxID on the payment page. We check it, usually within 2 hours between 9 am and 10 pm, and Pro turns on.") },
    { q: t("Where do I use a promo code?"), a: t("On the payment page, before you pay. You see the new price right away.") },
    deal &&
      monthlyPlan && {
        q: t("Can I move from monthly to yearly?"),
        a: t("Yes. Pick Yearly when you are ready. It is {percent}% cheaper, about {amount} less a month.", { percent: count(deal.percentOff), amount: money(Math.max(0, Math.round(Number(monthlyPlan.price) - deal.perMonth))) }),
      },
  ].filter((item): item is { q: string; a: string } => !!item);

  const trialEnds = overview.subscription.trialEndsAt;
  const seePlans = () => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[26px] leading-[1.2] font-semibold tracking-[-0.03em] text-ink md:text-[30px]">{t("Plans & billing")}</h1>
        <p className="text-[14.5px] text-ink-muted">{t("Pick a plan, see what you paid and manage renewal. Prices are in taka.")}</p>
      </div>

      <PlanStatusStrip
        overview={overview}
        trialDays={canStartTrial ? (trial?.trialDays ?? null) : trialRunning ? (trial?.trialDays ?? null) : null}
        readOnly={readOnly}
        busy={isPending}
        onStartTrial={startTrial}
        onCancel={() => setModal("cancel")}
        onResume={() => setCancel(false)}
      />

      {overview.referralDiscount && (
        <div className="flex items-center gap-3 rounded-card border border-emerald-line bg-emerald-soft px-5 py-3 text-small text-ink-2">
          <Gift className="size-4.5 shrink-0 text-emerald" aria-hidden="true" />
          <span>{t("A friend invited you: you get {percent}% off your first paid plan. It's taken off when you pay.", { percent: count(overview.referralDiscount.percent) })}</span>
        </div>
      )}

      {/* The board's three cards in a row; four (a plan the board doesn't
          have) two by two, so none gets too narrow for its name. */}
      <div id="plans" className={cn("grid scroll-mt-3 items-stretch gap-4 pt-1.5", cards.length === 3 || cards.length > 4 ? "lg:grid-cols-3" : "md:grid-cols-2")}>
        {cards.map((card) => (
          <PlanCard key={card.key} card={card} />
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        {compare.length > 0 && <FreeOrProCard rows={compare} />}
        <WaysToPayCard online={plans.onlineCheckout === true} />
      </div>

      <BillingSection
        overview={overview}
        payments={payments}
        readOnly={readOnly}
        busy={isPending}
        onSeePlans={seePlans}
        onCancel={() => setModal("cancel")}
        onResume={() => setCancel(false)}
        onDetailsSaved={(billingDetails) => setOverview({ ...overview, billingDetails })}
      />

      <PlanQuestions items={questions} />

      <PlanModal
        open={modal === "started"}
        onClose={() => setModal(null)}
        icon={Gift}
        tone="mint"
        title={t("Your {days}-day free trial has started", { days: count(trial?.trialDays ?? 0) })}
        body={trialEnds ? t("Everything in Pro is on until {date}. Nothing is charged. Pick Monthly or Yearly before then to keep Pro.", { date: day(trialEnds) }) : t("Everything in Pro is on now. Nothing is charged.")}
        second={t("Stay here")}
        main={{ label: t("Go to dashboard"), onClick: () => router.push(MONEY_HOME) }}
      />
      <PlanModal
        open={modal === "cancel"}
        onClose={() => setModal(null)}
        icon={TriangleAlert}
        tone="amber"
        title={t("Cancel your plan?")}
        body={
          subscription.currentPeriodEnd
            ? t("You keep {plan} until {date}, then you're on Free. Your data stays as it is, and you can add up to {count} transactions a month.", { plan: subscription.planName, date: day(subscription.currentPeriodEnd), count: count(Math.max(0, freeLimit)) })
            : t("You go back to the Free plan when this period ends.")
        }
        second={t("Keep my plan")}
        main={{ label: t("Cancel plan"), onClick: () => setCancel(true), busy: isPending }}
      />
    </>
  );
}
