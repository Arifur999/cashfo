"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ProgressBar from "@/components/smartly/ProgressBar";
import { categoryTone } from "@/lib/customer/categoryTone";
import { namesList, shortName } from "@/lib/customer/groupDisplay";
import { accountantsOf } from "@/lib/customer/groupFamily";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { SPLIT_WORDS } from "./MessDashboard";
import type { GroupPageData, GroupView } from "./groupTypes";

interface GroupSetupProps {
  data: GroupPageData;
  view: GroupView;
  onAddMember: () => void;
  onAddContribution: () => void;
  onAddMeals: () => void;
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
  MEALS: "your meals × the meal rate (bazar ÷ all meals), plus an equal part of the other costs. If bazar comes to TK 30,000 over 600 meals, the rate is TK 50, so 60 meals cost TK 3,000.",
  SHARES: "the bazar split by each member's shares, plus an equal part of the other costs. With TK 12,000 of bazar and shares of 3, 1 and 4, they pay TK 4,500, TK 1,500 and TK 6,000.",
  EQUAL: "everything spent in the month ÷ the members. If the month costs TK 40,000 and five people share it, each owes TK 8,000.",
};

// A brand-new group: six short steps (the v16 GroupSetup board, without its
// access links, which wait for the member portal), and how a balance is
// worked out.
// The dashboard takes over as soon as money is recorded.
export function GroupSetup({ data, view, onAddMember, onAddContribution, onAddMeals, onAddExpense }: GroupSetupProps) {
  const { t, fmt } = useLocale();
  const names = view.activeMembers.map((m) => shortName(m.name));
  const listed = names.length > 3 ? t("{names} and {count} more", { names: names.slice(0, 3).join(", "), count: formatCount(names.length - 3, fmt) }) : namesList(t, names);
  const mess = data.settings.kind === "MESS";
  const meals = mess || data.settings.mealsOn;
  // New groups get their bazar rule when created (NewGroupDialog); say the one it has.
  const bazar = data.categories.find((c) => /bazar|grocery/i.test(c.name))?.defaultSplit;
  const rule: BazarRule = bazar === "MEALS" && data.settings.mealsOn ? "MEALS" : bazar === "SHARES" ? "SHARES" : "EQUAL";
  const [year, month] = data.range.key.split("-").map(Number);
  const hasBudget = data.budgets.some((budget) => budget.year === year && budget.month === month);
  const keepers = accountantsOf(data.members);
  const tab = (name: string) => ({ pathname: `/group-expenses/${data.businessId}`, query: { tab: name, month: data.range.key } });
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
      done: keepers.length > 0,
      title: t("Choose who keeps the cash"),
      body: keepers.length > 0 ? t("{names} records spending and keeps the group cash. You can change it any time.", { names: namesList(t, keepers.map((m) => shortName(m.name))) }) : t("Pick who records spending and keeps the group cash. You can change it any time."),
      actions: [{ label: t("Choose in Members"), href: tab("members"), primary: false }],
    },
    {
      done: hasBudget,
      title: t("Set the monthly budget"),
      body: t("Optional, but it warns you before spending goes too high."),
      actions: [{ label: hasBudget ? t("Change budget") : t("Set budget"), href: tab("budget"), primary: false }],
    },
    {
      done: false,
      title: t("Check how costs are shared"),
      body: t(mess ? "These defaults suit most messes. Change a category if, say, rooms pay different rent." : "These defaults suit most families. Change a category if a cost should be shared another way."),
      rules: true,
      actions: [{ label: t("Review rules"), href: tab("settings"), primary: false }],
    },
    {
      done: false,
      title: t("Record the first contributions"),
      body: t(mess ? "The money each member hands to the manager at the start of the month." : "The money each member hands over at the start of the month."),
      actions: [{ label: t("Add contribution"), onClick: onAddContribution, primary: names.length > 0 }],
    },
    meals
      ? {
          done: false,
          title: t("Count meals and add the first bazar"),
          body: t("Meals can be marked for the whole mess in one go, once a day."),
          actions: [
            { label: t("Add meals"), onClick: onAddMeals, primary: false },
            { label: t("Add expense"), onClick: onAddExpense, primary: false },
          ],
        }
      : {
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
            <span className="text-small text-ink-muted">{t("Six short steps. The dashboard fills in as soon as money is recorded.")}</span>
          </div>
          <span className="text-small font-semibold text-ink-2">{t("{done} of {total} done", { done: formatCount(doneCount, fmt), total: formatCount(steps.length, fmt) })}</span>
          <ProgressBar value={(doneCount / steps.length) * 100} label={t("Setup progress")} className="w-30" />
        </div>
        <ol className="flex flex-col">
          {steps.map((step, i) => (
            <li key={step.title} className="flex flex-wrap gap-4 border-b border-divider px-6 py-4.5 last:border-b-0 sm:flex-nowrap">
              <span className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-full text-small font-bold", step.done ? "bg-emerald text-on-action" : "border-[1.5px] border-input bg-surface text-ink-soft")}>{step.done ? <Check className="size-3.75" strokeWidth={3} aria-hidden="true" /> : formatCount(i + 1, fmt)}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-col gap-0.75">
                  <span className={cn("text-[15px] leading-normal font-semibold", step.done ? "text-ink-muted line-through" : "text-ink")}>{step.title}</span>
                  <span className="text-small leading-normal text-ink-muted">{step.body}</span>
                </div>
                {"rules" in step && data.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {data.categories.map((category) => {
                      const tone = categoryTone(category.color);
                      const how = category.defaultSplit === "MEALS" && !data.settings.mealsOn ? "EQUAL" : category.defaultSplit;
                      return (
                        <span key={category.id} className={cn("flex h-7 items-center gap-1.5 rounded-full px-2.5 text-caption font-semibold", tone.bg, tone.fg)}>
                          {category.name} <span className="font-medium opacity-80">· {t(SPLIT_WORDS[how])}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Under the text on a phone, in line with it. */}
              <div className="flex shrink-0 items-start gap-2 max-sm:basis-full max-sm:pl-11.5">
                {step.actions.map((action) =>
                  "href" in action ? (
                    <Button key={action.label} asChild variant="secondary" size="sm">
                      <Link href={action.href}>{action.label}</Link>
                    </Button>
                  ) : (
                    <Button key={action.label} variant={action.primary ? "primary" : "secondary"} size="sm" onClick={action.onClick}>
                      {action.label}
                    </Button>
                  ),
                )}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card padding="none" className="flex flex-col gap-4 p-5">
        <h2 className="text-title font-semibold text-ink">{t("How each balance is worked out")}</h2>
        <div className="flex flex-col gap-2 rounded-[14px] bg-strip p-3.5 text-small leading-normal">
          <span className="flex justify-between">
            <span className="text-ink-2">{t("Contributions")}</span>
            <span className="font-semibold text-income">+</span>
          </span>
          <span className="flex justify-between">
            <span className="text-ink-2">{t("Expenses paid from own pocket")}</span>
            <span className="font-semibold text-income">+</span>
          </span>
          {meals ? (
            <>
              <span className="flex justify-between">
                <span className="text-ink-2">{t("Meals × meal rate")}</span>
                <span className="font-semibold text-expense">−</span>
              </span>
              <span className="flex justify-between">
                <span className="text-ink-2">{t("Share of rent, bills and other costs")}</span>
                <span className="font-semibold text-expense">−</span>
              </span>
            </>
          ) : (
            <span className="flex justify-between">
              <span className="text-ink-2">{t("Share of the month's costs")}</span>
              <span className="font-semibold text-expense">−</span>
            </span>
          )}
          <span className="h-px bg-line" />
          <span className="flex justify-between font-semibold text-ink">
            <span>{t("Balance")}</span>
            <span>= {t("gets back or has to pay")}</span>
          </span>
        </div>
        {meals ? (
          <p className="text-small leading-[1.55] text-ink-soft">
            <b className="font-semibold text-ink">{t("Meal rate")}</b> = {t("all bazar ÷ all meals in the month. If bazar costs TK 19,840 and the mess ate 320 meals, one meal costs TK 62.00.")}
          </p>
        ) : (
          <p className="text-small leading-[1.55] text-ink-soft">
            <b className="font-semibold text-ink">{t("Share of costs")}</b> = {t(SHARE_OF_COSTS[rule])}
          </p>
        )}
        <p className="text-small leading-[1.55] text-ink-soft">
          {fillNodes(t(data.settings.cashHolderMemberId ? "{term} is what the manager should be holding. It always equals all balances added together, so the account checks itself." : "{term} is what the fund should be holding. It always equals all balances added together, so the account checks itself."), { term: <b className="font-semibold text-ink">{t("Cash in hand")}</b> })}
        </p>
      </Card>
    </div>
  );
}
