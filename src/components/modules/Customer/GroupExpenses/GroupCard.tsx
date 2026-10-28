"use client";

import { ArrowRight, Check, CircleAlert, Lock, MoreHorizontal, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import ProgressBar from "@/components/smartly/ProgressBar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/customer/currency";
import { BUDGET_TONE_PROGRESS, budgetStatus, cashInHand, countLabel, mealRateText, namesList, shortName, whoPaysWhom } from "@/lib/customer/groupDisplay";
import { mealText } from "@/lib/customer/groupMeals";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GROUP_KIND, MemberAvatar } from "./GroupBits";
import type { GroupCardData } from "./groupTypes";

interface GroupCardProps {
  group: GroupCardData;
  onDelete: () => void;
}

// The budget figure's colour: amber from 90%, red over.
const BUDGET_TEXT = { ok: "text-ink-2", warning: "text-warning", over: "text-expense" } as const;

// One group on the list: who is in it, its month's spend, cash in hand and
// what is left to settle (a mess: its meal rate), the budget bar, and a
// line about where the month stands (or a last month still waiting to be
// closed).
export function GroupCard({ group, onDelete }: GroupCardProps) {
  const { t, fmt } = useLocale();
  const { workspace, members, range, settlement, settings, budget, closed, openMonth } = group;
  const mess = settings.kind === "MESS";
  const kind = GROUP_KIND[settings.kind];
  const currency = workspace.currency;
  const money = (value: number) => formatCurrency(value, currency, fmt);
  const href = `/group-expenses/${workspace.id}`;
  const active = members.filter((member) => member.status === "ACTIVE");
  const spent = Number(settlement.totalExpense);
  const cash = cashInHand(settlement);
  const transfers = whoPaysWhom(settlement.members);
  const owed = transfers.reduce((sum, transfer) => sum + transfer.amount, 0);
  // The group's own month: one starting on the 10th is still September on 5 Oct.
  const month = monthName(range.key, fmt);
  const status = budget ? budgetStatus(Number(budget.budgetAmount), spent) : null;
  const shares = active.reduce((sum, m) => sum + Number(m.shareUnits), 0);
  const nameOf = (id: string) => shortName(members.find((member) => member.id === id)?.name);
  const payers = [...new Set(transfers.map((transfer) => transfer.fromId))];
  const payees = [...new Set(transfers.map((transfer) => transfer.toId))];

  // "Arif and Rakib owe Khaled ৳ 1,200 in total" when the payments meet
  // one person (or leave one); otherwise how many there are.
  const owesText =
    payees.length === 1
      ? payers.length === 1
        ? t("{from} owes {to} {amount}", { from: nameOf(payers[0]), to: nameOf(payees[0]), amount: money(owed) })
        : t("{names} owe {to} {amount} in total", { names: namesList(t, payers.map(nameOf)), to: nameOf(payees[0]), amount: money(owed) })
      : countLabel(t, fmt, transfers.length, "{count} payment settles {month} · {amount} in total", "{count} payments settle {month} · {amount} in total", { month, amount: money(owed) });

  const note = openMonth
    ? { icon: <CircleAlert />, text: t("{month} has ended. Close it to lock the numbers", { month: monthName(openMonth.key, fmt) }), tone: "text-ink-soft", href: { pathname: href, query: { tab: "settlement", month: openMonth.key } } }
    : closed
      ? { icon: <Lock />, text: t("{month} is closed and locked.", { month }), tone: "text-ink-soft" }
      : transfers.length > 0
        ? { icon: <CircleAlert />, text: owesText, tone: "text-warning" }
        : { icon: <Check />, text: spent > 0 ? t("Everyone is even so far") : t("Nothing recorded yet this month"), tone: "text-ink-soft" };

  const toSettle = { label: t("To settle"), value: transfers.length === 0 ? t("Even") : countLabel(t, fmt, transfers.length, "{count} payment", "{count} payments"), tone: transfers.length > 0 ? "text-warning" : undefined };
  const stats = mess
    ? [
        { label: t("Spent in {month}", { month }), value: money(spent) },
        { label: t("Meal rate"), value: Number(settlement.mealUnits) > 0 ? mealRateText(settlement.mealRate, currency, fmt) : "—" },
        { label: t("Cash in hand"), value: money(cash), tone: cash < 0 ? "text-expense" : undefined },
      ]
    : [{ label: t("Spent in {month}", { month }), value: money(spent) }, { label: t("Cash in hand"), value: money(cash), tone: cash < 0 ? "text-expense" : undefined }, toSettle];

  return (
    <Card padding="none" className="flex flex-col">
      <div className="flex items-start gap-3.5 px-5 pt-5 pb-4">
        <IconTile tone={kind.tone} size={48}>
          <kind.icon strokeWidth={1.75} />
        </IconTile>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex min-w-0 items-center gap-2">
            <Link href={href} className="truncate text-h3 tracking-normal text-ink hover:text-emerald">
              {workspace.name}
            </Link>
            <Chip tone={kind.tone} className="px-2.25">
              {t(kind.label)}
            </Chip>
          </span>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-small text-ink-muted">
            {active.length > 0 && (
              <span className="flex">
                {active.slice(0, 5).map((member) => (
                  <MemberAvatar key={member.id} member={member} members={members} size={24} className="-mr-1.5 border-2 border-surface" />
                ))}
              </span>
            )}
            <span className={cn("min-w-0", active.length > 0 && "pl-1.5")}>
              {countLabel(t, fmt, active.length, "{count} member", "{count} members")} ·{" "}
              {mess ? t("{meals} meals in {month}", { meals: mealText(Number(settlement.mealUnits), fmt), month }) : `${t("{count} shares", { count: mealText(shares, fmt) })} · ${t(closed ? "{month} closed" : "{month} open", { month })}`}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={t("More actions for {name}", { name: workspace.name })} className="flex size-8.5 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11">
            <MoreHorizontal className="size-4.5" strokeWidth={2.5} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
            <DropdownMenuItem asChild className="rounded-md px-3 py-2 text-body text-ink focus:bg-surface-sunken">
              <Link href={{ pathname: href, query: { tab: "settings" } }}>
                <Settings className="size-4" aria-hidden="true" />
                {t("Settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDelete} className="rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense">
              <Trash2 className="size-4" aria-hidden="true" />
              {t("Delete group")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-3 border-y border-divider">
        {stats.map((stat, i) => (
          <Stat key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} divided={i < stats.length - 1} />
        ))}
      </div>

      <div className="flex flex-col gap-2 px-5 py-3.5">
        <div className="flex flex-wrap justify-between gap-x-3 text-small">
          <span className="text-ink-2">{status ? t("{month} budget {amount}", { month, amount: money(status.budget) }) : t("No budget set for this month")}</span>
          {status && (
            <span className={cn("font-semibold tabular-nums", BUDGET_TEXT[status.tone])}>
              {status.left < 0 ? t("{percent}% · {amount} over", { percent: formatCount(status.percent, fmt), amount: money(-status.left) }) : t("{percent}% · {amount} left", { percent: formatCount(status.percent, fmt), amount: money(status.left) })}
            </span>
          )}
        </div>
        {/* No budget, no bar: an empty "Budget used" bar would say 0% of nothing. */}
        {status && <ProgressBar value={status.percent} tone={BUDGET_TONE_PROGRESS[status.tone]} label={t("Budget used")} valueText={t("{percent}% used", { percent: formatCount(status.percent, fmt) })} />}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-b-card border-t border-divider bg-strip px-5 py-3 text-small">
        <span className={cn("flex min-w-0 items-start gap-1.5 font-medium [&_svg]:mt-px [&_svg]:size-3.75 [&_svg]:shrink-0", note.tone)}>
          {note.icon}
          {note.href ? (
            <Link href={note.href} className="hover:underline">
              {note.text}
            </Link>
          ) : (
            <span>{note.text}</span>
          )}
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
