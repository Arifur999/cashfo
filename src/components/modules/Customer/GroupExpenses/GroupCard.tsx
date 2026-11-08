"use client";

import { ArrowRight, CircleAlert, ExternalLink, MoreHorizontal, Pause, Pencil, Play } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { ACCESS_HINTS, ACCESS_LABELS, accessLevelOf } from "@/lib/customer/groupAccess";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { countLabel, groupMonthOf, groupTabHref } from "@/lib/customer/groupDisplay";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GROUP_KIND } from "./GroupBits";
import type { GroupCardData } from "./groupTypes";

interface GroupCardProps {
  group: GroupCardData;
  today: string;
  onRename: () => void;
  onTogglePause: () => void;
}

// The months between two keys, both in.
const monthsBetween = (from: string, to: string) => {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return Math.max(1, (ty - fy) * 12 + (tm - fm) + 1);
};

// One group on the list (the v16 GroupList board): its members and first
// month, my role, the month's spending, budget and my balance, the budget
// bar, and what my balance means. A paused group is greyed and listed last.
export function GroupCard({ group, today, onRename, onTogglePause }: GroupCardProps) {
  const { t, fmt } = useLocale();
  const { workspace, members, settlement, settings, budget, openMonth } = group;
  const kind = GROUP_KIND[settings.kind];
  const paused = !!settings.pausedAt;
  const money = (value: number) => formatCurrency(Math.abs(value), workspace.currency, fmt);
  const href = `/group-expenses/${workspace.id}`;
  const active = members.filter((member) => member.status === "ACTIVE");
  const spent = Number(settlement.totalExpense);
  const limit = budget ? Number(budget.budgetAmount) : null;
  const used = limit ? Math.round((spent / limit) * 100) : null;
  const over = limit !== null && spent > limit;
  const sharing = settlement.members.filter((row) => row.sharing);
  const paid = sharing.filter((row) => Number(row.grossDeposited) > 0).length;
  // The group's span: its first month (a member's joining) to this one.
  const startDay = settings.monthStartDay;
  const current = groupMonthOf(today, startDay);
  const first = [current, ...members.map((member) => groupMonthOf((member.joinedOn ?? member.createdAt).slice(0, 10), startDay))].sort()[0];
  const months = monthsBetween(first, current);
  const since = t("since {month}", { month: monthName(first, fmt, "long", true) });
  // My balance: my own member row this month -- the owner's for the
  // group's Admin, the one my login is for anyone else.
  const { user } = useAuth();
  const level = accessLevelOf(workspace.role);
  const isAdmin = level === "ADMIN" && !user.impersonatedBy;
  const me = level === "ADMIN" ? members.find((member) => member.isOwner) : members.find((member) => member.userId === user.id);
  const mine = me ? Number(settlement.members.find((row) => row.groupMemberId === me.id)?.balance ?? 0) : null;
  const monthShort = monthName(current, fmt, "long");

  return (
    <Card padding="none" className={cn("flex flex-col", paused && "bg-strip opacity-72")}>
      <div className="flex items-start gap-3.5 px-5 pt-5 pb-4">
        <IconTile tone={kind.tone} size={48}>
          <kind.icon strokeWidth={1.75} />
        </IconTile>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <Link href={href} className="truncate text-[18px] font-semibold tracking-normal text-ink hover:text-emerald">
              {workspace.name}
            </Link>
            <Chip tone={kind.tone} className="px-2.25">
              {t(kind.label)}
            </Chip>
            {paused && (
              <Chip tone="neutral" className="gap-1 px-2.25">
                <Pause className="size-3" aria-hidden="true" />
                {t("Paused")}
              </Chip>
            )}
          </span>
          <span className="text-small text-ink-muted" title={countLabel(t, fmt, months, "{count} month", "{count} months")}>
            {[countLabel(t, fmt, active.length, "{count} member", "{count} members"), since, sharing.length > 0 ? t("{count} of {total} paid in", { count: formatCount(paid, fmt), total: formatCount(sharing.length, fmt) }) : ""].filter(Boolean).join(" · ")}
          </span>
        </div>
        <Chip tone={level === "ADMIN" ? "mint" : level === "EDITOR" ? "warning" : "info"} className="mt-1 shrink-0 px-2.25 max-sm:hidden" title={t(ACCESS_HINTS[level])}>
          {t("You: {role}", { role: t(ACCESS_LABELS[level]) })}
        </Chip>
        {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={t("More actions for {name}", { name: workspace.name })} className="flex size-8.5 shrink-0 items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11">
            <MoreHorizontal className="size-4.5" strokeWidth={2.5} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-55 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
            <DropdownMenuItem asChild className="rounded-md px-3 py-2 text-body text-ink focus:bg-surface-sunken">
              <Link href={href}>
                <ExternalLink className="size-4" aria-hidden="true" />
                {t("Open group")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onRename} className="rounded-md px-3 py-2 text-body text-ink focus:bg-surface-sunken">
              <Pencil className="size-4" aria-hidden="true" />
              {t("Rename")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onTogglePause} className="items-start rounded-md px-3 py-2 text-body text-ink focus:bg-surface-sunken">
              {paused ? <Play className="mt-0.5 size-4" aria-hidden="true" /> : <Pause className="mt-0.5 size-4" aria-hidden="true" />}
              <span className="flex flex-col gap-0.5">
                <span>{paused ? t("Resume group") : t("Pause group")}</span>
                <span className="text-caption text-ink-muted">{paused ? t("Starts counting budget and expenses again.") : t("Hides it from new entries. Nothing is deleted.")}</span>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>

      <div className="grid grid-cols-3 border-y border-divider">
        <Stat label={t("Spent in {month}", { month: monthShort })} value={money(spent)} divided />
        <Stat label={t("Budget")} value={limit === null ? t("Not set") : money(limit)} tone={limit === null ? "text-ink-faint" : undefined} divided />
        <Stat label={t("My balance")} value={mine === null ? "—" : Math.abs(mine) < 0.005 ? money(0) : formatSignedCurrency(mine, workspace.currency, fmt)} tone={mine === null || Math.abs(mine) < 0.005 ? "text-ink-2" : mine > 0 ? "text-income" : "text-expense"} />
      </div>

      <div className="flex flex-col gap-2 px-5 py-3.5">
        <div className="flex flex-wrap justify-between gap-x-3 text-small">
          <span className="text-ink-2">{used !== null ? t("{percent}% of the budget used", { percent: formatCount(used, fmt) }) : t("No budget set")}</span>
          <span className={cn("font-semibold tabular-nums", over ? "text-expense" : "text-ink-2")}>{limit === null ? "—" : over ? t("{amount} over budget", { amount: money(spent - limit) }) : t("{amount} left", { amount: money(limit - spent) })}</span>
        </div>
        <span role="progressbar" aria-label={t("Budget used")} aria-valuenow={Math.min(100, used ?? 0)} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-surface-sunken">
          <span className={cn("block h-full rounded-full", over ? "bg-expense-fill" : "bg-emerald")} style={{ width: `${Math.min(100, used ?? 0)}%` }} />
        </span>
        {openMonth && !paused && (
          <Link href={groupTabHref(workspace.id, "settlement", { month: openMonth.key })} className="flex items-start gap-1.5 text-caption font-medium text-warning hover:underline">
            <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            {t("{month} has ended. Close it to lock the numbers", { month: monthName(openMonth.key, fmt) })}
          </Link>
        )}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-b-card border-t border-divider bg-strip px-5 py-3 text-small">
        <span className={cn("min-w-0 truncate", mine === null || Math.abs(mine) < 0.005 ? "text-ink-soft" : mine > 0 ? "text-income" : "text-expense")}>
          {paused ? t("Paused · nothing new is counted") : mine === null ? t("You don’t share this group’s costs") : Math.abs(mine) < 0.005 ? t("You are all square") : mine > 0 ? t("The group owes you") : t("You owe the group")}
        </span>
        <Button asChild size="sm" className="ml-auto">
          <Link href={href}>
            {t("Open")}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}

function Stat({ label, value, tone, divided = false }: { label: string; value: string; tone?: string; divided?: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-col justify-between gap-1 px-3 py-3.5 md:px-5", divided && "border-r border-divider")}>
      <span className="text-caption font-normal text-ink-muted">{label}</span>
      <span className={cn("text-title font-bold wrap-break-word text-ink tabular-nums md:text-h3 md:font-bold", tone)}>{value}</span>
    </div>
  );
}
