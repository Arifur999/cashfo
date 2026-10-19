"use client";

import { Banknote, Building2, Calendar, ChevronDown, House, LayoutDashboard, Lock, type LucideIcon, Plus, Receipt, Scale, Settings, UserPlus, Users, UtensilsCrossed, Wallet } from "lucide-react";
import Link from "next/link";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import type { GroupMember, GroupSettings } from "@/lib/customer/api";
import { GROUP_TAB_LABELS, groupTabsFor, type GroupTab } from "@/lib/customer/groupDisplay";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// Each section's icon in the tab bar, as the board draws them.
const TAB_ICONS: Record<GroupTab, LucideIcon> = {
  dashboard: LayoutDashboard,
  meals: UtensilsCrossed,
  members: Users,
  contributions: Banknote,
  expenses: Receipt,
  settlement: Scale,
  settings: Settings,
};

interface GroupHeaderProps {
  businessId: string;
  name: string;
  members: GroupMember[];
  settings: GroupSettings;
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
  onAddMeals: () => void;
  onAddExpense: () => void;
}

// A mess and a family look and read differently, as the board draws them.
const KIND = {
  MESS: { label: "Mess", icon: Building2, tone: "warning" as const, chip: "warning" as const },
  FAMILY: { label: "Family", icon: House, tone: "insights" as const, chip: "insights" as const },
};

// What every page inside a group shares: the group's name and members,
// the month with its Open / Closed state, the two quick actions, and the
// tabs. The sidebar keeps one "Group expenses" item; the tabs live here.
export function GroupHeader({ businessId, name, members, settings, tab, monthKey, months, closed, setup, onMonthChange, onAddMember, onAddContribution, onAddMeals, onAddExpense }: GroupHeaderProps) {
  const { t, locale } = useLocale();
  const active = members.filter((member) => member.status === "ACTIVE");
  const shown = active.slice(0, 5);
  const kind = KIND[settings.kind];
  const mess = settings.kind === "MESS";
  const holder = members.find((member) => member.id === settings.cashHolderMemberId)?.name;
  const shares = active.reduce((sum, member) => sum + Number(member.shareUnits), 0);
  const people = `${active.length} ${t(active.length === 1 ? "member" : "members")}`;
  // "5 members · Manager Khaled · cash with Khaled", "3 members · 8 shares · cash with Khaled".
  const sub = [people, mess ? holder && t("Manager {name}", { name: holder }) : t("{count} shares", { count: Math.round(shares * 100) / 100 }), holder && t("cash with {name}", { name: holder })].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-4">
      <TopbarExtras record={name} />
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <IconTile tone={kind.tone} size={48} className="rounded-lg [&_svg]:size-6">
            <kind.icon strokeWidth={1.9} />
          </IconTile>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="flex min-w-0 items-center gap-3">
              <h1 className="truncate text-h3 text-ink md:text-[22px] md:leading-tight">{name}</h1>
              <Chip tone={kind.chip} size="sm" className="font-semibold">
                {t(kind.label)}
              </Chip>
            </span>
            <div className="flex items-center gap-3 text-small text-ink-muted">
              {shown.length > 0 && (
                <span className="flex">
                  {shown.map((member) => (
                    <PersonAvatar key={member.id} name={member.name} src={member.photoUrl} size={28} coloured className="-mr-1.5 border-2 border-line text-[11px]" />
                  ))}
                </span>
              )}
              <span className={cn("truncate", shown.length > 0 && "pl-1.5")}>
                {setup ? `${t("New group")} · ${people} · ${t("nothing recorded yet")}` : sub}
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
            <Button variant="action" onClick={onAddMember}>
              <UserPlus />
              {t("Add member")}
            </Button>
          ) : (
            <>
              {mess ? (
                <Button variant="secondary" onClick={onAddMeals}>
                  <UtensilsCrossed />
                  {t("Add meals")}
                </Button>
              ) : (
                <Button variant="secondary" onClick={onAddContribution}>
                  <Wallet />
                  {t("Add contribution")}
                </Button>
              )}
              <Button variant="action" onClick={onAddExpense}>
                <Plus strokeWidth={2.25} />
                {t("Add expense")}
              </Button>
            </>
          )}
        </div>
      </div>

      <nav role="tablist" aria-label={t("Group sections")} className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
        {groupTabsFor(settings.kind, settings.mealsOn).map((value) => {
          const on = value === tab;
          const Icon = TAB_ICONS[value];
          return (
            <Link
              key={value}
              role="tab"
              aria-selected={on}
              href={{ pathname: `/group-expenses/${businessId}`, query: { tab: value, month: monthKey } }}
              className={cn("relative flex h-10.5 shrink-0 items-center gap-2 px-3 text-body transition-colors", on ? "font-semibold text-emerald" : "font-medium text-ink-2 hover:text-ink")}
            >
              <Icon className={cn("size-4 shrink-0", on ? "text-emerald" : "text-ink-muted")} aria-hidden="true" />
              {t(GROUP_TAB_LABELS[value])}
              {on && <span aria-hidden="true" className="absolute right-2 -bottom-px left-2 h-0.5 rounded-sm bg-emerald" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
