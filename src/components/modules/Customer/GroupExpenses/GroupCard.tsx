"use client";

import { ArrowRight, MoreHorizontal, Pause, Pencil, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { countLabel, groupMonthOf } from "@/lib/customer/groupDisplay";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import type { Fmt } from "@/lib/i18n/formatPrefs";
import type { Translate as MessageTranslate } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GROUP_KIND } from "./GroupBits";
import type { GroupCardData } from "./groupTypes";

export interface GroupRowActions {
  onRename: () => void;
  onTogglePause: () => void;
  onDelete: () => void;
}

type Translate = MessageTranslate;

// What a card and a table row both show of one group (the v16 GroupList
// board): its span, my role, the month's spending against its budget, and
// my balance. Worked out once, read by either view.
export function groupRowView(group: GroupCardData, today: string, t: Translate, fmt: Fmt) {
  const { workspace, members, settlement, settings, budget } = group;
  const money = (value: number) => formatCurrency(Math.abs(value), workspace.currency, fmt);
  const active = members.filter((member) => member.status === "ACTIVE");
  const spent = Number(settlement.totalExpense);
  const limit = budget ? Number(budget.budgetAmount) : 0;
  const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;
  const warnAt = settings.budgetWarnPercent ?? 90;
  // The group's first month: its earliest member's joining.
  const startDay = settings.monthStartDay;
  const current = groupMonthOf(today, startDay);
  const first = [current, ...members.map((member) => groupMonthOf((member.joinedOn ?? member.createdAt).slice(0, 10), startDay))].sort()[0];
  const isAdmin = workspace.role === "OWNER";
  const me = isAdmin ? members.find((member) => member.isOwner) : undefined;
  const mine = me ? Number(settlement.members.find((row) => row.groupMemberId === me.id)?.balance ?? 0) : 0;
  const even = Math.abs(mine) < 0.5;
  return {
    href: `/group-expenses/${workspace.id}`,
    kind: GROUP_KIND[settings.kind],
    paused: !!settings.pausedAt,
    isAdmin,
    count: active.length,
    sub: `${countLabel(t, fmt, active.length, "{count} member", "{count} members")} · ${t("since {month}", { month: monthName(first, fmt, "long", true) })}`,
    month: monthName(current, fmt, "long"),
    spent: money(spent),
    budget: limit > 0 ? money(limit) : t("Not set"),
    hasBudget: limit > 0,
    percentLabel: limit > 0 ? t("{percent}% of the budget used", { percent: formatCount(percent, fmt) }) : t("No budget for {month}", { month: monthName(current, fmt, "long") }),
    left: limit <= 0 ? "–" : spent <= limit ? t("{amount} left", { amount: money(limit - spent) }) : t("{amount} over", { amount: money(spent - limit) }),
    over: limit > 0 && spent > limit,
    bar: Math.min(percent, 100),
    barClass: limit <= 0 ? "bg-input" : percent > 100 ? "bg-expense-fill" : percent >= warnAt ? "bg-warning-fill" : "bg-emerald",
    balance: even ? money(0) : formatSignedCurrency(mine, workspace.currency, fmt),
    balanceClass: even ? "text-ink-soft" : mine > 0 ? "text-tint-green-ink" : "text-expense",
    balanceHint: even ? t("All settled") : mine > 0 ? t("The group owes you") : t("You owe the group"),
  };
}

// My role in a group, on its chip: the Admin runs it.
export function RoleChip({ isAdmin, short = false }: { isAdmin: boolean; short?: boolean }) {
  const { t } = useLocale();
  const role = isAdmin ? t("Admin") : t("Member");
  return (
    <span title={isAdmin ? t("Everything: members, roles, settings, closing months") : undefined} className={cn("inline-flex h-6 shrink-0 items-center rounded-full px-2.25 text-caption font-semibold whitespace-nowrap", isAdmin ? "bg-mint-50 text-emerald" : "bg-quiet-chip text-ink-muted")}>
      {short ? role : t("You: {role}", { role })}
    </span>
  );
}

