"use client";

import {
  ArrowLeftRight,
  Banknote,
  BookOpen,
  BookText,
  Box,
  ChartColumn,
  ChartPie,
  ChevronDown,
  ChevronRight,
  CircleCheckBig,
  Clock,
  Gift,
  CalendarDays,
  Sparkles,
  GraduationCap,
  HandCoins,
  House,
  KeyRound,
  Landmark,
  LayoutDashboard,
  ListChecks,
  type LucideProps,
  MoonStar,
  PenLine,
  Goal,
  Settings,
  TrendingUp,
  Trophy,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { GROUP_NAV_HREF, useGroupPages } from "@/components/modules/Customer/GroupExpenses/groupNav";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { useTodayTasks } from "@/components/modules/Customer/Providers/TodayTasksProvider";
import { MosqueIcon } from "@/components/smartly/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { findNavLocation, menuSections, NAV_FOOT, NAV_SECTIONS, navAppFor, visibleNavSections, type NavApp, type NavIcon, type NavItem, type NavLocation, type NavSection } from "@/lib/customer/nav";
import { leafHref } from "@/lib/customer/paletteMatch";
import { HABITS_CHANGED } from "@/lib/customer/habitsEvents";
import { getHabitsTodayCountAction } from "@/lib/customer/shellActions";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The menus' icons: the boards' own lucide glyphs.
export const NAV_ICONS: Record<NavIcon, React.ComponentType<LucideProps>> = {
  dashboard: LayoutDashboard,
  home: House,
  transactions: ArrowLeftRight,
  balance: Landmark,
  wallet: Wallet,
  budget: ChartPie,
  income: TrendingUp,
  loans: Banknote,
  // The boards' goal mark (a flag in a target), v4.
  savings: Goal,
  assets: Box,
  group: Users,
  today: CircleCheckBig,
  daily: CircleCheckBig,
  namaz: MosqueIcon,
  ramadan: MoonStar,
  library: BookOpen,
  skills: GraduationCap,
  todo: ListChecks,
  vault: KeyRound,
  insights: ChartPie,
  reports: ChartColumn,
  challenges: Trophy,
  ledger: BookText,
  people: UsersRound,
  clock: Clock,
  journal: PenLine,
  gift: Gift,
  events: CalendarDays,
  ai: Sparkles,
  zakat: HandCoins,
  settings: Settings,
};

// Uses the shell's providers for what the menu depends on: the workspace
// (Books) and the member's role in it (Journal entry) and the feature flags
// (Loan Management). allRoles keeps the items a staff member can't use, for
// working out which page is open: a staff member who opens Journal entry by
// its address is on Journal entry, not on the nearest row the menu shows.
export function useNavSections({ allRoles = false }: { allRoles?: boolean } = {}) {
  const { activeBusiness } = useAuth();
  const loansOn = useFeature("loan_management");
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  return visibleNavSections({ workspaceType: activeBusiness?.type, isFeatureOn: (key) => (key === "loan_management" ? loansOn : true), canManage: allRoles || canManage });
}

// The page on screen, as the menus name it, and which app it is in. A page
// this workspace hides (Books outside a business, Loans switched off) still
// has a name.
export function useNavLocation(): { app: NavApp; location: NavLocation | null } {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sections = useNavSections({ allRoles: true });
  const location = findNavLocation(pathname, searchParams, sections) ?? findNavLocation(pathname, searchParams, NAV_SECTIONS);
  return { app: navAppFor(pathname), location };
}

// The one group the customer opened or closed, kept in this browser so it
// stays across pages and reloads: "" leaves the page on screen's group
// open, "-" closes them all, an href opens that group alone (opening one
// closes the one before). One store for the sidebar and the phone drawer.
// When storage refuses (a private window, blocked site data) the choice
// lasts until the tab closes.
function storedMenuChoice(key: string) {
  const listeners = new Set<() => void>();
  let inMemory = "";
  let refused = false;
  const read = (): string => {
    if (refused) return inMemory;
    try {
      return window.localStorage.getItem(key) ?? "";
    } catch {
      refused = true;
      return inMemory;
    }
  };
  const write = (value: string) => {
    inMemory = value;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      refused = true;
    }
    for (const listener of listeners) listener();
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    // Another tab opened or closed a group.
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };
  return { read, write, subscribe };
}

const openGroups = storedMenuChoice("smartly.sidebar.group");
const readOpenGroups = openGroups.read;
const writeOpenGroups = openGroups.write;
const subscribeOpenGroups = openGroups.subscribe;

// The Habit Tracker's groups (HabitSidebar): each opens and closes on its
// own, several at a time, kept as {"<group's link>": open}. A group the
// customer never touched is open while one of its pages is on screen.
const habitGroups = storedMenuChoice("smartly.sidebar.habit-groups");

