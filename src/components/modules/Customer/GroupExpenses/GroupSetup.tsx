"use client";

import { Check } from "lucide-react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import { formatCurrency } from "@/lib/customer/currency";
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

// A brand-new group: four short steps, and how a balance is worked out.
// The dashboard takes over as soon as money is recorded.
export function GroupSetup({ data, view, onAddMember, onSetBudget, onAddContribution, onAddExpense }: GroupSetupProps) {
  const { t } = useLocale();
  const names = view.activeMembers.map((m) => m.name);
  const steps = [
    {
      done: names.length > 0,
      title: t("Add the members"),
      body: names.length > 0 ? `${names.slice(0, 3).join(", ")}${names.length > 3 ? ` ${t("and")} ${names.length - 3} ${t("more")}` : ""} ${t(names.length === 1 ? "is in." : "are in.")} ${t("Add phone numbers to send each one a statement later.")}` : t("Brothers, flatmates or mess members. They don't need a login; you record for them."),
      actions: [{ label: names.length > 0 ? t("Add more") : t("Add members"), onClick: onAddMember, primary: names.length === 0 }],
    },
    {
      done: view.budget !== null,
      title: t("Set this month's budget"),
      body: view.budget ? `${formatCurrency(view.budget.budget, data.currency)} ${t("for this month. The group is warned at 90%.")}` : t("What the group plans to spend this month. The bar on every page turns amber at 90% and red when over."),
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
      body: t("Bazar, rent, bills: every cost is paid from the fund and shared equally."),
      actions: [{ label: t("Add expense"), onClick: onAddExpense, primary: false }],
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 border-b border-surface-sunken px-6 py-5">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="text-h3 text-ink">
              {t("Set up")} {data.name}
            </h2>
            <span className="text-small text-ink-muted">{t("Four short steps. The dashboard fills in as soon as money is recorded.")}</span>
          </div>
          <span className="text-small font-semibold text-ink-2">
            {doneCount} {t("of")} 4 {t("done")}
          </span>
          <span role="progressbar" aria-label={t("Setup progress")} aria-valuenow={doneCount * 25} aria-valuemin={0} aria-valuemax={100} className="block h-2 w-30 overflow-hidden rounded-full bg-surface-sunken">
            <span className="block h-full rounded-full bg-emerald" style={{ width: `${doneCount * 25}%` }} />
          </span>
        </div>
        <ol className="flex flex-col">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4 border-b border-surface-sunken px-6 py-5 last:border-b-0">
              <span className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-full text-small font-bold", step.done ? "bg-emerald text-white" : "border-[1.5px] border-line-strong bg-surface text-ink-2")}>{step.done ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : i + 1}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={cn("text-body-lg font-semibold", step.done ? "text-ink-muted line-through" : "text-ink")}>{step.title}</span>
                <span className="text-small leading-relaxed text-ink-muted">{step.body}</span>
              </div>
              <div className="flex shrink-0 gap-2">
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
        <div className="flex flex-col gap-2 rounded-md bg-cream p-4 text-small leading-relaxed">
          <span className="flex justify-between">
            <span className="text-ink-2">{t("Contributions")}</span>
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
          <b className="font-semibold text-ink">{t("Share of costs")}</b> = {t("everything spent in the month ÷ the members. If the month costs ৳ 40,000 and five people share it, each owes ৳ 8,000.")}
        </p>
        <p className="text-small leading-relaxed text-ink-2">
          <b className="font-semibold text-ink">{t("Cash in hand")}</b> {t("is what the fund should be holding. It always equals all balances added together, so the account checks itself.")}
        </p>
      </Card>
    </div>
  );
}
