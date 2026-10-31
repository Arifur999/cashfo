"use client";

import { ArrowRight, CalendarDays, CircleAlert, ExternalLink, MoreHorizontal, Pause, Pencil, Play } from "lucide-react";
import Link from "next/link";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/customer/currency";
import { countLabel, groupMonthOf, groupTabHref } from "@/lib/customer/groupDisplay";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GROUP_KIND, MemberAvatar } from "./GroupBits";
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

// One group on the list (the v7 GroupList board): who is in it, the
// month's budget, spending and how many have paid in, the budget bar, and
// how long the group has run. A paused group is greyed and listed last.
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
  const span = first === current ? monthName(current, fmt, "long", true) : `${monthName(first, fmt, "long", true)} – ${monthName(current, fmt, "long", true)}`;
  const spanText = `${span} · ${countLabel(t, fmt, months, "{count} month", "{count} months")}`;

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
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-small text-ink-muted">
            {active.length > 0 && (
              <span className="flex">
                {active.map((member) => (
                  <MemberAvatar key={member.id} member={member} members={members} size={24} className="-mr-1.5 border-2 border-surface" />
                ))}
              </span>
            )}
            <span className={cn("min-w-0", active.length > 0 && "pl-1.5")}>{countLabel(t, fmt, active.length, "{count} member", "{count} members")}</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={t("More actions for {name}", { name: workspace.name })} className="flex size-8.5 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11">
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
      </div>

      <div className="grid grid-cols-3 border-y border-divider">
        <Stat label={t("Budget")} value={limit === null ? t("Not set") : money(limit)} tone={limit === null ? "text-ink-faint" : undefined} divided />
        <Stat label={t("Expense")} value={money(spent)} tone="text-expense" divided />
        <Stat label={t("Contributed by")} value={paid === sharing.length && paid > 0 ? countLabel(t, fmt, paid, "{count} member", "{count} members") : t("{count} of {total} members", { count: formatCount(paid, fmt), total: formatCount(sharing.length || active.length, fmt) })} />
      </div>

      <div className="flex flex-col gap-2 px-5 py-3.5">
        <div className="flex flex-wrap justify-between gap-x-3 text-small">
          <span className="text-ink-2">{used !== null ? t("{percent}% of budget used", { percent: formatCount(used, fmt) }) : t("No budget set")}</span>
          <span className={cn("font-semibold tabular-nums", over ? "text-expense" : "text-ink-2")}>{limit === null ? "—" : over ? t("{amount} over budget", { amount: money(spent - limit) }) : t("{percent}% left", { percent: formatCount(Math.max(0, 100 - (used ?? 0)), fmt) })}</span>
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
        <span className="flex min-w-0 items-center gap-1.5 text-ink-soft">
          <CalendarDays className="size-3.75 shrink-0" aria-hidden="true" />
          <span className="truncate">{paused ? t("Paused · {span}", { span: spanText }) : spanText}</span>
        </span>
        <Link href={href} className="ml-auto flex shrink-0 items-center gap-1 font-semibold text-emerald hover:text-emerald-hover">
          {t("Open group")}
          <ArrowRight className="size-3.75" aria-hidden="true" />
        </Link>
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