function parseHabitGroups(raw: string): Record<string, boolean> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"));
  } catch {
    return {};
  }
}

function useHabitGroups(location: NavLocation | null) {
  const raw = useSyncExternalStore(habitGroups.subscribe, habitGroups.read, nothingRemembered);
  const chosen = parseHabitGroups(raw);
  const isExpanded = (item: NavItem) => !!item.subs && (chosen[leafHref(item)] ?? location?.item === item);
  const toggle = (item: NavItem) => habitGroups.write(JSON.stringify({ ...chosen, [leafHref(item)]: !isExpanded(item) }));
  return { isExpanded, toggle };
}

// The server can't see this browser's choice, so the server render and
// hydration open only the current page's group; the remembered one opens
// right after.
const nothingRemembered = () => "";

// Whether a Money Tracker group shows its pages: one group at a time, the
// page on screen's until the customer opens another or closes it. Moving
// to a page of another group (or none) starts from that page's group again.
export function useExpandedGroups(location: NavLocation | null) {
  const chosen = useSyncExternalStore(subscribeOpenGroups, readOpenGroups, nothingRemembered);
  // Inside a group, Group Expense holds the group's pages.
  const groupPages = useGroupPages();
  const current = location?.item.subs ? location.item.href : groupPages && location?.item.href === GROUP_NAV_HREF ? GROUP_NAV_HREF : null;
  const shownFor = useRef(current);
  useEffect(() => {
    if (shownFor.current === current) return;
    shownFor.current = current;
    if (readOpenGroups() !== "") writeOpenGroups("");
  }, [current]);
  const hasPages = (item: NavItem) => !!item.subs || (!!groupPages && item.href === GROUP_NAV_HREF);
  const isExpanded = (item: NavItem) => hasPages(item) && (chosen === "" ? current === item.href : chosen === item.href);
  const toggle = (item: NavItem) => writeOpenGroups(isExpanded(item) ? "-" : item.href);
  return { isExpanded, toggle };
}

