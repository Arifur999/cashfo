"use client";

import { BriefcaseBusiness, Check, Gift, Package, Star, X, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import ErrorState from "@/components/smartly/ErrorState";
import { previewCouponAction, setCancelAtPeriodEndAction, startTrialAction } from "@/lib/customer/billingActions";
import {
  couponProblem,
  familyPlan,
  featureMissing,
  featureValue,
  FEATURE_ROWS,
  heroFamily,
  planFamilies,
  planState,
  usagePercent,
  usageTone,
  yearlySaving,
  type BillingOverview,
  type BillingPayments,
  type BillingPlan,
  type BillingPlans,
  type CouponPreview,
  type FeatureValue,
  type PlanFamily,
} from "@/lib/customer/billingDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CheckoutDialog } from "./CheckoutDialog";
import { CurrentPlanCard } from "./CurrentPlanCard";
import { PaymentsCard } from "./PaymentsCard";
import { PendingPaymentCard } from "./PendingPaymentCard";

interface PlansPageProps {
  plans: BillingPlans | null;
  overview: BillingOverview | null;
  payments: BillingPayments | null;
}

// What each family is for (dictionary keys), by its name; any other
// plan the admin adds says what it includes below instead.
const BLURBS: Record<string, string> = {
  pro: "For running your whole money life: no limits, reports you can export and goals for your income.",
  business: "For shops and teams that keep the books together, with as many business workspaces as you need.",
};

const ICONS: Record<string, LucideIcon> = { free: Package, pro: Star, business: BriefcaseBusiness };

const CARD_SHADOW = "shadow-card";

// Settings › Plans (design-v4 UpgradePlan): the period switch, what this
// month used, the three plans, the comparison, how to pay and the coupon.
// Around the board: a payment waiting to be sent, the plan in force (trial,
// renewal, cancel at the period's end) and the payments with their invoices.
// There is no online gateway yet: a checkout gives the steps to send the
// money, and the team turns the plan on once it arrives.
export function PlansPage({ plans, overview: initialOverview, payments }: PlansPageProps) {
  const { t, fmt } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const readOnly = Boolean(user.impersonatedBy);
  const [overview, setOverview] = useState(initialOverview);
  const [yearly, setYearly] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<BillingPlan | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; plan: string; preview: CouponPreview } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [confirmFree, setConfirmFree] = useState(false);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [checking, startChecking] = useTransition();

  // The page read again (after a trial, a checkout): its answer wins.
  const [prevOverview, setPrevOverview] = useState(initialOverview);
  if (initialOverview !== prevOverview) {
    setPrevOverview(initialOverview);
    if (initialOverview) setOverview(initialOverview);
  }

  if (!plans || !overview) {
    return (
      <>
        <h1 className="text-[30px] leading-[1.2] font-semibold tracking-[-0.03em] text-ink">{t("Choose your plan")}</h1>
        <ErrorState title={t("Couldn't load the plans")} onRetry={() => router.refresh()} />
      </>
    );
  }

  const { subscription, usage } = overview;
  const state = planState(subscription);
  const families = planFamilies(plans.plans);
  const hero = heroFamily(families);
  const saving = yearlySaving(families);
  const hasYearly = families.some((family) => family.yearly);
  const trialAvailable = overview.trialAvailable && state === "free";
  const anyTrial = families.some((family) => !family.free && ((familyPlan(family, yearly)?.trialDays ?? 0) > 0));
  const money = (amount: number | string) => formatCurrency(amount, "BDT", fmt);
  const day = (iso: string, pattern = "d MMM yyyy") => formatDate(iso, pattern, fmt);
  const currentFamily = families.find((family) => family.monthly?.id === subscription.planId || family.yearly?.id === subscription.planId) ?? null;

  function startTrial(plan: BillingPlan) {
    setBusyPlanId(plan.id);
    startTransition(async () => {
      const result = await startTrialAction(plan.id);
      setBusyPlanId(null);
      if (result.success && result.data) {
        setOverview(result.data);
        toast.success(t("Your {days}-day free trial of {plan} has started.", { days: formatCount(plan.trialDays, fmt), plan: plan.name }));
        router.refresh();
      } else {
        toast.error(t(result.message ?? "Couldn't start the free trial"));
      }
    });
  }

  function setCancel(cancel: boolean) {
    startTransition(async () => {
      const result = await setCancelAtPeriodEndAction(cancel);
      setConfirmFree(false);
      if (result.success && result.data) {
        setOverview(result.data);
        toast.success(t(cancel ? "Your plan ends at the end of this period." : "Your plan carries on."));
        router.refresh();
      } else {
        toast.error(t(result.message ?? (cancel ? "Couldn't cancel your plan" : "Couldn't keep your plan")));
      }
    });
  }

  // Checks the code against the plan the Pro card shows now; the checkout
  // uses it, and shows the discount before anything is paid.
  function applyCoupon(event: React.FormEvent) {
    event.preventDefault();
    const code = couponCode.trim();
    const target = (hero && familyPlan(hero, yearly)) ?? plans?.plans.find((plan) => plan.billingCycle !== "FREE") ?? null;
    if (!code || !target) return;
    setCouponError(null);
    startChecking(async () => {
      const result = await previewCouponAction(target.id, code);
      if (result.success && result.data?.valid) {
        setCoupon({ code, plan: target.name, preview: result.data });
      } else {
        setCoupon(null);
        setCouponError(t(result.success ? couponProblem(result.data?.reason) : (result.message ?? "Couldn't check that coupon")));
      }
    });
  }

  // A plan card's button: what it does for this customer now.
  function cta(family: PlanFamily, plan: BillingPlan): { label: string; onClick?: () => void; disabled?: boolean; busy?: boolean } {
    const isCurrent = plan.id === subscription.planId && state !== "ended";
    if (family.free) {
      if (state === "free") return { label: t("Current plan"), disabled: true };
      if (state === "cancelling" && subscription.currentPeriodEnd) return { label: t("Yours from {date}", { date: day(subscription.currentPeriodEnd, "d MMM") }), disabled: true };
      if (state === "active") return { label: t("Switch at the end of your plan"), onClick: () => setConfirmFree(true) };
      return { label: t("After your plan ends"), disabled: true };
    }
    if (isCurrent && (state === "trial" || state === "pastDue")) return { label: t("Pay now"), onClick: () => setCheckoutPlan(plan) };
    if (isCurrent) return { label: t("Current plan"), disabled: true };
    if (trialAvailable && plan.trialDays > 0) return { label: t("Start {days}-day free trial", { days: formatCount(plan.trialDays, fmt) }), onClick: () => startTrial(plan), busy: busyPlanId === plan.id };
    return { label: t("Choose {plan}", { plan: plan.name }), onClick: () => setCheckoutPlan(plan) };
  }

  const featureText = (value: FeatureValue) => (value.kind === "unlimited" ? t("No limit") : value.kind === "count" ? formatCount(value.value, fmt) : "");
  const cell = (value: FeatureValue) => (value.kind === "yes" ? t("Included") : value.kind === "no" ? "—" : featureText(value));

  const planTitle = subscription.billingCycle === "FREE" ? t("You're on the Free plan.") : t("You're on the {plan} plan.", { plan: subscription.planName });
  const usedPct = usagePercent(usage.transactionsThisMonth, usage.transactionLimit);
  const tone = usageTone(usage.transactionsThisMonth, usage.transactionLimit);
  const noLimitFamily = families.find((family) => !family.free && familyPlan(family, yearly)?.featureLimits.maxTransactionsPerMonth === -1);

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-[26px] leading-[1.2] font-semibold tracking-[-0.03em] text-ink md:text-[30px]">{t("Choose your plan")}</h1>
          <p className="text-body text-ink-muted">
            {planTitle} {anyTrial && trialAvailable ? t("Every paid plan starts with a free trial, and prices are in taka.") : t("Prices are in taka.")}
          </p>
        </div>
        {hasYearly && (
          <div role="group" aria-label={t("Billing period")} className="flex w-fit items-center gap-0.5 rounded-full border border-line-card bg-surface p-1">
            <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)} className={cn("h-9 rounded-full px-4.5 text-body font-semibold whitespace-nowrap", !yearly ? "bg-forest text-white" : "text-ink-soft hover:text-ink")}>
              {t("Monthly")}
            </button>
            <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)} className={cn("flex h-9 items-center gap-2 rounded-full pr-2 pl-4.5 text-body font-semibold whitespace-nowrap", yearly ? "bg-forest text-white" : "text-ink-soft hover:text-ink")}>
              {t("Yearly")}
              {saving > 0 && <span className={cn("rounded-full px-2.25 py-0.75 text-caption font-semibold text-forest", yearly ? "bg-mint-200" : "bg-mint-50 text-brand-ink")}>{t("Save {amount}", { amount: money(saving) })}</span>}
            </button>
          </div>
        )}
      </div>

      {overview.pendingPayment && <PendingPaymentCard payment={overview.pendingPayment} readOnly={readOnly} onCancelled={() => router.refresh()} />}

      {state !== "free" && <CurrentPlanCard subscription={subscription} plan={plans.plans.find((plan) => plan.id === subscription.planId) ?? null} readOnly={readOnly} busy={isPending} onPay={(plan) => setCheckoutPlan(plan)} onCancel={() => setConfirmFree(true)} onResume={() => setCancel(false)} />}

      {overview.referralDiscount && (
        <div className="flex items-center gap-3 rounded-card border border-emerald-line bg-emerald-soft px-4 py-3 text-small text-ink-2 md:px-5.5">
          <Gift className="size-4.5 shrink-0 text-emerald" aria-hidden="true" />
          <span>{t("A friend invited you: you get {percent}% off your first paid plan. It's taken off when you pay.", { percent: formatCount(overview.referralDiscount.percent, fmt) })}</span>
        </div>
      )}

      <Card padding="none" className="grid items-center gap-4 px-4 py-4.5 md:grid-cols-[minmax(0,1fr)_auto] md:gap-6 md:px-5.5">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-ink">{t("Transactions this month on the {plan} plan", { plan: subscription.planName })}</h2>
            <span className="text-body whitespace-nowrap tabular-nums">
              <b className="font-bold text-ink">{formatCount(usage.transactionsThisMonth, fmt)}</b> {usage.transactionLimit >= 0 && <span className="text-ink-muted">{t("of {count}", { count: formatCount(usage.transactionLimit, fmt) })}</span>}
            </span>
          </div>
          {usage.transactionLimit >= 0 && (
            <div className="h-2 overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-valuenow={usage.transactionsThisMonth} aria-valuemin={0} aria-valuemax={usage.transactionLimit} aria-label={t("Transactions this month")}>
              <div className={cn("h-full rounded-full", tone === "over" ? "bg-expense-fill" : tone === "near" ? "bg-warning-fill" : "bg-emerald")} style={{ width: `${Math.max(usedPct, usage.transactionsThisMonth > 0 ? 2 : 0)}%` }} />
            </div>
          )}
          <span className={cn("text-[12.5px]", tone === "over" ? "text-expense" : "text-ink-muted")}>
            {usage.transactionLimit < 0
              ? t("No monthly limit on your plan.")
              : [
                  tone === "over" ? t("You've reached this month's limit. It starts again on {date}.", { date: day(usage.resetsOn, "d MMMM") }) : t("{count} left until {date}.", { count: formatCount(usage.transactionsLeft ?? 0, fmt), date: day(usage.resetsOn, "d MMMM") }),
                  noLimitFamily ? t("{plan} has no monthly limit.", { plan: noLimitFamily.name }) : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
          </span>
        </div>
        <div className="flex gap-6 border-line text-small max-md:border-t max-md:pt-3 md:border-l md:pl-6">
          <span className="flex flex-col gap-0.5">
            <span className="text-ink-muted">{t("Workspaces")}</span>
            <b className="text-[15px] font-semibold text-ink tabular-nums">{usage.workspaceLimit >= 0 ? t("{used} of {limit}", { used: formatCount(usage.workspaces, fmt), limit: formatCount(usage.workspaceLimit, fmt) }) : formatCount(usage.workspaces, fmt)}</b>
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-ink-muted">{t("PDF export")}</span>
            <b className="text-[15px] font-semibold text-ink">{t(usage.pdfExport ? "Included" : "Not included")}</b>
          </span>
        </div>
      </Card>

      <div className={cn("grid gap-4", families.length >= 3 ? "lg:grid-cols-3" : "md:grid-cols-2")}>
        {families.map((family) => {
          const plan = familyPlan(family, yearly);
          if (!plan) return null;
          const isHero = family === hero;
          const key = family.name.toLowerCase();
          const Icon = ICONS[family.free ? "free" : key] ?? Star;
          const action = cta(family, plan);
          const isCurrentFamily = family === currentFamily && state !== "ended";
          const price = Number(plan.price);
          const tag = isCurrentFamily ? t("Your plan") : !family.free && trialAvailable && plan.trialDays > 0 ? t("{days}-day free trial", { days: formatCount(plan.trialDays, fmt) }) : null;
          const note = family.free
            ? t("No trial needed")
            : plan.billingCycle === "YEARLY"
              ? t("About {amount} a month, paid once a year", { amount: money(Math.round(price / 12)) })
              : yearly && hasYearly && !family.yearly
                ? t("{plan} is billed monthly only", { plan: family.name })
                : t("Paid every month");
          const limit = plan.featureLimits.maxTransactionsPerMonth ?? -1;
          const blurb = family.free
            ? limit >= 0
              ? t("One workspace and up to {count} transactions a month.", { count: formatCount(limit, fmt) })
              : t("One workspace to start with.")
            : t(BLURBS[key] ?? "Everything this plan includes is listed below.");
          return (
            <section
              key={family.name}
              aria-label={t("{plan} plan", { plan: plan.name })}
              className={cn("relative flex flex-col gap-4.5 overflow-hidden rounded-[22px] border p-5 md:p-6", isHero ? "border-forest bg-forest text-white shadow-[0_12px_32px_rgba(15,63,56,0.26)]" : cn("border-line-card bg-surface text-ink", CARD_SHADOW))}
            >
              {isHero && (
                <svg aria-hidden="true" className="pointer-events-none absolute -top-12 -right-12 size-44 text-mint-200/20" viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="14" />
                </svg>
              )}
              <div className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-2.5">
                  <span className={cn("flex size-10 items-center justify-center rounded-full [&_svg]:size-5", isHero ? "bg-mint-200/16 text-mint-200" : family.free ? "bg-surface-sunken text-ink-soft" : "bg-warning-soft text-warning")}>
                    <Icon aria-hidden="true" />
                  </span>
                  <h2 className="text-h3">{plan.name}</h2>
                </span>
                {tag && <span className={cn("rounded-full px-2.5 py-1 text-caption font-semibold whitespace-nowrap", isHero ? "bg-mint-200 text-forest" : isCurrentFamily || family.free ? "bg-surface-sunken text-ink-soft" : "bg-warning-soft text-warning-ink")}>{tag}</span>}
              </div>
              <div className="relative flex flex-col gap-1">
                <span className="flex items-baseline gap-1.5">
                  <span className="text-[34px] font-bold tracking-[-0.03em] tabular-nums md:text-[38px]">{money(price)}</span>
                  {!family.free && <span className={cn("text-body", isHero ? "text-mint-200" : "text-ink-muted")}>{t(plan.billingCycle === "YEARLY" ? "a year" : "a month")}</span>}
                </span>
                <span className={cn("text-small", isHero ? "text-mint-200" : "text-ink-muted")}>{note}</span>
              </div>
              <span className={cn("relative text-body leading-[1.45]", isHero ? "text-mint-200" : "text-ink-muted")}>{blurb}</span>
              <ul className="relative flex flex-1 flex-col gap-2.5">
                {FEATURE_ROWS.map((row) => {
                  const value = featureValue(plan.featureLimits, row.key);
                  const off = featureMissing(value);
                  return (
                    <li key={row.key} className={cn("flex items-center gap-2.5 text-body", off ? (isHero ? "text-mint-200/70" : "text-ink-faint") : isHero ? "text-white" : "text-ink-2")}>
                      <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full [&_svg]:size-3", off ? (isHero ? "bg-mint-200/14" : "bg-surface-sunken") : isHero ? "bg-mint-200 text-forest" : "bg-mint-50 text-emerald")}>
                        {off ? <X strokeWidth={2.5} aria-hidden="true" /> : <Check strokeWidth={3} aria-hidden="true" />}
                      </span>
                      <span className="flex-1">
                        {t(row.label)}
                        {off && <span className="sr-only"> ({t("not included")})</span>}
                      </span>
                      {(value.kind === "count" && value.value > 0) || value.kind === "unlimited" ? <span className="font-semibold tabular-nums">{featureText(value)}</span> : null}
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={action.onClick}
                disabled={action.disabled || isPending || (readOnly && !action.disabled)}
                aria-disabled={action.disabled || undefined}
                className={cn(
                  "relative flex h-11.5 items-center justify-center gap-2 rounded-full text-[14.5px] font-semibold whitespace-nowrap transition-colors",
                  action.disabled ? "cursor-default border border-line bg-strip text-ink-faint" : isHero ? "bg-mint-200 text-forest hover:bg-white" : "bg-emerald text-on-action shadow-button hover:bg-emerald-hover",
                  !action.disabled && "disabled:opacity-60",
                )}
              >
                {action.busy && <Loader size={16} />}
                {action.label}
              </button>
            </section>
          );
        })}
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 pt-4.5 pb-3 md:px-5.5">
          <h2 className="text-title font-semibold text-ink">{t("Compare plans")}</h2>
          {hero?.monthly && hero.yearly && <span className="text-[12.5px] text-ink-muted">{t("{monthly} and {yearly} include the same things", { monthly: hero.monthly.name, yearly: hero.yearly.name })}</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-140 border-collapse text-body">
            <caption className="sr-only">{t("What each plan includes")}</caption>
            <thead>
              <tr className="bg-table-head text-[12.5px] text-ink-muted">
                <th scope="col" className="px-4 py-2.5 text-left font-medium md:px-5.5">
                  {t("Feature")}
                </th>
                {families.map((family) => (
                  <th key={family.name} scope="col" className={cn("w-45 px-3 py-2.5 text-center", family === hero ? "bg-emerald-soft font-semibold text-forest dark:text-mint-200" : "font-medium")}>
                    {family.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row) => (
                <tr key={row.key} className="border-t border-divider">
                  <th scope="row" className="px-4 py-3 text-left font-medium text-ink md:px-5.5">
                    {t(row.label)}
                  </th>
                  {families.map((family) => {
                    const plan = familyPlan(family, yearly);
                    const value = plan ? featureValue(plan.featureLimits, row.key) : ({ kind: "no" } as FeatureValue);
                    const isHero = family === hero;
                    return (
                      <td key={family.name} className={cn("px-3 py-3 text-center tabular-nums", isHero && "bg-emerald-soft/50 font-semibold", value.kind === "yes" ? (isHero ? "text-brand-ink" : "text-emerald") : value.kind === "no" ? "text-ink-faint" : "text-ink")}>
                        {cell(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card padding="none" className="flex flex-col gap-3 px-4 py-4.5 md:px-5.5">
          <h2 className="text-[15px] font-semibold text-ink">{t("How you can pay")}</h2>
          <div className="flex flex-wrap gap-2">
            <span className="flex h-9 items-center rounded-full bg-rose-soft px-3.5 text-[13.5px] font-semibold text-rose">bKash</span>
            <span className="flex h-9 items-center rounded-full bg-orange-soft px-3.5 text-[13.5px] font-semibold text-orange">Nagad</span>
            <span className="flex h-9 items-center gap-1.5 rounded-full bg-info-soft px-3.5 text-[13.5px] font-semibold text-info-ink">{t("Card · SSLCommerz")}</span>
          </div>
          <span className="text-[12.5px] text-ink-muted">{t("You pick one when you pay. There's no online payment yet: you send the money, and our team turns your plan on once it arrives.")}</span>
        </Card>
        <Card padding="none" className="flex flex-col gap-2.5 px-4 py-4.5 md:px-5.5">
          <form onSubmit={applyCoupon} className="flex flex-col gap-2.5">
            <label htmlFor="cp-code" className="text-[15px] font-semibold text-ink">
              {t("Have a coupon?")}
            </label>
            <div className="flex gap-2">
              <input
                id="cp-code"
                value={couponCode}
                onChange={(event) => {
                  setCouponCode(event.target.value.toUpperCase());
                  setCouponError(null);
                }}
                placeholder={t("e.g. WELCOME20")}
                maxLength={64}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={couponError ? true : undefined}
                aria-describedby="cp-code-hint"
                className={cn("h-11 min-w-0 flex-1 rounded-field border bg-surface px-3.5 text-body text-ink outline-none placeholder:text-ink-faint focus:border-focus-ring focus:focus-halo max-md:text-body-lg", couponError ? "border-expense" : "border-input")}
              />
              <Button type="submit" variant="secondary" disabled={!couponCode.trim() || checking} className="h-11 px-4.5">
                {checking && <Loader size={14} />}
                {t("Apply")}
              </Button>
            </div>
            <span id="cp-code-hint" role={couponError ? "alert" : undefined} className={cn("text-[12.5px]", couponError ? "text-expense" : coupon ? "font-medium text-emerald" : "text-ink-muted")}>
              {couponError ?? (coupon ? t("{code} works: {amount} off {plan}. It's used when you pay.", { code: coupon.code, amount: money(coupon.preview.discount), plan: coupon.plan }) : t("The discount shows on the next screen, before you pay."))}
            </span>
          </form>
        </Card>
      </div>

      {payments && payments.meta.total > 0 && <PaymentsCard initial={payments} />}

      <CheckoutDialog
        plan={checkoutPlan}
        onClose={() => setCheckoutPlan(null)}
        couponCode={coupon?.code ?? couponCode.trim()}
        referralPercent={overview.referralDiscount?.percent ?? null}
        onStarted={() => {
          setCheckoutPlan(null);
          router.refresh();
          window.scrollTo({ top: 0 });
          document.getElementById("main-content")?.scrollTo({ top: 0 });
        }}
      />
      <ConfirmDialog
        open={confirmFree}
        onClose={() => setConfirmFree(false)}
        onConfirm={() => setCancel(true)}
        isPending={isPending}
        title={t("Cancel your plan?")}
        description={subscription.currentPeriodEnd ? t("You keep {plan} until {date}, then you're on the Free plan. You can change your mind before then.", { plan: subscription.planName, date: day(subscription.currentPeriodEnd) }) : t("You go back to the Free plan when this period ends.")}
        confirmLabel={t("Cancel at the end")}
        cancelLabel={t("Keep my plan")}
      />
    </>
  );
}
