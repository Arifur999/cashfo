"use client";

import { CreditCard, Info, Lock, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { checkoutAction, previewCouponAction, uploadPaymentProofAction } from "@/lib/customer/billingActions";
import { couponProblem, paidPlans, yearlyDeal, type BillingOverview, type BillingPlan, type BillingPlans, type CouponPreview } from "@/lib/customer/billingDisplay";
import { checkoutPeriod, cleanReference, offeredWallets, payerOk, referenceOk, referralDiscount } from "@/lib/customer/checkoutDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { CHECKOUT_ROUTE } from "@/lib/customer/nav";
import { formatDate } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { checkoutHref } from "../checkoutRoute";
import { ManualPanel, type ManualForm } from "./ManualPanel";
import { OrderSummary } from "./OrderSummary";

interface PayViewProps {
  plans: BillingPlans;
  overview: BillingOverview;
  planId: string;
  // Said above the form: an earlier payment that didn't go through.
  notice: string | null;
}

const CARD = "flex flex-col rounded-card border border-line-card bg-surface px-5 shadow-card";

// A radio card's frame and dot (the Checkout board's plan and way to pay).
const optionClass = (on: boolean) => cn("flex rounded-[14px] p-3.5 text-left transition-colors", on ? "border-2 border-emerald bg-sel-wash" : "border border-line bg-surface hover:border-input");
const RadioDot = ({ on, off = false }: { on: boolean; off?: boolean }) => (
  <span aria-hidden="true" className={cn("block size-5 shrink-0 rounded-full bg-surface", on ? "border-[6px] border-emerald" : "border-[1.5px] border-ink-faint", off && "opacity-50")} />
);

// Checkout's form (Checkout board): 1. the plan, 2. how to pay -- online
// through a gateway (off until one is set up) or sending the money
// yourself -- and the order summary with a promo code. Sending it yourself
// goes straight to checking with the number and the TrxID.
export function PayView({ plans, overview, planId: initialPlanId, notice }: PayViewProps) {
  const { t, fmt, locale } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const readOnly = Boolean(user.impersonatedBy);
  const options = paidPlans(plans.plans);
  const online = plans.onlineCheckout === true;
  const wallets = offeredWallets(plans.paymentAccounts);

  const [planId, setPlanId] = useState(initialPlanId);
  const [method, setMethod] = useState<"online" | "manual">(online ? "online" : "manual");
  const [form, setForm] = useState<ManualForm>({ wallet: wallets[0].id, from: "", trx: "", shot: null });
  const [tried, setTried] = useState(false);
  const [coupon, setCoupon] = useState<{ code: string; preview: CouponPreview } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checking, startChecking] = useTransition();
  const [busy, startSubmit] = useTransition();
  // The plan a coupon check is for; a late answer for another is dropped.
  const shownPlan = useRef(initialPlanId);

  const plan = options.find((option) => option.id === planId) ?? options[0];
  const money = (amount: number | string) => formatCurrency(amount, "BDT", fmt);
  const day = (date: Date) => formatDate(date.toISOString(), "d MMM yy", "", fmt);

  const price = Number(plan.price);
  const friendPercent = overview.referralDiscount?.percent ?? null;
  let discount: { label: string; amount: number } | null = null;
  if (coupon && Number(coupon.preview.discount) > 0) {
    discount = { label: coupon.preview.discountSource === "REFERRAL" ? t("Referral discount") : t("Promo discount"), amount: Number(coupon.preview.discount) };
  } else if (!coupon && referralDiscount(price, friendPercent) > 0) {
    discount = { label: t("Referral discount"), amount: referralDiscount(price, friendPercent) };
  }
  // With a coupon the API's own total; otherwise the friend's discount as
  // the API works it out.
  const total = coupon ? Number(coupon.preview.finalAmount) : Math.max(0, Math.round((price - (discount?.amount ?? 0)) * 100) / 100);
  const period = checkoutPeriod(overview.subscription, plan);

  function preview(code: string, forPlan: BillingPlan, onPlanChange: boolean) {
    shownPlan.current = forPlan.id;
    startChecking(async () => {
      const result = await previewCouponAction(forPlan.id, code);
      // Another plan was picked meanwhile: its own check answers.
      if (shownPlan.current !== forPlan.id) return;
      if (result.success && result.data?.valid) {
        setCoupon({ code: code.toUpperCase(), preview: result.data });
        setCouponError(null);
        return;
      }
      setCoupon(null);
      if (onPlanChange) setCouponError(t("{code} doesn't work on {plan}, so we took it off.", { code: code.toUpperCase(), plan: t(forPlan.name) }));
      else setCouponError(t(result.success ? couponProblem(result.data?.reason) : (result.message ?? "Couldn't check that coupon")));
    });
  }

  function choosePlan(next: BillingPlan) {
    if (next.id === plan.id) return;
    setPlanId(next.id);
    shownPlan.current = next.id;
    if (coupon) preview(coupon.code, next, true);
  }

  function submit() {
    if (readOnly) return;
    if (method === "manual" && !(payerOk(form.wallet, form.from) && referenceOk(form.wallet, form.trx))) {
      setTried(true);
      return;
    }
    startSubmit(async () => {
      const result = await checkoutAction({
        planId: plan.id,
        gateway: method === "online" ? "CARD" : form.wallet,
        couponCode: coupon?.code,
        ...(method === "manual" && { payerAccount: form.from.trim(), reference: cleanReference(form.trx) }),
      });
      if (!result.success || !result.data) {
        if (result.reason === "PAYMENT_BEING_CHECKED") {
          toast.info(t("A payment you sent is still being checked"));
          router.replace(CHECKOUT_ROUTE);
          return;
        }
        if (result.reason && result.reason !== "THROTTLED" && result.reason !== "REFERENCE_USED") {
          setCoupon(null);
          setCouponError(t(couponProblem(result.reason)));
          return;
        }
        toast.error(t(result.message ?? "Couldn't start the payment"));
        return;
      }
      const payment = result.data;
      if (payment.next.kind === "redirect") {
        window.location.assign(payment.next.url);
        return;
      }
      if (method === "manual" && form.shot) {
        const body = new FormData();
        body.append("screenshot", form.shot);
        const upload = await uploadPaymentProofAction(payment.paymentId, body);
        if (!upload.success) toast.error(t("Your payment details were sent, but the screenshot didn't upload. You can add it with Fix the details."));
      }
      router.replace(checkoutHref({ payment: payment.paymentId }));
    });
  }

  const manualReady = payerOk(form.wallet, form.from) && referenceOk(form.wallet, form.trx);
  const cta =
    method === "online"
      ? { label: t("Pay {amount}", { amount: money(total) }), icon: "lock" as const, ready: true, hint: t("You finish on the secure SSLCommerz page"), hintTone: "muted" as const }
      : {
          label: t("Submit for checking"),
          icon: "send" as const,
          ready: manualReady,
          hint: manualReady ? t("Pro turns on once we confirm it") : t("Send the money first, then fill in both boxes"),
          hintTone: manualReady ? ("muted" as const) : ("warning" as const),
        };

  const account = plans.paymentAccounts?.[form.wallet] ?? null;
  const instructionText = (() => {
    if (account || !plans.manualInstructions) return null;
    const template = locale === "bn" ? plans.manualInstructions.bn : plans.manualInstructions.en;
    const values: Record<string, string> = { amount: money(total), method: form.wallet === "BANK" ? t("Bank") : (wallets.find((w) => w.id === form.wallet)?.name ?? ""), reference: user.phone ?? user.name };
    return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
  })();

  return (
    <div className="grid items-start gap-4.5 lg:grid-cols-[minmax(0,1fr)_390px]">
      <div className="flex min-w-0 flex-col gap-4">
        {notice && (
          <div role="status" className="flex items-start gap-2.5 rounded-[12px] border border-warning-line bg-warning-50 px-3.5 py-3 text-[13.5px] leading-normal text-warning-ink">
            <Info className="mt-px size-4.5 shrink-0 text-warning" strokeWidth={2} aria-hidden="true" />
            {notice}
          </div>
        )}

        <section aria-labelledby="checkout-plan" className={cn(CARD, "gap-3 py-4.5")}>
          <h2 id="checkout-plan" className="text-[16px] font-semibold text-ink">
            {t("1. Your plan")}
          </h2>
          <div role="radiogroup" aria-labelledby="checkout-plan" className="grid gap-2.5 sm:grid-cols-2">
            {options.map((option) => {
              const on = option.id === plan.id;
              const deal = yearlyDeal(option, plans.plans);
              const yearly = option.billingCycle === "YEARLY";
              return (
                <button key={option.id} type="button" role="radio" aria-checked={on} onClick={() => choosePlan(option)} disabled={busy} className={cn(optionClass(on), "items-center gap-3")}>
                  <RadioDot on={on} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <b className="text-[15px] font-bold text-ink">{t(option.name)}</b>
                    <span className="text-[12.5px] text-ink-muted">
                      {deal
                        ? t("{percent}% off · about {amount} a month", { percent: formatCount(deal.percentOff, fmt), amount: money(deal.perMonth) })
                        : yearly
                          ? t("One year at a time")
                          : t("One month at a time")}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-0.75">
                    <b className="text-[16px] font-bold whitespace-nowrap text-ink tabular-nums">
                      {money(option.price)}
                      {yearly ? t(" / year") : t(" / month")}
                    </b>
                    {deal && deal.twelveMonths - Number(option.price) > 0 && (
                      <span className="rounded-full bg-warning-soft px-1.75 py-px text-[11.5px] font-bold text-warning-ink">{t("Save {amount}", { amount: money(Math.round(deal.twelveMonths - Number(option.price))) })}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="checkout-how" className={cn(CARD, "gap-3.5 pt-4.5 pb-5")}>
          <h2 id="checkout-how" className="text-[16px] font-semibold text-ink">
            {t("2. How do you want to pay?")}
          </h2>
          <div role="radiogroup" aria-labelledby="checkout-how" className="grid gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              role="radio"
              aria-checked={method === "online"}
              aria-disabled={!online || undefined}
              onClick={() => online && setMethod("online")}
              className={cn(optionClass(method === "online"), "items-start gap-3", !online && "cursor-not-allowed hover:border-line")}
            >
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-info-soft text-info-ink", !online && "opacity-60")}>
                <CreditCard className="size-5" strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <b className={cn("text-[15px] font-bold whitespace-nowrap", online ? "text-ink" : "text-ink-muted")}>{t("Pay online")}</b>
                  <span className={cn("rounded-full px-2 py-px text-[11.5px] font-bold whitespace-nowrap", online ? "bg-mint-50 text-brand-ink" : "bg-surface-sunken text-ink-muted")}>{online ? t("Instant") : t("Soon")}</span>
                </span>
                <span className="text-[12.5px] leading-[1.45] text-ink-soft">
                  {online ? t("Card, bKash, Nagad, Rocket or net banking through SSLCommerz. Pro turns on right away.") : t("Paying by card or online banking is coming soon. Send the money yourself for now.")}
                </span>
              </span>
              <span className="mt-0.5">
                <RadioDot on={method === "online"} off={!online} />
              </span>
            </button>
            <button type="button" role="radio" aria-checked={method === "manual"} onClick={() => setMethod("manual")} className={cn(optionClass(method === "manual"), "items-start gap-3")}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-rose-soft text-rose">
                <Send className="size-5" strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center gap-2">
                  <b className="text-[15px] font-bold whitespace-nowrap text-ink">{t("Send money yourself")}</b>
                  <span className="rounded-full bg-warning-soft px-2 py-px text-[11.5px] font-bold whitespace-nowrap text-due-ink">{t("2 hours")}</span>
                </span>
                <span className="text-[12.5px] leading-[1.45] text-ink-2">{t("Send from bKash, Nagad, Rocket or your bank, then give us the TrxID.")}</span>
              </span>
              <span className="mt-0.5">
                <RadioDot on={method === "manual"} />
              </span>
            </button>
          </div>

          {method === "online" ? (
            <div className="flex flex-col gap-3 rounded-[14px] border border-mint-50 bg-emerald-wash p-4">
              <div className="flex items-start gap-2.5">
                <Lock className="mt-px size-4.5 shrink-0 text-emerald" strokeWidth={2} aria-hidden="true" />
                <span className="text-[13.5px] leading-normal text-ink">{t("You'll finish on SSLCommerz's secure page and come straight back here. We never see your card number or PIN.")}</span>
              </div>
              <div className="flex flex-wrap gap-1.5" lang="en">
                {[
                  ["Visa", "text-info-ink"],
                  ["Mastercard", "text-expense"],
                  ["Amex", "text-sky"],
                  ["bKash", "text-gateway-bkash"],
                  ["Nagad", "text-gateway-nagad"],
                  ["Rocket", "text-gateway-rocket"],
                  ["Upay", "text-info-ink"],
                ].map(([name, tone]) => (
                  <span key={name} className={cn("flex h-7 items-center rounded-lg border border-line bg-surface px-2.5 text-[12.5px] font-semibold", tone)}>
                    {name}
                  </span>
                ))}
                <span className="flex h-7 items-center rounded-lg border border-line bg-surface px-2.5 text-[12.5px] font-semibold text-ink-2">{t("Net banking")}</span>
              </div>
              <span className="text-[12.5px] text-ink-soft">{t("Nothing renews by itself. We remind you 3 days before your plan ends.")}</span>
            </div>
          ) : (
            <ManualPanel
              wallets={wallets}
              account={account}
              instructions={instructionText}
              amount={total}
              amountText={money(total)}
              reference={user.phone ? { label: t("Your phone"), value: user.phone, byPhone: true } : { label: t("Your name"), value: user.name, byPhone: false }}
              form={form}
              onChange={(next) => {
                setForm((current) => ({ ...current, ...next }));
                if (next.wallet) setTried(false);
              }}
              tried={tried}
              readOnly={readOnly || busy}
              namePlaceholder={user.name}
            />
          )}
        </section>
      </div>

      <OrderSummary
        planName={plan.name}
        period={t("{start} to {end}", { start: day(period.start), end: day(period.end) })}
        price={price}
        discount={discount}
        total={total}
        coupon={coupon && { code: coupon.code, label: coupon.preview.discountSource === "COUPON" ? t("{amount} off", { amount: money(coupon.preview.couponDiscount) }) : t("Your referral discount is bigger, so it applies instead") }}
        couponError={couponError}
        checkingCoupon={checking}
        onApplyCoupon={(code) => (code ? preview(code, plan, false) : setCouponError(t("Type a code first.")))}
        onRemoveCoupon={() => {
          setCoupon(null);
          setCouponError(null);
        }}
        onCouponInput={() => setCouponError(null)}
        cta={{ ...cta, busy, onClick: submit }}
        readOnly={readOnly}
      />
    </div>
  );
}
