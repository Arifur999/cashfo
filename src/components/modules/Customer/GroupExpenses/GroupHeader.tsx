"use client";

import { Banknote, Calendar, ChevronDown, ChevronLeft, LayoutDashboard, Lock, type LucideIcon, Plus, Receipt, Scale, Settings, UserPlus, Users, Utensils } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { useEffect } from "react";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import { useScrollFades } from "@/hooks/useScrollFades";
import type { GroupMember, GroupSettings } from "@/lib/customer/api";
import { countLabel, GROUP_TAB_LABELS, groupTabsFor, type GroupTab, shortName } from "@/lib/customer/groupDisplay";
import { mealText } from "@/lib/customer/groupMeals";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { asStatus } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";
import { GROUP_KIND, MemberAvatar } from "./GroupBits";

// Each section's icon in the tab bar, as the board draws them.
const TAB_ICONS: Record<GroupTab, LucideIcon> = {
  dashboard: LayoutDashboard,
  meals: Utensils,
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

// The line under a tab: solid on the one on show, pulsing on the one just
// pressed while its page loads. Always drawn, so nothing shifts.
function TabLine({ on }: { on: boolean }) {
  const { pending } = useLinkStatus();
  return <span aria-hidden="true" className={cn("absolute right-2 -bottom-px left-2 h-0.5 rounded-sm transition-opacity max-md:hidden", on ? "bg-emerald" : pending ? "animate-pulse bg-emerald/50 motion-reduce:animate-none" : "opacity-0")} />;
}

// What every page inside a group shares: the group's name and members,
// the month with its Open / Closed state, the two quick actions, and the
// sections. The sidebar keeps one "Group expenses" item; the sections live
// here, as links (each loads its page).
export function GroupHeader({ businessId, name, members, settings, tab, monthKey, months, closed, setup, onMonthChange, onAddMember, onAddContribution, onAddMeals, onAddExpense }: GroupHeaderProps) {
  const { t, locale } = useLocale();
  const active = members.filter((member) => member.status === "ACTIVE");
  const shown = active.slice(0, 5);
  const kind = GROUP_KIND[settings.kind];
  const mess = settings.kind === "MESS";
  const holderName = members.find((member) => member.id === settings.cashHolderMemberId)?.name;
  const holder = holderName ? shortName(holderName) : undefined;
  const shares = active.reduce((sum, member) => sum + Number(member.shareUnits), 0);
  const people = countLabel(t, locale, active.length, "{count} member", "{count} members");
  // "5 members · Manager Khaled · cash with Khaled" (the manager keeps a
  // mess's cash), "3 members · 8 shares · cash with Khaled".
  const sub = (mess ? [people, holder && t("Manager {name}", { name: holder }), holder && t("cash with {name}", { name: holder })] : [people, t("{count} shares", { count: mealText(shares, locale) }), holder && t("cash with {name}", { name: holder })]).filter(Boolean).join(" · ");
  // The tab bar scrolls sideways on a phone; its edges fade while there is
  // more beyond them. A section opened from elsewhere (a card's Settings)
  // may sit past the edge, so the one on show is brought to the middle of
  // the bar whenever the tab changes, without moving the page.
  const { ref: tabsRef, style: tabsStyle } = useScrollFades<HTMLElement>({ axis: "x", fade: 32 });
  useEffect(() => {
    const bar = tabsRef.current;
    const link = bar?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!bar || !link || bar.scrollWidth <= bar.clientWidth) return;
    bar.scrollLeft = link.offsetLeft - (bar.clientWidth - link.offsetWidth) / 2;
  }, [tabsRef, tab]);

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <TopbarExtras record={name} />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-1 md:gap-4">
          {/* A phone leads back to the list from here (the board's own bar). */}
          <Link href="/group-expenses" aria-label={t("Back to Group Expense")} className="-ml-2.5 flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface-sunken md:hidden">
            <ChevronLeft className="size-5.5" aria-hidden="true" />
          </Link>
          <IconTile tone={kind.tone} size={48} className="size-control-lg rounded-[14px] max-md:hidden [&_svg]:size-6.5">
            <kind.icon strokeWidth={1.75} />
          </IconTile>
          <div className="flex min-w-0 flex-1 flex-col md:gap-1.5">
            <span className="flex min-w-0 items-center gap-1.5 md:gap-2.5">
              {/* Normal line height: a tight one clips Bangla vowel signs under the truncation. */}
              <h1 className="truncate text-title text-ink md:text-page-title md:leading-normal">{name}</h1>
              <Chip tone={kind.tone} className="px-2.25 max-md:h-4.5 max-md:px-1.75 max-md:text-[11px]">
                {t(kind.label)}
              </Chip>
            </span>
            <span className="truncate text-caption text-ink-muted md:hidden">{t(closed ? "{month} · closed" : "{month} · open", { month: monthName(monthKey, locale, "long", true) })}</span>
            <div className="hidden items-center gap-2.5 text-small text-ink-muted md:flex">
              {shown.length > 0 && (
                <span className="flex">
                  {shown.map((member) => (
                    <MemberAvatar key={member.id} member={member} members={members} size={24} className="-mr-1.5 border-2 border-strip" />
                  ))}
                </span>
              )}
              <span className={cn("truncate", shown.length > 0 && "pl-1.5")}>{setup ? `${t("New group")} · ${people} · ${t("nothing recorded yet")}` : sub}</span>
            </div>
          </div>
          {/* A phone picks the month from a round button. */}
          <label className="relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-input bg-surface text-ink-2 focus-within:border-emerald md:hidden pointer-coarse:size-11">
            <Calendar className="size-4.5" aria-hidden="true" />
            <select value={monthKey} onChange={(event) => onMonthChange(event.target.value)} aria-label={t("Choose month")} className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0">
              {months.map((key) => (
                <option key={key} value={key}>
                  {monthName(key, locale, "long", true)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={cn("gap-2 md:flex md:flex-wrap md:items-center md:gap-3", setup ? "flex" : "grid grid-cols-2")}>
          {/* The select covers the whole frame, so the chevron and the chip open it too. */}
          <label className="relative hidden h-10 cursor-pointer items-center gap-2 rounded-field border border-input bg-surface pr-3 pl-3 text-body font-semibold text-ink focus-within:border-emerald focus-within:shadow-[0_0_0_0.5px_var(--emerald),0_0_0_4px_var(--mint-50)] hover:border-ink-muted md:flex pointer-coarse:h-11">
            <Calendar className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <span aria-hidden="true">{monthName(monthKey, locale, "long", true)}</span>
            <Chip id="group-month-status" tone={closed ? "neutral" : "mint"} size="sm" className={cn("h-5 gap-1 px-2", closed ? "text-ink-soft" : "text-emerald")}>
              {closed && <Lock className="size-2.75" strokeWidth={2.5} aria-hidden="true" />}
              {t(asStatus(closed ? "Closed" : "Open"))}
            </Chip>
            <ChevronDown className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
            <select value={monthKey} onChange={(event) => onMonthChange(event.target.value)} aria-label={t("Choose month")} aria-describedby="group-month-status" className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0">
              {months.map((key) => (
                <option key={key} value={key}>
                  {monthName(key, locale, "long", true)}
                </option>
              ))}
            </select>
          </label>
          {setup ? (
            <Button variant="action" onClick={onAddMember} className="max-md:flex-1">
              <UserPlus />
              {t("Add member")}
            </Button>
          ) : (
            <>
              {mess ? (
                <Button variant="secondary" onClick={onAddMeals} className="px-3.5 [&_svg]:text-ink-soft">
                  <Utensils />
                  {t("Add meals")}
                </Button>
              ) : (
                <Button variant="secondary" onClick={onAddContribution} className="px-3.5 [&_svg]:text-ink-soft">
                  <Banknote />
                  {t("Add contribution")}
                </Button>
              )}
              <Button variant="action" onClick={onAddExpense} className="gap-1.5">
                <Plus strokeWidth={2.5} />
                {t("Add expense")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Pills on a phone, a tab bar with a line under it from md up. */}
      <nav ref={tabsRef} style={tabsStyle} aria-label={t("Group sections")} className="-mx-4 flex gap-1.5 overflow-x-auto border-y border-line bg-surface px-4 py-2.5 scrollbar-none md:mx-0 md:gap-1 md:border-t-0 md:bg-transparent md:px-0 md:py-0 [&::-webkit-scrollbar]:hidden">
        {groupTabsFor(settings.kind, settings.mealsOn).map((value) => {
          const on = value === tab;
          const Icon = TAB_ICONS[value];
          return (
            <Link
              key={value}
              aria-current={on ? "page" : undefined}
              href={{ pathname: `/group-expenses/${businessId}`, query: { tab: value, month: monthKey } }}
              className={cn(
                "relative flex shrink-0 items-center gap-2 transition-colors max-md:h-8.5 max-md:rounded-full max-md:px-3.5 max-md:text-small md:h-10.5 md:px-3 md:text-body md:focus-visible:-outline-offset-2 md:pointer-coarse:h-11",
                on ? "font-semibold max-md:bg-emerald max-md:text-on-action md:text-emerald" : "font-medium max-md:border max-md:border-line max-md:bg-surface max-md:text-ink-2 md:text-ink-soft md:hover:text-ink",
              )}
            >
              <Icon className={cn("size-4 shrink-0 max-md:hidden", on ? "text-emerald" : "text-ink-muted")} aria-hidden="true" />
              {t(GROUP_TAB_LABELS[value])}
              <TabLine on={on} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
