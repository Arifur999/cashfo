"use client";

import { CreditCard, Info } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Input from "@/components/smartly/form/Input";
import { checkoutAction, previewCouponAction } from "@/lib/customer/billingActions";
import { couponProblem, GATEWAYS, type BillingPlan, type CouponPreview, type Gateway } from "@/lib/customer/billingDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { SettingsDialog } from "../SettingsDialog";

interface CheckoutDialogProps {
  // The plan being paid for; null while closed.
  plan: BillingPlan | null;
  onClose: () => void;
  // A coupon typed on the page, tried again here for this plan.
  couponCode: string;
  // A referred customer's first-purchase discount.
  referralPercent: number | null;
  // The payment is open: the page shows its steps.
  onStarted: () => void;
}

// The gateway's own colours, as "How you can pay" draws them.
const GATEWAY_TONE: Record<Gateway, string> = {
  BKASH: "bg-rose-soft text-rose",
  NAGAD: "bg-orange-soft text-orange",
  CARD: "bg-info-soft text-info-ink",
};

// Paying for a plan: the price (and any discount), how you'll send the
// money, and a coupon. Continue opens the payment and the page shows the
// steps; nothing is charged here.
export function CheckoutDialog({ plan, onClose, couponCode, referralPercent, onStarted }: CheckoutDialogProps) {
  const { t, fmt } = useLocale();
  const [gateway, setGateway] = useState<Gateway>("BKASH");
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<CouponPreview | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [checking, startChecking] = useTransition();
  const open = plan !== null;
  const money = (amount: number | string) => formatCurrency(amount, "BDT", fmt);

  function check(next: string, forPlan: BillingPlan) {
    const trimmed = next.trim();
    if (!trimmed) return;
    setProblem(null);
    startChecking(async () => {
      const result = await previewCouponAction(forPlan.id, trimmed);
      if (result.success && result.data?.valid) setPreview(result.data);
      else {
        setPreview(null);
        setProblem(t(result.success ? couponProblem(result.data?.reason) : (result.message ?? "Couldn't check that coupon")));
      }
    });
  }

  const [prevPlan, setPrevPlan] = useState<BillingPlan | null>(null);
  if (plan !== prevPlan) {
    setPrevPlan(plan);
    if (plan) {
      setGateway("BKASH");
      setCode(couponCode);
      setPreview(null);
      setProblem(null);
    }
  }

  // A coupon from the page is tried for this plan as the dialog opens.
  useEffect(() => {
    const trimmed = couponCode.trim();
    if (!plan || !trimmed) return;
    let live = true;
    void previewCouponAction(plan.id, trimmed).then((result) => {
      if (!live) return;
      if (result.success && result.data?.valid) setPreview(result.data);
      else setProblem(t(result.success ? couponProblem(result.data?.reason) : (result.message ?? "Couldn't check that coupon")));
    });
    return () => {
      live = false;
    };
  }, [plan, couponCode, t]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!plan || isPending) return;
    setProblem(null);
    startTransition(async () => {
      const result = await checkoutAction({ planId: plan.id, gateway, couponCode: preview ? code : undefined });
      if (result.success && result.data) {
        toast.success(t("Payment started. Send {amount} as shown, with reference {reference}.", { amount: money(result.data.amount), reference: result.data.displayId }));
        onStarted();
      } else {
        setProblem(t(result.reason && result.reason !== "THROTTLED" && result.status === 400 ? couponProblem(result.reason) : (result.message ?? "Couldn't start the payment")));
      }
    });
  }

  const list = plan ? Number(plan.price) : 0;
  const discount = preview ? Number(preview.discount) : 0;
  const total = preview ? Number(preview.finalAmount) : list;

  return (
    <SettingsDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width="md"
      onSubmit={submit}
      title={plan ? t("Pay for {plan}", { plan: plan.name }) : ""}
      description={plan ? t(plan.billingCycle === "YEARLY" ? "{price} a year" : "{price} a month", { price: money(list) }) : undefined}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="px-3.5">
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={isPending || checking} className="px-4.5">
            {isPending && <Loader onDark />}
            {t("Continue")}
          </Button>
        </>
      }
    >
      <dl className="flex flex-col gap-2 rounded-md border border-line bg-strip px-4 py-3 text-body tabular-nums">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">{t("Plan price")}</dt>
          <dd className="text-ink">{money(list)}</dd>
        </div>
        {preview && discount > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">{preview.discountSource === "REFERRAL" ? t("Friend's discount") : t("Coupon {code}", { code: code.trim() })}</dt>
            <dd className="text-emerald">− {money(discount)}</dd>
          </div>
        )}
        {!preview && referralPercent && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">{t("Friend's discount")}</dt>
            <dd className="text-emerald">{t("{percent}% off", { percent: formatCount(referralPercent, fmt) })}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3 border-t border-line pt-2 font-semibold">
          <dt className="text-ink">{t("You pay")}</dt>
          <dd className="text-ink">{!preview && referralPercent ? t("Worked out on the next step") : money(total)}</dd>
        </div>
      </dl>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-body font-medium text-ink">{t("How you'll pay")}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {GATEWAYS.map((option) => {
            const on = option.value === gateway;
            return (
              <label key={option.value} className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-field border px-3 text-small font-semibold transition-colors has-[:focus-visible]:focus-halo", on ? "border-emerald bg-emerald-soft text-ink" : "border-input bg-surface text-ink-2 hover:bg-surface-sunken")}>
                <input type="radio" name="gateway" value={option.value} checked={on} onChange={() => setGateway(option.value)} className="sr-only" />
                <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", GATEWAY_TONE[option.value])} aria-hidden="true">
                  {option.value === "CARD" ? <CreditCard className="size-3.5" /> : option.label.slice(0, 1)}
                </span>
                {t(option.label)}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="co-coupon" className="text-body font-medium text-ink">
          {t("Coupon")} <span className="font-normal text-ink-muted">({t("optional")})</span>
        </label>
        <div className="flex gap-2">
          <Input
            id="co-coupon"
            size="md"
            frameClassName="flex-1"
            value={code}
            onChange={(event) => {
              setCode(event.target.value.toUpperCase());
              setPreview(null);
              setProblem(null);
            }}
            placeholder={t("e.g. WELCOME20")}
            autoComplete="off"
            spellCheck={false}
            maxLength={64}
            invalid={Boolean(problem)}
          />
          <Button type="button" variant="secondary" onClick={() => plan && check(code, plan)} disabled={!code.trim() || checking} className="h-11 px-4">
            {checking && <Loader size={14} />}
            {t("Apply")}
          </Button>
        </div>
        {problem && (
          <p role="alert" className="text-caption text-expense">
            {problem}
          </p>
        )}
      </div>

      <div className="flex items-start gap-2.5 rounded-field border border-info-line bg-info-50 px-3.5 py-3 text-small leading-normal text-info-ink">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{t("There's no online payment yet. Next you'll see where to send the money and the reference to write with it. Our team turns your plan on once the payment arrives.")}</span>
      </div>
    </SettingsDialog>
  );
}
