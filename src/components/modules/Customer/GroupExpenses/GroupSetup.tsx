"use client";

import { Check } from "lucide-react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ProgressBar from "@/components/smartly/ProgressBar";
import { formatCurrency } from "@/lib/customer/currency";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { GroupPageData, GroupView } from "./groupTypes";

interface GroupSetupProps {
  data: GroupPageData;
  view: GroupView;
  onAddMember: () => void;
  onSetBudget: () => void;
  onAddContribution: () => void;
  onAddExpense: () => void;
}

// How the group's bazar is shared, as its category says: at the meal rate,
// by each member's shares, or (like everything else) equally.
type BazarRule = "MEALS" | "SHARES" | "EQUAL";

const EXPENSE_STEP: Record<BazarRule, string> = {
  MEALS: "Bazar is shared at the meal rate and the rest equally. Whoever pays from their own pocket gets it credited.",
  SHARES: "Bazar is shared by each member's shares and the rest equally. Whoever pays from their own pocket gets it credited.",
  EQUAL: "Every cost is shared equally unless you choose otherwise. Whoever pays from their own pocket gets it credited.",
};

const SHARE_OF_COSTS: Record<BazarRule, string> = {
  MEALS: "your meals × the meal rate (bazar ÷ all meals), plus an equal part of the other costs. If bazar comes to ৳ 30,000 over 600 meals, the rate is ৳ 50, so 60 meals cost ৳ 3,000.",
  SHARES: "the bazar split by each member's shares, plus an equal part of the other costs. With ৳ 12,000 of bazar and shares of 3, 1 and 4, they pay ৳ 4,500, ৳ 1,500 and ৳ 6,000.",
  EQUAL: "everything spent in the month ÷ the members. If the month costs ৳ 40,000 and five people share it, each owes ৳ 8,000.",
};

// A brand-new group: four short steps, and how a balance is worked out.
// The dashboard takes over as soon as money is recorded.
export function GroupSetup({ data, view, onAddMember, onSetBudget, onAddContribution, onAddExpense }: GroupSetupProps) {
  const { t, locale } = useLocale();
  const names = view.activeMembers.map((m) => m.name);
  const listed = names.length > 3 ? t("{names} and {count} more", { names: names.slice(0, 3).join(", "), count: formatCount(names.length - 3, locale) }) : names.join(", ");
  // New groups get their bazar rule when created (NewGroupDrawer); say the one it has.
  const bazar = data.categories.find((c) => /bazar|grocery/i.test(c.name))?.defaultSplit;
  const rule: BazarRule = bazar === "MEALS" && data.settings.mealsOn ? "MEALS" : bazar === "SHARES" ? "SHARES" : "EQUAL";
  const steps = [
    {
      done: names.length > 0,
      title: t("Add the members"),
      body:
        names.length > 0
          ? t(names.length === 1 ? "{names} is in. Add phone numbers to send each one a statement later." : "{names} are in. Add phone numbers to send each one a statement later.", { names: listed })
          : t("Brothers, flatmates or mess members. They don't need a login; you record for them."),
      actions: [{ label: names.length > 0 ? t("Add more") : t("Add members"), onClick: onAddMember, primary: names.length === 0 }],
    },
    {
      done: view.budget !== null,
      title: t("Set this month's budget"),
      body: view.budget ? t("{amount} for this month. The group is warned at 90%.", { amount: formatCurrency(view.budget.budget, data.currency) }) : t("What the group plans to spend this month. The bar on every page turns amber at 90% and red when over."),
      actions: [{ label: view.budget ? t("Change") : t("Set budget"), onClick: onSetBudget, primary: false }],
    },
    {
      done: false,
      title: t("Record the first contributions"),
      body: t("The money each member hands over at the start of the month."),
      actions: [{ label: t("Add contribution"), onClick: onAddContribution, primary: names.length > 0 }],
    },
    {
      done: false,
      title: t("Add the first expense"),
      body: t(EXPENSE_STEP[rule]),
      actions: [{ label: t("Add expense"), onClick: onAddExpense, primary: false }],
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 border-b border-divider px-6 py-5">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="text-h3 text-ink">{t("Set up {name}", { name: data.name })}</h2>
            <span className="text-small text-ink-muted">{t("Four short steps. The dashboard fills in as soon as money is recorded.")}</span>
          </div>
          <span className="text-small font-semibold text-ink-2">{t("{done} of {total} done", { done: formatCount(doneCount, locale), total: formatCount(steps.length, locale) })}</span>
          <ProgressBar value={(doneCount / steps.length) * 100} label={t("Setup progress")} className="w-30" />
        </div>
        <ol className="flex flex-col">
          {steps.map((step, i) => (
            <li key={step.title} className="flex flex-wrap gap-4 border-b border-divider px-6 py-5 last:border-b-0 sm:flex-nowrap">
              <span className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-full text-small font-bold", step.done ? "bg-emerald text-on-action" : "border-[1.5px] border-line-strong bg-surface text-ink-2")}>{step.done ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : formatCount(i + 1, locale)}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={cn("text-body-lg font-semibold", step.done ? "text-ink-muted line-through" : "text-ink")}>{step.title}</span>
                <span className="text-small leading-relaxed text-ink-muted">{step.body}</span>
              </div>
              {/* Under the text on a phone, in line with it. */}
              <div className="flex shrink-0 gap-2 max-sm:basis-full max-sm:pl-11.5">
                {step.actions.map((action) => (
                  <Button key={action.label} variant={action.primary ? "primary" : "secondary"} size="sm" onClick={action.onClick}>
                    {action.label}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card padding="none" className="flex flex-col gap-4 p-5">
        <h2 className="text-title font-semibold text-ink">{t("How each balance is worked out")}</h2>
        <div className="flex flex-col gap-2 rounded-md bg-strip p-4 text-small leading-relaxed">
          <span className="flex justify-between">
            <span className="text-ink-2">{t("Contributions")}</span>
            <span className="font-semibold text-income">+</span>
          </span>
          <span className="flex justify-between">
            <span className="text-ink-2">{t("Paid from own pocket")}</span>
            <span className="font-semibold text-income">+</span>
          </span>
          <span className="flex justify-between">
            <span className="text-ink-2">{t("Share of the month's costs")}</span>
            <span className="font-semibold text-expense">−</span>
          </span>
          <span className="h-px bg-line" />
          <span className="flex justify-between font-semibold text-ink">
            <span>{t("Balance")}</span>
            <span>= {t("gets back or has to pay")}</span>
          </span>
        </div>
        <p className="text-small leading-relaxed text-ink-2">
          <b className="font-semibold text-ink">{t("Share of costs")}</b> = {t(SHARE_OF_COSTS[rule])}
        </p>
        <p className="text-small leading-relaxed text-ink-2">
          {fillNodes(t("{term} is what the fund should be holding. It always equals all balances added together, so the account checks itself."), { term: <b className="font-semibold text-ink">{t("Cash in hand")}</b> })}
        </p>
      </Card>
    </div>
  );
}
