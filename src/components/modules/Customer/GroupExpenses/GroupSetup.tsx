"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useStoredChoice } from "@/components/modules/Customer/Balance/useStoredChoice";
import { categoryTone } from "@/lib/customer/categoryTone";
import { formatCurrency } from "@/lib/customer/currency";
import { budgetFor, countLabel, groupTabHref, namesList, shortName } from "@/lib/customer/groupDisplay";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "./GroupBits";
import type { GroupPageData, GroupView } from "./groupTypes";
import { SPLIT_WORDS } from "./MessDashboard";

interface GroupSetupProps {
  data: GroupPageData;
  view: GroupView;
  onAddMember: () => void;
  onAddContribution: () => void;
  // Skip, go to dashboard.
  onSkip: () => void;
}

interface Step {
  done: boolean;
  title: string;
  body: string;
  chips?: boolean;
  actions: { label: string; primary?: boolean; href?: string; onClick?: () => void }[];
}

// The access a member has, on its chip (the boards' Admin / Editor / Viewer / Member).
export const ROLE_CHIP = {
  ADMIN: { label: "Admin", cls: "bg-mint-50 text-emerald" },
  ACCOUNTANT: { label: "Editor", cls: "bg-warning-soft text-warning" },
  VIEWER: { label: "Viewer", cls: "bg-info-soft text-tint-blue-ink" },
  MEMBER: { label: "Member", cls: "bg-quiet-chip text-ink-muted" },
} as const;

export const roleKey = (member: { isOwner?: boolean; role?: string }) => (member.isOwner ? "ADMIN" : member.role === "ACCOUNTANT" ? "ACCOUNTANT" : member.role === "VIEWER" ? "VIEWER" : "MEMBER");

