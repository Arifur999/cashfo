"use client";

import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { PLANS_ROUTE } from "@/lib/customer/nav";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export type CheckoutView = "pay" | "pending" | "done";

const TITLES: Record<CheckoutView, { title: string; sub: string }> = {
  pay: { title: "Complete your payment", sub: "Pick how you want to pay. Prices are in taka." },
  pending: { title: "Payment sent for checking", sub: "You can keep using Smartly while we check." },
  done: { title: "You're all set", sub: "Thank you for choosing Pro." },
};

// The Checkout board's head: the way back to Plans, the view's title, and
// where the customer is in Choose plan › Pay › Done (amber "Checking"
// while an admin checks the money).
export function CheckoutChrome({ view, children }: { view: CheckoutView; children: React.ReactNode }) {
  const { t, fmt } = useLocale();
  const current = view === "done" ? 2 : 1;
  const steps = [t("Choose plan"), view === "pending" ? t("Checking") : t("Pay"), t("Done")];
  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1.5">
          <Link href={PLANS_ROUTE} className="flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-emerald hover:text-emerald-hover">
            <ArrowLeft className="size-4" strokeWidth={2.2} aria-hidden="true" />
            {t("Back to plans")}
          </Link>
          <h1 className="text-[28px] leading-[1.2] font-semibold tracking-[-0.03em] text-ink">{t(TITLES[view].title)}</h1>
          <p className="text-[14px] text-ink-muted">{t(TITLES[view].sub)}</p>
        </div>
        <ol aria-label={t("Payment steps")} className="flex flex-wrap items-center gap-2">
          {steps.map((label, index) => {
            const past = index < current;
            const now = index === current;
            const amber = now && view === "pending";
            return (
              <Fragment key={index}>
                <li className="flex items-center gap-2" aria-current={now ? "step" : undefined}>
                  <span
                    className={cn(
                      "flex size-6.5 items-center justify-center rounded-full border text-[12.5px] font-bold",
                      past && "border-emerald bg-emerald text-white",
                      now && (amber ? "border-warning-fill bg-warning-fill text-white" : "border-forest bg-forest text-white"),
                      !past && !now && "border-input bg-surface text-ink-muted",
                    )}
                  >
                    {past ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : formatCount(index + 1, fmt)}
                  </span>
                  <span className={cn("text-[13.5px]", now ? "font-semibold text-ink" : past ? "font-medium text-emerald" : "font-medium text-ink-muted")}>{label}</span>
                </li>
                {index < steps.length - 1 && <li aria-hidden="true" className={cn("h-0.5 w-7 rounded-full", past ? "bg-emerald" : "bg-line")} />}
              </Fragment>
            );
          })}
        </ol>
      </div>
      {children}
    </>
  );
}
