"use client";

import { ArrowRight, Gift, Lock, PauseCircle } from "lucide-react";
import Link from "next/link";
import Card from "@/components/smartly/Card";
import { formatCurrency } from "@/lib/customer/currency";
import { PLANS_ROUTE } from "@/lib/customer/nav";
import { programOf } from "@/lib/customer/referralDisplay";
import type { ReferralProgramInfo } from "@/lib/customer/referralTypes";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { StepTile, useProgramWords } from "./HowItWorksCard";

// "5 friends on Yearly Pro".
const EXAMPLE_FRIENDS = 5;

// The Referral Program for a member who can't earn yet and has nothing from
// it (ReferralLocked): why, and what one friend could earn on each paid
// plan; "See plans" opens the plans. While the admin has paused the program
// it says that instead, with no plans to buy.
export function ReferralLocked({ info, currency }: { info: ReferralProgramInfo; currency: string }) {
  const { t, fmt } = useLocale();
  const program = programOf(info);
  const { pct, lockedSteps } = useProgramWords(program, currency);
  const money = (value: string | number) => formatCurrency(value, currency, fmt);
  const paused = info.lockedReason === "PROGRAM_OFF";
  // Cheapest first, as the board lists them.
  const examples = [...program.examples].sort((a, b) => Number(a.price) - Number(b.price));
  const best = examples.reduce<(typeof examples)[number] | null>((top, plan) => (!top || Number(plan.youEarn) > Number(top.youEarn) ? plan : top), null);
  const planName = info.myPlan?.planName ?? "Free";
  // "Monthly Pro, Yearly Pro or Business", by price.
  const planList = examples.map((plan) => plan.planName);

  return (
    <div className="flex flex-col gap-5">
      <Card padding="none" className="grid overflow-hidden lg:grid-cols-[minmax(0,1fr)_420px]" aria-labelledby="rl-title" role="region">
        <div className="flex flex-col gap-4 p-5 md:p-8">
          <span aria-hidden="true" className="flex size-control-lg items-center justify-center rounded-[14px] bg-emerald-soft text-emerald">
            {paused ? <PauseCircle className="size-6.5" strokeWidth={1.75} /> : <Gift className="size-6.5" strokeWidth={1.75} />}
          </span>
          <div className="flex flex-col gap-2">
            <h2 id="rl-title" className="text-[22px] leading-[1.3] font-semibold tracking-[-0.01em] text-ink">
              {paused ? t("The Referral Program is paused") : t("Earn money by sharing Smartly")}
            </h2>
            <p className="max-w-140 text-[15px] leading-[1.6] text-ink-soft">
              {paused
                ? t("New commissions are paused for now. When the program is back, your invite link appears here.")
                : t("The Referral Program is for members on a paid plan. Once you are on {plans}, you get your own invite link. Every friend who buys a plan with it earns you {pct} of what they pay.", {
                    plans: planList.length > 1 ? t("{list} or {last}", { list: planList.slice(0, -1).join(", "), last: planList[planList.length - 1] }) : (planList[0] ?? t("a paid plan")),
                    pct: pct(program.commissionPct),
                  })}
            </p>
          </div>
          {!paused && (
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <Link href={PLANS_ROUTE} className="flex h-11 items-center gap-2 rounded-full bg-emerald px-5 text-[15px] font-semibold text-on-action shadow-button hover:bg-emerald-hover">
                {t("See plans")}
                <ArrowRight className="size-4" strokeWidth={2.25} aria-hidden="true" />
              </Link>
              <span className="flex items-center gap-1.5 text-[13px] text-ink-muted">
                <Lock className="size-3.75" aria-hidden="true" />
                {t("You're on the {plan} plan", { plan: planName })}
              </span>
            </div>
          )}
        </div>
        {examples.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-line bg-strip p-5 md:p-7 lg:border-t-0 lg:border-l">
            <h3 className="text-[15px] leading-normal font-semibold text-ink">{t("What one friend can earn you")}</h3>
            {examples.map((plan) => (
              <div key={plan.planId} className="flex items-center gap-3 rounded-card border border-line-card bg-surface px-3.5 py-3 shadow-card">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-body leading-normal font-semibold text-ink">{plan.planName}</span>
                  <span className="text-[12.5px] leading-normal text-ink-muted tabular-nums">
                    {t("{price} − {discount} = {pays} · you get {commission}", { price: money(plan.price), discount: pct(program.friendDiscountPct), pays: money(plan.friendPays), commission: pct(program.commissionPct) })}
                  </span>
                </div>
                <span className="text-[18px] leading-normal font-bold text-emerald tabular-nums">{money(plan.youEarn)}</span>
              </div>
            ))}
            {best && (
              <div className="flex items-center justify-between gap-3 rounded-field bg-emerald-soft px-3.5 py-3 text-[13.5px]">
                <span className="text-ink">{t("{count} friends on {plan}", { count: formatCount(EXAMPLE_FRIENDS, fmt), plan: best.planName })}</span>
                <b className="text-title font-bold text-emerald tabular-nums">{money(Number(best.youEarn) * EXAMPLE_FRIENDS)}</b>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card padding="none" aria-labelledby="rl-how" role="region" className="flex flex-col gap-4 px-5 py-5 md:px-6">
        <h2 id="rl-how" className="text-title text-ink">
          {t("How it works")}
        </h2>
        <div className={cn("grid gap-4 sm:grid-cols-2", "lg:grid-cols-4")}>
          {lockedSteps.map((step) => (
            <div key={step.title} className="flex gap-3">
              <StepTile icon={step.icon} size={32} />
              <span className="flex flex-col gap-0.75">
                <span className="text-body leading-normal font-semibold text-ink">{step.title}</span>
                <span className="text-[13px] leading-normal text-ink-muted">{step.body}</span>
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
