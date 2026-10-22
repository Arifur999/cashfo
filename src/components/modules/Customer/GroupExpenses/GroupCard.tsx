"use client";

import { ArrowRight, Building2, Check, CircleAlert, House, Lock, MoreHorizontal, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import ProgressBar from "@/components/smartly/ProgressBar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/customer/currency";
import { BUDGET_TONE_PROGRESS, BUDGET_TONE_TEXT, budgetStatus, cashInHand, countLabel, whoPaysWhom } from "@/lib/customer/groupDisplay";
import { mealText } from "@/lib/customer/groupMeals";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { GroupCardData } from "./groupTypes";

interface GroupCardProps {
  group: GroupCardData;
  onDelete: () => void;
}

// One group on the list: who is in it, its month's spend, cash in hand and
// what is left to settle, the budget bar, and a line about where the month
// stands (or a last month still waiting to be closed).
export function GroupCard({ group, onDelete }: GroupCardProps) {
  const { t, locale } = useLocale();
  const { workspace, members, range, settlement, settings, budget, closed, openMonth } = group;
  const mess = settings.kind === "MESS";
  const currency = workspace.currency;
  const href = `/group-expenses/${workspace.id}`;
  const active = members.filter((member) => member.status === "ACTIVE");
  const spent = Number(settlement.totalExpense);
  const cash = cashInHand(settlement);
  const transfers = whoPaysWhom(settlement.members);
  const owed = transfers.reduce((sum, transfer) => sum + transfer.amount, 0);
  // The group's own month: one starting on the 10th is still September on 5 Oct.
  const month = monthName(range.key, locale);
  const status = budget ? budgetStatus(Number(budget.budgetAmount), spent) : null;
  const shares = active.reduce((sum, m) => sum + Number(m.shareUnits), 0);

  const note = openMonth
    ? { icon: <CircleAlert />, text: t("{month} is still open", { month: monthName(openMonth.key, locale) }), tone: "text-warning" }
    : closed
      ? { icon: <Lock />, text: t("{month} is closed and locked.", { month }), tone: "text-ink-2" }
      : transfers.length > 0
        ? { icon: <CircleAlert />, text: countLabel(t, locale, transfers.length, "{count} payment settles {month} · {amount} in total", "{count} payments settle {month} · {amount} in total", { month, amount: formatCurrency(owed, currency) }), tone: "text-warning" }
        : { icon: <Check />, text: spent > 0 ? t("Everyone is even so far") : t("Nothing recorded yet this month"), tone: "text-ink-2" };

  return (
    <Card padding="none" className="flex flex-col">
      <div className="flex items-start gap-4 px-5 pt-5 pb-4">
        <IconTile tone={mess ? "warning" : "insights"} size={48} className="rounded-lg [&_svg]:size-6">
          {mess ? <Building2 strokeWidth={1.9} /> : <House strokeWidth={1.9} />}
        </IconTile>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <Link href={href} className="truncate text-h3 text-ink hover:text-emerald">
              {workspace.name}
            </Link>
            <Chip tone={mess ? "warning" : "insights"} size="sm" className="shrink-0 font-semibold">
              {t(mess ? "Mess" : "Family")}
            </Chip>
          </span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink-muted">
            {active.length > 0 && (
              <span className="flex">
                {active.slice(0, 5).map((member) => (
                  <PersonAvatar key={member.id} name={member.name} src={member.photoUrl} size={28} coloured className="-mr-1.5 border-2 border-surface" />
                ))}
              </span>
            )}
            <span className={cn("min-w-0", active.length > 0 && "pl-1.5")}>
              {countLabel(t, locale, active.length, "{count} member", "{count} members")} ·{" "}
              {mess ? t("{meals} meals in {month}", { meals: mealText(Number(settlement.mealUnits), locale), month }) : `${t("{count} shares", { count: mealText(shares, locale) })} · ${t(closed ? "{month} closed" : "{month} open", { month })}`}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={t("More actions for {name}", { name: workspace.name })} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11">
            <MoreHorizontal className="size-4.5" aria-hidden="true" />
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
        <Stat label={t("Spent in {month}", { month })} value={formatCurrency(spent, currency)} divided />
        <Stat label={t("Cash in hand")} value={formatCurrency(cash, currency)} tone={cash < 0 ? "text-expense" : undefined} divided />
        <Stat label={t("To settle")} value={transfers.length === 0 ? t("Even") : countLabel(t, locale, transfers.length, "{count} payment", "{count} payments")} tone={transfers.length > 0 ? "text-warning" : undefined} />
      </div>

      <div className="flex flex-col gap-2 px-5 py-4">
        <div className="flex flex-wrap justify-between gap-x-3 text-small">
          <span className="text-ink-2">{status ? t("{month} budget {amount}", { month, amount: formatCurrency(status.budget, currency) }) : t("No budget set for this month")}</span>
          {status && (
            <span className={cn("font-semibold tabular-nums", BUDGET_TONE_TEXT[status.tone])}>
              {status.left < 0 ? t("{percent}% · {amount} over", { percent: formatCount(status.percent, locale), amount: formatCurrency(-status.left, currency) }) : t("{percent}% · {amount} left", { percent: formatCount(status.percent, locale), amount: formatCurrency(status.left, currency) })}
            </span>
          )}
        </div>
        {/* No budget, no bar: an empty "Budget used" bar would say 0% of nothing. */}
        {status && <ProgressBar value={status.percent} tone={BUDGET_TONE_PROGRESS[status.tone]} label={t("Budget used")} valueText={t("{percent}% used", { percent: formatCount(status.percent, locale) })} />}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 rounded-b-lg border-t border-divider bg-strip px-5 py-3 text-small">
        <span className={cn("flex min-w-0 items-start gap-2 font-medium [&_svg]:mt-px [&_svg]:size-4 [&_svg]:shrink-0", note.tone)}>
          {note.icon}
          <span>
            {note.text}
            {openMonth && (
              <>
                {" · "}
                <Link href={{ pathname: href, query: { tab: "settlement", month: openMonth.key } }} className="font-semibold underline underline-offset-2 hover:text-ink">
                  {t("Close it")}
                </Link>
              </>
            )}
          </span>
        </span>
        <Link href={href} className="ml-auto flex shrink-0 items-center gap-1 font-semibold text-emerald hover:text-emerald-hover">
          {t("Open group")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
}

function Stat({ label, value, tone, divided = false }: { label: string; value: string; tone?: string; divided?: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-col justify-between gap-1 px-3 py-4 md:px-5", divided && "border-r border-divider")}>
      <span className="text-caption font-normal text-ink-muted">{label}</span>
      <span className={cn("text-title wrap-break-word text-ink tabular-nums md:text-h3", tone)}>{value}</span>
    </div>
  );
}
