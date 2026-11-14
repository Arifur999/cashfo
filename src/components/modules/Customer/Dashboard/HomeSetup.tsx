"use client";

import { Check, Plus, X } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { formatCurrency } from "@/lib/customer/currency";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CARD } from "./HomeHero";
import type { HomeData } from "./homeTypes";

interface Step {
  title: string;
  text: string;
  done: boolean;
  doneText: string;
  cta: string;
  // A page to open, or (no href) the transaction drawer.
  href?: string;
}

// Hiding the guide is this browser's own choice, per workspace.
const hiddenKey = (businessId: string) => `smartly.setupGuideHidden.${businessId}`;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
function readHidden(businessId: string): boolean {
  try {
    return window.localStorage.getItem(hiddenKey(businessId)) === "1";
  } catch {
    return false;
  }
}
function writeHidden(businessId: string) {
  try {
    window.localStorage.setItem(hiddenKey(businessId), "1");
  } catch {
    // Storage blocked: the guide just goes for this visit.
  }
  listeners.forEach((listener) => listener());
}

// "Set up your money in four steps": a new account's guide, each step
// ticked off as it is done, the next one in colour. Hidden with ×.
export function SetupGuide({ data, onAddTransaction }: { data: HomeData; onAddTransaction: () => void }) {
  const { t, fmt } = useLocale();
  const hidden = useSyncExternalStore(
    subscribe,
    () => readHidden(data.businessId),
    () => false,
  );
  const setup = data.setup;
  if (!setup || hidden) return null;

  const firstWallet = data.wallets[0];
  const steps: Step[] = [
    {
      title: "Add a wallet",
      text: "Cash, a bank account, bKash or Nagad.",
      done: setup.hasWallet,
      doneText: firstWallet ? t("{wallet} · {amount} added", { wallet: firstWallet.name, amount: formatCurrency(firstWallet.balance, data.currency, fmt) }) : t("Your wallet is in."),
      cta: "Add wallet",
      // ?new=1 asks My wallets to open its Add wallet drawer straight away.
      href: "/balance/accounts?new=1",
    },
    { title: "Add your first transaction", text: "Record an income or an expense to start tracking.", done: setup.hasTransaction, doneText: t("Your first one is in."), cta: "Add transaction" },
    { title: "Set a monthly budget", text: "Give each spending category a limit so you're warned early.", done: setup.hasBudget, doneText: t("Your budget is planned"), cta: "Set budget", href: "/categories" },
    {
      title: "Create a savings goal",
      text: "Save towards something that matters and track progress.",
      done: setup.hasGoal,
      doneText: t("Your savings goal is set"),
      cta: "Create goal",
      href: "/savings-goals/dashboard?new=1",
    },
  ];
  const done = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done);

  return (
    <section aria-labelledby="setup-title" className={cn(CARD, "flex flex-col gap-5 p-4 md:p-6")}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="setup-title" className="text-[18px] leading-[normal] font-semibold text-ink">
            {t("Set up your money in four steps")}
          </h2>
          <p className="text-body text-ink-muted">{t("Each step takes about a minute. You can come back to this anytime.")}</p>
        </div>
        <div className="flex items-center gap-3.5">
          <span className="text-[13px] leading-[normal] whitespace-nowrap text-ink-muted">
            <b className="font-semibold text-ink">{t("{done} of {total}@@setup", { done: formatCount(done, fmt), total: formatCount(steps.length, fmt) })}</b> {t("done@@setup")}
          </span>
          <span className="h-2 w-30 overflow-hidden rounded-full bg-surface-sunken max-md:grow">
            <span className="block h-full rounded-full bg-emerald" style={{ width: `${(done / steps.length) * 100}%` }} />
          </span>
          <button type="button" onClick={() => writeHidden(data.businessId)} aria-label={t("Hide setup guide")} title={t("Hide setup guide")} className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink">
            <X className="size-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-4">
        {steps.map((step, index) => {
          const isNext = step === next;
          const button = "mt-auto flex h-9 items-center gap-1.5 self-start rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors";
          const action =
            !step.done && data.canManage ? (
              step.href ? (
                <Link href={step.href} className={cn(button, isNext ? "bg-emerald text-on-action hover:bg-emerald-hover" : "border border-input bg-surface text-ink hover:bg-surface-sunken")}>
                  {isNext && <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />}
                  {t(step.cta)}
                </Link>
              ) : (
                <button type="button" onClick={onAddTransaction} className={cn(button, isNext ? "bg-emerald text-on-action hover:bg-emerald-hover" : "border border-input bg-surface text-ink hover:bg-surface-sunken")}>
                  {isNext && <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />}
                  {t(step.cta)}
                </button>
              )
            ) : null;
          return (
            <li
              key={step.title}
              aria-current={isNext ? "step" : undefined}
              className={cn(
                "flex min-h-47 flex-col gap-2.5 p-4.5",
                step.done ? "rounded-[14px] border border-line bg-table-head" : isNext ? "rounded-[14px] border-[1.5px] border-emerald bg-emerald-soft" : "rounded-card border border-line-card bg-surface shadow-card",
              )}
            >
              {step.done ? (
                <span className="flex size-7 items-center justify-center rounded-sm bg-emerald text-on-action">
                  <Check className="size-3.75" strokeWidth={3} aria-hidden="true" />
                </span>
              ) : (
                <span aria-hidden="true" className={cn("flex size-7 items-center justify-center rounded-full text-[13px] font-bold", isNext ? "bg-emerald text-on-action" : "bg-surface-sunken text-ink-soft")}>
                  {formatCount(index + 1, fmt)}
                </span>
              )}
              <span className="sr-only">{step.done ? `${t("Done")}: ` : isNext ? `${t("Next step")}: ` : ""}</span>
              <span className={cn("text-[15px] leading-[normal] font-semibold", step.done ? "text-ink-soft" : "text-ink")}>{t(step.title)}</span>
              <span className={cn("text-[13px] leading-normal", isNext ? "text-ink-soft" : "text-ink-muted")}>{step.done ? step.doneText : t(step.text)}</span>
              {step.done ? <span className="mt-auto self-start rounded-full bg-mint-50 px-2.5 py-0.75 text-caption font-semibold text-emerald">{t("Done")}</span> : action}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