// A brand-new group (the v16 GroupSetup board): short steps, each done as
// soon as the group has it, and how a balance is worked out with the
// members' shares. Skip opens the dashboard.
export function GroupSetup({ data, view, onAddMember, onAddContribution, onSkip }: GroupSetupProps) {
  const { t, fmt } = useLocale();
  const [checked, setChecked] = useStoredChoice<"no" | "yes">(`smartly-group-cats-checked:${data.businessId}`, ["no", "yes"], "no");
  const money = (value: number) => formatCurrency(value, data.currency, fmt);
  const members = view.activeMembers;
  const firstNames = (list: typeof members) => namesList(t, list.map((member) => shortName(member.name)));
  const editors = members.filter((member) => !member.isOwner && member.role === "ACCOUNTANT");
  // Access links: done when every member given access who has a mobile
  // number can log in or has a link waiting (the board's rule).
  const others = members.filter((member) => !member.isOwner);
  const withPhone = others.filter((member) => !!member.phone && (member.role ?? "MEMBER") !== "MEMBER");
  const logins = others.filter((member) => !!member.access?.login);
  const waiting = others.filter((member) => !member.access?.login && !!member.access?.link);
  const covered = withPhone.filter((member) => !!member.access?.login || !!member.access?.link);
  const linksDone = withPhone.length > 0 && covered.length === withPhone.length;
  const budget = budgetFor(data.budgets, data.range);
  const deposits = data.contributions.filter((row) => row.kind === "DEPOSIT" && Number(row.amount) > 0);
  const categories = data.categories.filter((category) => !category.hidden);
  const catsDone = checked === "yes";
  const tab = (name: string) => groupTabHref(data.businessId, name as Parameters<typeof groupTabHref>[1], { month: data.range.key });

  const steps: Step[] = [
    {
      done: members.length >= 2,
      title: t("Add the members"),
      body: members.length >= 2 ? `${countLabel(t, fmt, members.length, "{count} member", "{count} members")}: ${firstNames(members)}` : t("Only you so far. Add everyone who shares the costs."),
      actions: [{ label: t("Add a member"), primary: members.length < 2, onClick: onAddMember }],
    },
    {
      done: editors.length > 0,
      title: t("Choose an Editor"),
      body: editors.length > 0 ? t(editors.length === 1 ? "{names} adds money entries in their own name and keeps group cash." : "{names} add money entries in their own names and keep group cash.", { names: firstNames(editors) }) : t("Pick who records spending and keeps the group cash. You can change it any time."),
      actions: [{ label: t("Choose in Members"), href: tab("members") }],
    },
    {
      done: linksDone,
      title: t("Send access links"),
      body:
        withPhone.length === 0
          ? t("Add a mobile number for a member, then send them an access link. They open it and set their own username and password.")
          : [
              logins.length > 0 ? t(logins.length === 1 ? "{count} member can log in: {names}." : "{count} members can log in: {names}.", { count: formatCount(logins.length, fmt), names: firstNames(logins) }) : "",
              waiting.length > 0 ? t("Link sent, waiting: {names}.", { names: firstNames(waiting) }) : "",
              linksDone ? "" : t("{count} still without a link.", { count: formatCount(withPhone.length - covered.length, fmt) }),
            ]
              .filter(Boolean)
              .join(" "),
      actions: [{ label: linksDone ? t("Manage access") : t("Send access links"), href: tab("members") }],
    },
    {
      done: budget !== null,
      title: t("Set a monthly budget"),
      body: budget ? t("{amount} for {month}", { amount: money(Number(budget.budgetAmount)), month: monthName(data.range.key, fmt, "long", true) }) : t("Optional, but it warns you before spending goes too high."),
      actions: [{ label: budget ? t("Change budget") : t("Set budget"), href: tab("budget") }],
    },
    {
      done: catsDone,
      title: t("Check the categories"),
      body: t("{count} categories, each shared equally or by shares. Check they fit how your group spends.", { count: formatCount(categories.length, fmt) }),
      chips: true,
      actions: [{ label: t("Review"), href: tab("categories") }, ...(catsDone ? [] : [{ label: t("They look fine"), onClick: () => setChecked("yes") }])],
    },
    {
      done: deposits.length > 0,
      title: t("Record the first contribution"),
      body:
        deposits.length > 0
          ? t(deposits.length === 1 ? "{count} contribution recorded, {amount} in all." : "{count} contributions recorded, {amount} in all.", { count: formatCount(deposits.length, fmt), amount: money(deposits.reduce((sum, row) => sum + Number(row.amount), 0)) })
          : t("The money each member hands in at the start of the month."),
      actions: [{ label: t("Add contribution"), primary: deposits.length === 0, onClick: onAddContribution }],
    },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const percent = Math.round((doneCount / steps.length) * 100);
  const totalShares = members.reduce((sum, member) => sum + Number(member.shareUnits), 0);
  const button = "flex h-9 items-center rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap";
  const quiet = "border border-input bg-surface text-ink hover:bg-hover";
  const loud = "bg-emerald text-on-action hover:bg-emerald-hover";

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section aria-labelledby="gs-title" className="overflow-hidden rounded-card border border-line-card bg-surface shadow-card">
        <div className="flex flex-col gap-3.5 border-b border-divider px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 id="gs-title" className="truncate text-[18px] font-semibold text-ink">
                {t("Set up {name}", { name: data.name })}
              </h2>
              <span className="text-[13px] leading-normal text-ink-muted">{t("Six short steps. The dashboard fills in as soon as money is recorded.")}</span>
            </div>
            <button type="button" onClick={onSkip} className="h-9.5 shrink-0 rounded-full border border-input bg-surface px-3.5 text-[13px] font-semibold whitespace-nowrap text-ink hover:bg-hover max-sm:hidden">
              {t("Skip, go to dashboard")}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span role="progressbar" aria-label={t("Setup progress")} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
              <span className="block h-full rounded-full bg-emerald transition-[width] duration-300" style={{ width: `${percent}%` }} />
            </span>
            <span className="text-[13px] font-semibold whitespace-nowrap text-ink-2 tabular-nums">{t("{done} of {total} done", { done: formatCount(doneCount, fmt), total: formatCount(steps.length, fmt) })}</span>
          </div>
        </div>
        {doneCount === steps.length && (
          <div className="flex items-center gap-3.5 border-b border-success-soft bg-success-soft/40 px-6 py-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-soft text-tint-green-ink">
              <Check className="size-4.5" strokeWidth={2.75} aria-hidden="true" />
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <b className="text-[14.5px] font-semibold">{t("All set")}</b>
              <span className="text-[13px] text-ink-2">{t("Your group is ready. Record expenses as they happen.")}</span>
            </span>
            <button type="button" onClick={onSkip} className={cn(button, loud, "h-10 px-4.5 text-[13.5px]")}>
              {t("Open dashboard")}
            </button>
          </div>
        )}
        <ol>
          {steps.map((step, i) => (
            <li key={step.title} className="flex flex-wrap gap-4 border-b border-divider px-6 py-4 sm:flex-nowrap">
              <span aria-hidden="true" className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-ink-soft", step.done ? "bg-emerald" : "border-[1.5px] border-input bg-surface")}>
                {step.done ? <Check className="size-3.75 text-on-action" strokeWidth={3} /> : formatCount(i + 1, fmt)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-col gap-0.75">
                  <span className="flex items-center gap-2">
                    <span className={cn("text-[15px] font-semibold", step.done ? "text-ink-soft" : "text-ink")}>{step.title}</span>
                    <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold", step.done ? "bg-success-soft text-tint-green-ink" : "bg-surface-sunken text-ink-muted")}>{step.done ? t("Done") : t("To do")}</span>
                  </span>
                  <span className="text-[13px] leading-normal text-ink-muted">{step.body}</span>
                </div>
                {step.chips && categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((category) => {
                      const tone = categoryTone(category.color);
                      const how = category.defaultSplit === "MEALS" && !data.settings.mealsOn ? "EQUAL" : category.defaultSplit;
                      return (
                        <span key={category.id} className={cn("flex h-6.5 items-center gap-1.25 rounded-full px-2.5 text-caption font-semibold", tone.bg, tone.fg)}>
                          {category.name}
                          <span className="font-medium opacity-80">· {t(SPLIT_WORDS[how])}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-start gap-2 max-sm:basis-full max-sm:pl-11.5">
                {step.actions.map((action) =>
                  action.href ? (
                    <Link key={action.label} href={action.href} className={cn(button, action.primary ? loud : quiet)}>
                      {action.label}
                    </Link>
                  ) : (
                    <button key={action.label} type="button" onClick={action.onClick} className={cn(button, action.primary ? loud : quiet)}>
                      {action.label}
                    </button>
                  ),
                )}
              </div>
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-2.5 bg-hover px-6 py-3.5">
          <span className="flex-1 text-[12.5px] text-ink-muted">{t("Every step can also be done later from the menu on the left.")}</span>
          <button type="button" onClick={onSkip} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-emerald hover:bg-emerald-wash">
            {t("Skip, go to dashboard")}
            <ArrowRight className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
          </button>
        </div>
      </section>

      <aside aria-labelledby="gs-how" className="flex flex-col gap-3.5 rounded-card border border-line-card bg-surface p-5 shadow-card">
        <h2 id="gs-how" className="text-title font-semibold text-ink">
          {t("How each balance is worked out")}
        </h2>
        <div className="flex flex-col gap-2 rounded-[14px] bg-hover p-3.5 text-[13px] leading-[1.45]">
          {(
            [
              ["Contributions", "+"],
              ["Paid from own pocket", "+"],
              ["Settlement paid to others", "+"],
              ["Settlement received", "−"],
              ["Share of the expenses", "−"],
            ] as const
          ).map(([label, sign]) => (
            <span key={label} className="flex justify-between gap-2.5">
              <span className="text-ink-2">{t(label)}</span>
              <span className={cn("font-bold", sign === "+" ? "text-tint-green-ink" : "text-expense")}>{sign}</span>
            </span>
          ))}
          <span className="h-px bg-line" />
          <span className="flex justify-between gap-2.5 font-semibold text-ink">
            <span>{t("Balance")}</span>
            <span className="text-right">{t("gets back or has to pay")}</span>
          </span>
        </div>
        <span className="text-[13px] leading-[1.55] text-ink-soft">{t("Above 0, the group owes that member. Below 0, they owe the group. Settlement shows who pays whom.")}</span>
        <div className="flex flex-col gap-2">
          <span className="text-caption font-semibold tracking-[0.03em] text-ink-muted">{t("SHARES IN THIS GROUP")}</span>
          {members.map((member) => {
            const role = ROLE_CHIP[roleKey(member)];
            const shares = Number(member.shareUnits);
            return (
              <div key={member.id} className="flex items-center gap-2.5">
                <MemberAvatar member={member} members={data.members} size={30} className="text-[11px]" />
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">{member.name}</span>
                <span className="text-[12.5px] whitespace-nowrap text-ink-soft">{countLabel(t, fmt, shares, "{count} share", "{count} shares")}</span>
                <span className={cn("inline-flex h-5.5 items-center rounded-full px-2 text-[11.5px] font-semibold whitespace-nowrap", role.cls)}>{t(role.label)}</span>
              </div>
            );
          })}
        </div>
        <span className="text-[12.5px] leading-[1.55] text-ink-muted">{t("Costs shared \"by shares\" are split by these numbers ({count} in all). Costs shared \"equally\" are split the same for everyone.", { count: formatCount(totalShares, fmt) })}</span>
      </aside>
    </div>
  );
}
