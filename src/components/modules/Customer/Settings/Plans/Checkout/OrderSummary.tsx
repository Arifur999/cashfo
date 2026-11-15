"use client";

import { Crown, Lock, Mail, RefreshCw, Send, ShieldCheck, Tag } from "lucide-react";
import { useState } from "react";
import Loader from "@/components/shared/Loader";
import { formatCurrency } from "@/lib/customer/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export interface SummaryCoupon {
  code: string;
  // "৳ 382 off"
  label: string;
}

interface OrderSummaryProps {
  planName: string;
  // "1 Nov 2026 to 1 Nov 2027"
  period: string;
  price: number;
  // The coupon's (or the invited friend's) discount, when there is one.
  discount: { label: string; amount: number } | null;
  total: number;
  coupon: SummaryCoupon | null;
  couponError: string | null;
  checkingCoupon: boolean;
  onApplyCoupon: (code: string) => void;
  onRemoveCoupon: () => void;
  onCouponInput: () => void;
  cta: { label: string; icon: "lock" | "send"; ready: boolean; busy: boolean; hint: string; hintTone: "muted" | "warning"; onClick: () => void };
  readOnly: boolean;
}

// The Checkout board's order summary: the plan and the period it buys, a
// promo code, the price and what's taken off, the total and the one
// button. Until what it needs is filled in the button looks off but still
// answers: a press shows what is missing.
export function OrderSummary({ planName, period, price, discount, total, coupon, couponError, checkingCoupon, onApplyCoupon, onRemoveCoupon, onCouponInput, cta, readOnly }: OrderSummaryProps) {
  const { t, fmt } = useLocale();
  const [code, setCode] = useState("");
  const money = (amount: number) => formatCurrency(amount, "BDT", fmt);
  const apply = () => {
    if (!code.trim()) return onApplyCoupon("");
    onApplyCoupon(code.trim());
  };
  const off = !cta.ready || cta.busy || readOnly;
  const CtaIcon = cta.icon === "lock" ? Lock : Send;

  return (
    <aside aria-labelledby="checkout-summary" className="flex flex-col gap-3.5 rounded-[20px] border border-line-card bg-surface p-5 shadow-card lg:sticky lg:top-4">
      <h2 id="checkout-summary" className="text-[16px] font-semibold text-ink">
        {t("Order summary")}
      </h2>
      <div className="flex items-center gap-3 rounded-[14px] bg-emerald-wash p-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-forest text-mint-200">
          <Crown className="size-4.75" strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <b className="text-[15px] font-bold text-ink">{t(planName)}</b>
          <span className="text-[12.5px] text-ink-muted">{period}</span>
        </span>
        <b className="text-[15px] font-bold text-ink tabular-nums">{money(price)}</b>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="checkout-code" className="text-[13.5px] font-semibold text-ink">
          {t("Promo code")}
        </label>
        {coupon ? (
          <div className="flex h-11 items-center gap-2.5 rounded-[10px] border border-mint-200 bg-emerald-soft pr-1.5 pl-3">
            <Tag className="size-4 text-brand-ink" strokeWidth={2} aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col leading-[1.2]">
              <b className="text-[13.5px] tracking-[0.03em] text-brand-ink" lang="en">
                {coupon.code}
              </b>
              <span className="text-[12px] text-ink-2">{coupon.label}</span>
            </span>
            <button type="button" onClick={onRemoveCoupon} disabled={readOnly} className="h-7.5 rounded-lg px-2.5 text-[12.5px] font-semibold text-brand-ink hover:bg-mint-50 disabled:opacity-60">
              {t("Remove")}
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                id="checkout-code"
                type="text"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  onCouponInput();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    apply();
                  }
                }}
                placeholder={t("e.g. WELCOME20")}
                maxLength={64}
                autoComplete="off"
                aria-invalid={couponError ? true : undefined}
                aria-describedby={couponError ? "checkout-code-error" : undefined}
                disabled={readOnly}
                className={cn(
                  "h-11 min-w-0 flex-1 rounded-[10px] border bg-surface px-3.5 text-[14.5px] font-semibold tracking-[0.02em] text-ink outline-none placeholder:font-medium placeholder:text-ink-faint focus-visible:ring-2 focus-visible:ring-focus-ring/40 disabled:opacity-60",
                  couponError ? "border-expense-fill" : "border-input",
                )}
              />
              <button
                type="button"
                onClick={apply}
                disabled={readOnly || checkingCoupon}
                className="flex h-11 items-center gap-2 rounded-[10px] border border-input bg-surface px-4 text-[14px] font-semibold text-ink hover:bg-surface-sunken disabled:opacity-60"
              >
                {checkingCoupon && <Loader size={14} label={t("Loading...")} />}
                {t("Apply")}
              </button>
            </div>
            {couponError && (
              <span id="checkout-code-error" role="alert" className="text-[12.5px] text-expense">
                {couponError}
              </span>
            )}
          </>
        )}
      </div>

      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 border-t border-divider pt-1 text-[14px]">
        <dt className="pt-2.5 text-ink-muted">{t("Price")}</dt>
        <dd className="pt-2.5 text-right text-ink tabular-nums">{money(price)}</dd>
        {discount && (
          <>
            <dt className="text-ink-muted">{discount.label}</dt>
            <dd className="text-right font-semibold text-emerald tabular-nums">− {money(discount.amount)}</dd>
          </>
        )}
      </dl>
      <div className="flex items-baseline justify-between border-t border-dashed border-input pt-3">
        <span className="text-[15px] font-semibold text-ink">{t("Total to pay")}</span>
        <b className="text-[28px] font-bold tracking-[-0.02em] text-ink tabular-nums">{money(total)}</b>
      </div>

      <button
        type="button"
        onClick={() => !cta.busy && !readOnly && cta.onClick()}
        aria-disabled={off || undefined}
        aria-describedby="checkout-cta-hint"
        className={cn(
          "flex h-13 items-center justify-center gap-2 rounded-full text-[15.5px] font-semibold transition-colors",
          off ? "bg-input text-white dark:text-ink-faint" : "bg-forest text-white hover:bg-forest-hover",
        )}
      >
        {cta.busy ? <Loader size={16} onDark label={t("Loading...")} /> : <CtaIcon className="size-4.25" strokeWidth={2.2} aria-hidden="true" />}
        {cta.label}
      </button>
      <span id="checkout-cta-hint" className={cn("text-center text-[12.5px]", cta.hintTone === "warning" ? "text-warning" : "text-ink-muted")}>
        {cta.hint}
      </span>

      <ul className="flex flex-col gap-2.25 border-t border-divider pt-3">
        {[
          { icon: ShieldCheck, text: t("We never see your card number or PIN") },
          { icon: RefreshCw, text: t("Nothing renews by itself") },
          { icon: Mail, text: t("Receipt sent to your email") },
        ].map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2.25 text-[12.5px] text-ink-2">
            <Icon className="size-3.75 shrink-0 text-emerald" strokeWidth={2} aria-hidden="true" />
            {text}
          </li>
        ))}
      </ul>
    </aside>
  );
}
