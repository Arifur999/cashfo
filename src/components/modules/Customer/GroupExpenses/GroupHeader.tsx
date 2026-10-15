"use client";

import { Calendar, ChevronDown, Lock, Plus, UserPlus, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import type { GroupMember } from "@/lib/customer/api";
import { GROUP_TAB_LABELS, GROUP_TABS, type GroupTab } from "@/lib/customer/groupDisplay";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface GroupHeaderProps {
  businessId: string;
  name: string;
  members: GroupMember[];
  tab: GroupTab;
  monthKey: string;
  // The months the picker offers, newest first.
  months: string[];
  closed: boolean;
  // A brand-new group: the only action is adding members.
  setup: boolean;
  onMonthChange: (key: string) => void;
  onAddMember: () => void;
  onAddContribution: () => void;
  onAddExpense: () => void;
}

// What every page inside a group shares: the group's name and members,
// the month with its Open / Closed state, the two quick actions, and the
// tabs. The sidebar keeps one "Group expenses" item; the tabs live here.
export function GroupHeader({ businessId, name, members, tab, monthKey, months, closed, setup, onMonthChange, onAddMember, onAddContribution, onAddExpense }: GroupHeaderProps) {
  const { t, locale } = useLocale();
  const active = members.filter((member) => member.status === "ACTIVE");
  const shown = active.slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <IconTile tone="money" size={48} className="rounded-lg [&_svg]:size-6">
            <Users strokeWidth={1.9} />
          </IconTile>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="truncate text-h3 text-ink md:text-[22px] md:leading-tight">{name}</h1>
            <div className="flex items-center gap-3 text-small text-ink-muted">
              {shown.length > 0 && (
                <span className="flex">
                  {shown.map((member) => (
                    <PersonAvatar key={member.id} name={member.name} src={member.photoUrl} size={28} coloured className="-mr-1.5 border-2 border-line text-[11px]" />
                  ))}
                </span>
              )}
              <span className={cn("truncate", shown.length > 0 && "pl-1.5")}>
                {setup ? `${t("New group")} · ${active.length} ${t(active.length === 1 ? "member" : "members")} · ${t("nothing recorded yet")}` : `${active.length} ${t(active.length === 1 ? "member" : "members")}`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="relative flex h-10 items-center gap-2 rounded-md border border-line-strong bg-surface pr-3 pl-3 text-body font-semibold text-ink focus-within:border-emerald focus-within:shadow-[0_0_0_0.5px_var(--emerald),0_0_0_4px_var(--mint-50)]">
            <Calendar className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <span className="sr-only">{t("Choose month")}</span>
            <select value={monthKey} onChange={(event) => onMonthChange(event.target.value)} className="appearance-none bg-transparent pr-1 font-semibold outline-none">
              {months.map((key) => (
                <option key={key} value={key}>
                  {monthName(key, locale, "long", true)}
                </option>
              ))}
            </select>
            <Chip tone={closed ? "neutral" : "mint"} size="sm" className="gap-1">
              {closed && <Lock className="size-3" aria-hidden="true" />}
              {t(closed ? "Closed" : "Open")}
            </Chip>
            <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          </label>
          {setup ? (
            <Button onClick={onAddMember}>
              <UserPlus />
              {t("Add member")}
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onAddContribution}>
                <Wallet />
                {t("Add contribution")}
              </Button>
              <Button onClick={onAddExpense}>
                <Plus strokeWidth={2.25} />
                {t("Add expense")}
              </Button>
            </>
          )}
        </div>
      </div>

      <nav role="tablist" aria-label={t("Group sections")} className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
        {GROUP_TABS.map((value) => {
          const on = value === tab;
          return (
            <Link
              key={value}
              role="tab"
              aria-selected={on}
              href={{ pathname: `/group-expenses/${businessId}`, query: { tab: value, month: monthKey } }}
              className={cn("relative flex h-10.5 shrink-0 items-center gap-2 px-3 text-body transition-colors", on ? "font-semibold text-emerald" : "font-medium text-ink-2 hover:text-ink")}
            >
              {t(GROUP_TAB_LABELS[value])}
              {on && <span aria-hidden="true" className="absolute right-2 -bottom-px left-2 h-0.5 rounded-sm bg-emerald" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