// Today's habits done out of those planned, for Daily habits' "3/5". Read
// when the Habit Tracker menu shows and again after each page change there
// (a tick on the dashboard or the daily page moves it).
function useHabitsToday(enabled: boolean): { done: number; total: number } | null {
  const pathname = usePathname();
  const [count, setCount] = useState<{ done: number; total: number } | null>(null);
  // Bumped by a tick anywhere on the page.
  const [ticks, setTicks] = useState(0);
  useEffect(() => {
    const onTick = () => setTicks((value) => value + 1);
    window.addEventListener(HABITS_CHANGED, onTick);
    return () => window.removeEventListener(HABITS_CHANGED, onTick);
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void getHabitsTodayCountAction()
      .catch(() => null)
      .then((result) => {
        if (!cancelled) setCount(result);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, pathname, ticks]);
  return enabled ? count : null;
}

// A folded sidebar's row: just its icon, with the name in a tooltip on the
// right (and still the link's accessible name).
export function RailTip({ label, show, children }: { label: string; show: boolean; children: React.ReactElement }) {
  if (!show) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

interface MenuProps {
  // Folded to its icons (the desktop sidebar's rail).
  collapsed?: boolean;
  // The phone drawer: 44px rows, for a finger.
  touch?: boolean;
  className?: string;
  style?: React.CSSProperties;
  navRef?: React.Ref<HTMLElement>;
}

// Brings the open page's row into view when the menu mounts (the phone
// drawer opening too) and after each navigation; "nearest" leaves a row
// already in view where it is.
function useCurrentRowInView() {
  const pathname = usePathname();
  const searchKey = useSearchParams().toString();
  const rows = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rows.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
  }, [pathname, searchKey]);
  return rows;
}

const SCROLLER = "relative min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

// The Money Tracker menu (AppSidebar): rows of 38px in sections (no names,
// as the board draws it), and a group's pages on a line under it, the open
// one in a tinted pill. A closed group's name opens it and its first page;
// an open group's name, or its chevron, closes it. One group is open at a
// time.
export function MoneyMenu({ collapsed = false, touch = false, className, style, navRef }: MenuProps) {
  const { t } = useLocale();
  const sections = menuSections(useNavSections(), "money");
  const { location } = useNavLocation();
  const { isExpanded, toggle } = useExpandedGroups(location);
  const groupPages = useGroupPages();
  const baseId = useId();
  const rows = useCurrentRowInView();

  const renderItem = (item: NavItem) => {
    const Icon = NAV_ICONS[item.icon];
    // A group's own pages, built from the address (Dashboard, Cash book…).
    const pages = groupPages && item.href === GROUP_NAV_HREF ? groupPages : null;
    const subs = pages
      ? pages.links.map((link) => ({ label: link.label, href: link.href, on: link.tab === pages.current }))
      : item.subs?.filter((sub) => sub.menu !== false).map((sub) => ({ label: sub.label, href: leafHref(sub), on: location?.sub === sub || location?.sub?.litAs === sub.href }));
    const self = location?.item === item && !location.sub && !pages;
    const inGroup = !!subs && location?.item === item;
    const expanded = isExpanded(item);
    if (collapsed) {
      const lit = self || inGroup;
      return (
        <RailTip key={item.href} label={t(item.label)} show>
          <Link
            href={leafHref(item)}
            aria-current={self ? "page" : undefined}
            aria-label={t(item.label)}
            className={cn("flex h-9.5 shrink-0 items-center justify-center rounded-md transition-colors", lit ? "bg-emerald-soft text-emerald" : "text-ink-muted hover:bg-surface-sunken hover:text-ink")}
          >
            <Icon className="size-4.5" strokeWidth={2} aria-hidden="true" />
          </Link>
        </RailTip>
      );
    }
    const subsId = `${baseId}-pages${item.href.replace(/[^\w-]/g, "-")}`;
    const Chevron = expanded ? ChevronDown : ChevronRight;
    return (
      <div key={item.href} className="flex flex-col">
        <div className="relative flex">
          <Link
            href={leafHref(item)}
            aria-current={self ? "page" : undefined}
            onClick={(event) => {
              if (!subs) return;
              // Open: the name folds the group away and stays on this page.
              if (expanded) event.preventDefault();
              toggle(item);
            }}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2.5 rounded-md pl-3 text-body whitespace-nowrap transition-colors",
              touch ? "h-11" : "h-9.5",
              subs ? "pr-9" : "pr-2.5",
              self ? "bg-emerald-soft font-semibold text-emerald" : inGroup ? "font-semibold text-ink hover:bg-surface-sunken" : "font-medium text-ink-2 hover:bg-surface-sunken hover:text-ink",
            )}
          >
            <Icon className={cn("size-4.5 shrink-0", self || inGroup ? "text-emerald" : "text-ink-muted")} strokeWidth={2} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>
          </Link>
          {subs && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={subsId}
              aria-label={t("{group} pages", { group: t(item.label) })}
              onClick={() => toggle(item)}
              className={cn("absolute top-0 right-0 flex w-9 items-center justify-center rounded-md text-ink-faint transition-colors hover:text-ink", touch ? "h-11" : "h-9.5")}
            >
              <Chevron className="size-4" strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
        {subs && (
          <div id={subsId} hidden={!expanded} className="mt-0.5 mb-1 ml-5.25 flex flex-col gap-0.5 border-l border-line pl-3">
            {subs.map((sub) => (
              <Link
                key={sub.href}
                href={sub.href}
                aria-current={sub.on ? "page" : undefined}
                className={cn(
                  "relative flex items-center rounded-[10px] px-2.5 text-[13.5px] whitespace-nowrap transition-colors",
                  touch ? "h-10" : "h-8",
                  sub.on ? "bg-emerald-soft font-semibold text-emerald" : "font-medium text-ink-soft hover:bg-surface-sunken hover:text-ink",
                )}
              >
                <span className="min-w-0 truncate">{t(sub.label)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav ref={navRef} aria-label={t("Main")} style={style} className={cn(SCROLLER, className)}>
      <div ref={rows} className="flex flex-col gap-3">
        {sections.map((section, index) => (
          <div key={section.label ?? index} className="flex flex-col gap-0.5">
            {collapsed ? (
              index > 0 && (
                // Folded: a short line marks where a section starts.
                <span className="flex h-2 items-center justify-center">
                  <span aria-hidden="true" className="h-px w-6 bg-line" />
                  <span className="sr-only">{t(section.label ?? "")}</span>
                </span>
              )
            ) : (
              // The board names no section here: the space between says it.
              section.label && <span className="sr-only">{t(section.label)}</span>
            )}
            {(index === sections.length - 1 ? [...section.items, ...NAV_FOOT] : section.items).map(renderItem)}
          </div>
        ))}
      </div>
    </nav>
  );
}

function SectionLabel({ section, className }: { section: NavSection; className?: string }) {
  const { t } = useLocale();
  if (!section.label) return null;
  return <span className={cn("text-[11px] leading-[normal] font-semibold tracking-[0.06em] text-ink-muted uppercase", className)}>{t(section.label)}</span>;
}

// The Habit Tracker menu (HabitSidebar): 40px rows, the open page in a
// tinted pill with a bar at the panel's edge, and the counts on Daily
// habits (done today of planned) and To Do List (open tasks today).
export function HabitMenu({ collapsed = false, touch = false, className, style, navRef }: MenuProps) {
  const { t, fmt } = useLocale();
  const sections = menuSections(useNavSections(), "habit");
  const { location } = useNavLocation();
  const { openCount } = useTodayTasks();
  const habits = useHabitsToday(true);
  const rows = useCurrentRowInView();
  const { isExpanded, toggle } = useHabitGroups(location);
  const baseId = useId();

  const badgeOf = (item: NavItem): { text: string; title: string } | null => {
    if (item.badge === "todayTasks" && openCount > 0) {
      return { text: formatCount(openCount, fmt), title: t("Today’s tasks, {count} left", { count: formatCount(openCount, fmt) }) };
    }
    if (item.badge === "habitsToday" && habits && habits.total > 0) {
      const done = formatCount(habits.done, fmt);
      const total = formatCount(habits.total, fmt);
      return { text: `${done}/${total}`, title: t("{done} of {total} habits done today", { done, total }) };
    }
    return null;
  };

  return (
    <nav ref={navRef} aria-label={t("Habit Tracker")} style={style} className={cn(SCROLLER, className)}>
      <div ref={rows} className={cn("flex flex-col", collapsed ? "gap-3" : "gap-2.5")}>
        {sections.map((section, index) => (
          <div key={section.label ?? index} className="flex flex-col gap-0.5">
            {collapsed ? (
              index > 0 && (
                <span className="flex h-2 items-center justify-center">
                  <span aria-hidden="true" className="h-px w-6 bg-line" />
                  <span className="sr-only">{t(section.label ?? "")}</span>
                </span>
              )
            ) : (
              <SectionLabel section={section} className="px-3 pb-1.5" />
            )}
            {section.items.map((item) => {
              const Icon = NAV_ICONS[item.icon];
              const on = location?.item === item;
              const badge = badgeOf(item);
              const rowClass = cn(
                "relative flex w-full shrink-0 items-center rounded-sm text-body transition-colors",
                touch ? "h-11" : "h-10",
                collapsed ? "justify-center" : "gap-3 px-3",
                on ? "bg-emerald-soft font-semibold text-emerald" : "font-medium text-ink-2 hover:bg-surface-sunken hover:text-ink",
              );
              const badgeTag = badge && (
                <span title={badge.title} className={cn("min-w-5 rounded-full px-1.75 py-px text-center text-caption font-semibold tabular-nums", on ? "bg-surface text-emerald" : "bg-surface-sunken text-ink-soft")}>
                  <span aria-hidden="true">{badge.text}</span>
                  <span className="sr-only">{badge.title}</span>
                </span>
              );
              // A group (Namaz, Daily habits…): its name opens and closes its
              // pages, as the board's does; folded, it opens the first page.
              if (item.subs && !collapsed) {
                const expanded = isExpanded(item);
                const subsId = `${baseId}-habit${leafHref(item).replace(/[^\w-]/g, "-")}`;
                return (
                  <div key={leafHref(item)} className="flex flex-col">
                    <button type="button" aria-expanded={expanded} aria-controls={subsId} onClick={() => toggle(item)} className={rowClass}>
                      <Icon className={cn("size-4.5 shrink-0", on ? "text-emerald" : "text-ink-muted")} strokeWidth={2} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-left">{t(item.label)}</span>
                      <ChevronDown className={cn("size-3.5 shrink-0 transition-transform", expanded && "rotate-180", on ? "text-emerald" : "text-ink-muted")} strokeWidth={2.5} aria-hidden="true" />
                      {badgeTag}
                    </button>
                    <div id={subsId} hidden={!expanded} className="mt-0.5 mb-1 ml-5.75 flex flex-col gap-0.5 border-l-[1.5px] border-line pl-3">
                      {item.subs.map((sub) => {
                        const subOn = location?.sub === sub;
                        return (
                          <Link
                            key={leafHref(sub)}
                            href={leafHref(sub)}
                            aria-current={subOn ? "page" : undefined}
                            className={cn(
                              "flex items-center rounded-[7px] px-2.5 text-[13.5px] whitespace-nowrap transition-colors",
                              touch ? "h-10" : "h-7.5",
                              subOn ? "bg-emerald-soft font-semibold text-emerald" : "font-medium text-ink-soft hover:bg-surface-sunken hover:text-ink",
                            )}
                          >
                            <span className="min-w-0 truncate">{t(sub.label)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return (
                <RailTip key={leafHref(item)} label={t(item.label)} show={collapsed}>
                  <Link href={leafHref(item)} aria-current={on && !location?.sub ? "page" : undefined} aria-label={collapsed ? t(item.label) : undefined} className={rowClass}>
                    <Icon className={cn("size-4.5 shrink-0", on ? "text-emerald" : "text-ink-muted")} strokeWidth={2} aria-hidden="true" />
                    {!collapsed && <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>}
                    {badge && (collapsed ? <span aria-hidden="true" className="absolute top-1.5 right-2 size-2 rounded-full bg-emerald" /> : badgeTag)}
                  </Link>
                </RailTip>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
