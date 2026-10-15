"use client";

import { ArrowRight, Check, CircleAlert, Lock, MoreVertical, Settings, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Card from "@/components/smartly/Card";
import IconTile from "@/components/smartly/IconTile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/customer/currency";
import { BUDGET_TONE_BAR, BUDGET_TONE_TEXT, budgetStatus, cashInHand, whoPaysWhom } from "@/lib/customer/groupDisplay";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { GroupCardData } from "./groupTypes";

interface GroupCardProps {
  group: GroupCardData;
  monthKey: string;
  // Today is past the month's end, so an open month is waiting to be closed.
  monthEnded: boolean;
  onDelete: () => void;
}

// One group on the list: who is in it, the month's spend, cash in hand
// and what is left to settle, the budget bar, and a line about where the
// month stands.
export function GroupCard({ group, monthKey, monthEnded, onDelete }: GroupCardProps) {
  const { t, locale } = useLocale();
  const { workspace, members, settlement, budget, closed } = group;
  const currency = workspace.currency;
  const href = `/group-expenses/${workspace.id}`;
  const active = members.filter((member) => member.status === "ACTIVE");
  const spent = Number(settlement.totalExpense);
  const cash = cashInHand(settlement);
  const transfers = whoPaysWhom(settlement.members);
  const owed = transfers.reduce((sum, transfer) => sum + transfer.amount, 0);
  const month = monthName(monthKey, locale);
  const status = budget ? budgetStatus(Number(budget.budgetAmount), spent) : null;

  const note = closed
    ? { icon: <Lock />, text: `${month} ${t("is closed and locked.")}`, tone: "text-ink-2" }
    : transfers.length > 0
      ? { icon: <CircleAlert />, text: `${transfers.length} ${t(transfers.length === 1 ? "payment settles" : "payments settle")} ${month} · ${formatCurrency(owed, currency)} ${t("in total")}`, tone: "text-warning" }
      : monthEnded
        ? { icon: <CircleAlert />, text: `${month} ${t("has ended. Close it to lock the numbers")}`, tone: "text-ink-2" }
        : { icon: <Check />, text: spent > 0 ? t("Everyone is even so far") : t("Nothing recorded yet this month"), tone: "text-ink-2" };

  return (
    <Card padding="none" className="flex flex-col">
      <div className="flex items-start gap-4 px-5 pt-5 pb-4">
        <IconTile tone="money" size={48} className="rounded-lg [&_svg]:size-6">
          <Users strokeWidth={1.9} />
        </IconTile>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Link href={href} className="truncate text-h3 text-ink hover:text-emerald">
            {workspace.name}
          </Link>
          <div className="flex items-center gap-3 text-small text-ink-muted">
            {active.length > 0 && (
              <span className="flex">
                {active.slice(0, 5).map((member) => (
                  <PersonAvatar key={member.id} name={member.name} src={member.photoUrl} size={28} coloured className="-mr-1.5 border-2 border-surface text-[11px]" />
                ))}
              </span>
            )}
            <span className={cn("truncate", active.length > 0 && "pl-1.5")}>
              {active.length} {t(active.length === 1 ? "member" : "members")} · {month} {t(closed ? "closed" : "open")}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={`${t("More actions for")} ${workspace.name}`} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-cream data-open:bg-cream">
            <MoreVertical className="size-4.5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
            <DropdownMenuItem asChild className="rounded-md px-3 py-2 text-body text-ink focus:bg-cream">
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

      <div className="grid grid-cols-3 border-y border-surface-sunken">
        <Stat label={`${t("Spent in")} ${month}`} value={formatCurrency(spent, currency)} divided />
        <Stat label={t("Cash in hand")} value={formatCurrency(cash, currency)} tone={cash < 0 ? "text-expense" : undefined} divided />
        <Stat label={t("To settle")} value={transfers.length === 0 ? t("Even") : `${transfers.length} ${t(transfers.length === 1 ? "payment" : "payments")}`} tone={transfers.length > 0 ? "text-warning" : undefined} />
      </div>

      <div className="flex flex-col gap-2 px-5 py-4">
        <div className="flex justify-between text-small">
          <span className="text-ink-2">{status ? `${month} ${t("budget")} ${formatCurrency(status.budget, currency)}` : t("No budget set for this month")}</span>
          {status && (
            <span className={cn("font-semibold tabular-nums", BUDGET_TONE_TEXT[status.tone])}>
              {status.percent}% · {status.left < 0 ? `${formatCurrency(-status.left, currency)} ${t("over")}` : `${formatCurrency(status.left, currency)} ${t("left")}`}
            </span>
          )}
        </div>
        <span role="progressbar" aria-label={t("Budget used")} aria-valuenow={status?.percent ?? 0} aria-valuemin={0} aria-valuemax={100} className="block h-2 overflow-hidden rounded-full bg-surface-sunken">
          {status && <span className={cn("block h-full rounded-full", BUDGET_TONE_BAR[status.tone])} style={{ width: `${Math.min(100, status.percent)}%` }} />}
        </span>
      </div>

      <div className="flex items-center gap-3 rounded-b-lg border-t border-surface-sunken bg-cream px-5 py-3 text-small">
        <span className={cn("flex min-w-0 items-center gap-2 font-medium [&_svg]:size-4 [&_svg]:shrink-0", note.tone)}>
          {note.icon}
          <span className="truncate">{note.text}</span>
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
    <div className={cn("flex flex-col gap-1 px-5 py-4", divided && "border-r border-surface-sunken")}>
      <span className="text-caption font-normal text-ink-muted">{label}</span>
      <span className={cn("text-h3 text-ink tabular-nums", tone)}>{value}</span>
    </div>
  );
}