// The ⋯ menu of a group: open, rename, pause or resume, and delete while
// nothing was ever recorded in it (your only group stays).
export function GroupMenu({ group, only, open, actions, withOpen }: { group: GroupCardData; only: boolean; open: string; actions: GroupRowActions; withOpen: boolean }) {
  const { t } = useLocale();
  const paused = !!group.settings.pausedAt;
  const canDelete = !group.hasEntries && !only;
  const item = "min-h-10 gap-2.5 rounded-sm px-2.5 text-[13.5px] font-medium text-ink focus:bg-hover [&_svg]:size-3.75 [&_svg]:text-ink-soft";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={t("More for {name}", { name: group.workspace.name })} className="flex size-8.5 shrink-0 items-center justify-center rounded-[9px] border border-line bg-surface text-ink-muted transition-colors hover:border-mint-200 hover:bg-emerald-wash hover:text-emerald data-open:border-mint-200 data-open:bg-emerald-wash data-open:text-emerald pointer-coarse:size-11">
        <MoreHorizontal className="size-3.75" strokeWidth={2.5} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-60 rounded-[12px] border border-line bg-surface p-1.5 shadow-overlay ring-0">
        {withOpen && (
          <DropdownMenuItem asChild className={item}>
            <Link href={open}>
              <ArrowRight strokeWidth={2} aria-hidden="true" />
              {t("Open")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={actions.onRename} className={item}>
          <Pencil strokeWidth={2} aria-hidden="true" />
          {t("Rename")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={actions.onTogglePause} className={item}>
          {paused ? <Play strokeWidth={2} aria-hidden="true" /> : <Pause strokeWidth={2} aria-hidden="true" />}
          {paused ? t("Resume group") : t("Pause group")}
        </DropdownMenuItem>
        <span className="block pt-0.5 pr-2.5 pb-1.5 pl-8.75 text-[11.5px] leading-[1.4] text-ink-muted">{paused ? t("New entries are allowed again.") : t("Stops new entries. Nothing is deleted.")}</span>
        <DropdownMenuSeparator className="mx-1 mt-0.5 mb-1 bg-divider" />
        {canDelete ? (
          <DropdownMenuItem onSelect={actions.onDelete} className={cn(item, "text-expense focus:bg-expense-soft focus:text-expense [&_svg]:text-expense")}>
            <Trash2 strokeWidth={2} aria-hidden="true" />
            {t("Delete group")}
          </DropdownMenuItem>
        ) : (
          <span className="block px-2.5 pt-1.5 pb-2 text-[11.5px] leading-[1.45] text-ink-muted">{group.hasEntries ? t("Has money entries, so it can’t be deleted. Pause it instead.") : t("Your only group can’t be deleted.")}</span>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface GroupCardProps {
  group: GroupCardData;
  today: string;
  only: boolean;
  actions: GroupRowActions;
}

// One group on the list as a card (the v16 GroupList board). A paused group
// is greyed and listed last.
export function GroupCard({ group, today, only, actions }: GroupCardProps) {
  const { t, fmt } = useLocale();
  const view = groupRowView(group, today, t, fmt);
  const { kind } = view;

  return (
    <article className={cn("flex flex-col rounded-card border border-line-card shadow-card", view.paused ? "bg-hover" : "bg-surface")}>
      <div className="flex items-start gap-3.5 pt-4.5 pr-4.5 pb-3.5 pl-5">
        <span className={cn("flex size-11.5 shrink-0 items-center justify-center rounded-[12px] [&_svg]:size-5.75", kind.cls)}>
          <kind.icon strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.25">
          <span className="flex min-w-0 items-center gap-2">
            <Link href={view.href} title={group.workspace.name} className="min-w-0 truncate text-[18px] font-semibold tracking-normal text-ink hover:underline">
              {group.workspace.name}
            </Link>
            <span className={cn("shrink-0 rounded-full px-2.25 py-0.5 text-caption font-semibold", kind.cls)}>{t(kind.label)}</span>
            {view.paused && <span className="shrink-0 rounded-full bg-surface-sunken px-2.25 py-0.5 text-caption font-semibold text-ink-soft">{t("Paused")}</span>}
          </span>
          <span className="text-[13px] text-ink-muted">{view.sub}</span>
        </div>
        <RoleChip isAdmin={view.isAdmin} />
        {view.isAdmin && <GroupMenu group={group} only={only} open={view.href} actions={actions} withOpen />}
      </div>

      <div className="grid grid-cols-3 border-t border-divider">
        <Stat label={t("Spent in {month}", { month: view.month })} value={view.spent} divided />
        <Stat label={t("Budget")} value={view.budget} tone={view.hasBudget ? undefined : "text-ink-faint"} divided />
        <Stat label={t("My balance")} value={view.balance} tone={view.balanceClass} />
      </div>

      <div className="flex flex-col gap-1.75 border-t border-divider px-5 pt-3 pb-3.5">
        <div className="flex justify-between gap-2.5 text-[12.5px]">
          <span className="text-ink-2">{view.percentLabel}</span>
          <span className={cn("font-semibold tabular-nums", !view.hasBudget ? "text-ink-faint" : view.over ? "text-expense" : "text-ink-2")}>{view.left}</span>
        </div>
        <span role="progressbar" aria-label={t("Budget used")} aria-valuenow={view.bar} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-surface-sunken">
          <span className={cn("block h-full rounded-full", view.barClass)} style={{ width: `${view.bar}%` }} />
        </span>
      </div>

      <div className="mt-auto flex items-center gap-2.5 rounded-b-card border-t border-divider bg-hover py-2.5 pr-3.5 pl-5">
        <span className={cn("min-w-0 flex-1 truncate text-[12.5px] font-medium", view.balanceClass)}>{view.balanceHint}</span>
        <Link href={view.href} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-emerald px-4 text-[13.5px] font-semibold text-on-action hover:bg-emerald-hover">
          {t("Open")}
          <ArrowRight className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function Stat({ label, value, tone, divided = false }: { label: string; value: string; tone?: string; divided?: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.75 px-3 py-3 md:px-5", divided && "border-r border-divider")}>
      <span className="text-caption text-ink-muted">{label}</span>
      <span className={cn("text-[15px] font-bold wrap-break-word text-ink tabular-nums md:text-[17px]", tone)}>{value}</span>
    </div>
  );
}
