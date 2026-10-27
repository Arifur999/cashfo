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
  GraduationCap,
  House,
  KeyRound,
  Landmark,
  LayoutDashboard,
  ListChecks,
  type LucideProps,
  MoonStar,
  PenLine,
  PiggyBank,
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
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { useTodayTasks } from "@/components/modules/Customer/Providers/TodayTasksProvider";
import { MosqueIcon } from "@/components/smartly/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { findNavLocation, menuSections, NAV_SECTIONS, navAppFor, visibleNavSections, type NavApp, type NavIcon, type NavItem, type NavLocation, type NavSection } from "@/lib/customer/nav";
import { leafHref } from "@/lib/customer/paletteMatch";
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
  savings: PiggyBank,
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

// The groups the customer opened with their chevron, by href, kept in this
// browser so they stay open across pages and reloads (the group of the
// page on screen is open anyway). One store for the sidebar and the phone
// drawer. When storage refuses (a private window, blocked site data) the
// choice lasts until the tab closes.
const OPEN_GROUPS_KEY = "smartly.sidebar.open";
const openGroupsListeners = new Set<() => void>();
let openGroupsInMemory = "";
let storageRefused = false;

function readOpenGroups(): string {
  if (storageRefused) return openGroupsInMemory;
  try {
    return window.localStorage.getItem(OPEN_GROUPS_KEY) ?? "";
  } catch {
    storageRefused = true;
    return openGroupsInMemory;
  }
}

function writeOpenGroups(value: string) {
  openGroupsInMemory = value;
  try {
    window.localStorage.setItem(OPEN_GROUPS_KEY, value);
  } catch {
    storageRefused = true;
  }
  for (const listener of openGroupsListeners) listener();
}

function subscribeOpenGroups(listener: () => void) {
  openGroupsListeners.add(listener);
  // Another tab opened or closed a group.
  const onStorage = (event: StorageEvent) => {
    if (event.key === OPEN_GROUPS_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    openGroupsListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// The server can't see this browser's choice, so the server render and
// hydration open only the current page's group; the remembered ones open
// right after.
const nothingRemembered = () => "";

const parseOpenGroups = (stored: string): string[] => {
  try {
    const value: unknown = JSON.parse(stored);
    return Array.isArray(value) ? value.filter((key): key is string => typeof key === "string") : [];
  } catch {
    return [];
  }
};

export function useOpenGroups() {
  const open = parseOpenGroups(useSyncExternalStore(subscribeOpenGroups, readOpenGroups, nothingRemembered));
  const toggle = (key: string) => {
    const current = parseOpenGroups(readOpenGroups());
    writeOpenGroups(JSON.stringify(current.includes(key) ? current.filter((other) => other !== key) : [...current, key]));
  };
  return { open, toggle };
}

// Whether a Money Tracker group shows its pages: the page on screen's group
// always, the others while the customer keeps them open.
export function useExpandedGroups(location: NavLocation | null) {
  const groups = useOpenGroups();
  const isExpanded = (item: NavItem) => !!item.subs && (location?.item === item || groups.open.includes(item.href));
  return { isExpanded, toggle: groups.toggle };
}

// Today's habits done out of those planned, for Daily habits' "3/5". Read
// when the Habit Tracker menu shows and again after each page change there
// (a tick on the dashboard or the daily page moves it).
function useHabitsToday(enabled: boolean): { done: number; total: number } | null {
  const pathname = usePathname();
  const [count, setCount] = useState<{ done: number; total: number } | null>(null);
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
  }, [enabled, pathname]);
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

// The Money Tracker menu (AppSidebar): section names, rows of 38px, and a
// group's pages on a line under it, the open one in a tinted pill. A
// group's name opens its first page; its chevron shows or hides its pages
// without leaving this one.
export function MoneyMenu({ collapsed = false, touch = false, className, style, navRef }: MenuProps) {
  const { t } = useLocale();
  const sections = menuSections(useNavSections(), "money");
  const { location } = useNavLocation();
  const { isExpanded, toggle } = useExpandedGroups(location);
  const baseId = useId();
  const rows = useCurrentRowInView();

  const renderItem = (item: NavItem) => {
    const Icon = NAV_ICONS[item.icon];
    const self = location?.item === item && !location.sub;
    const inGroup = !!item.subs && location?.item === item;
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
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2.5 rounded-md pl-3 text-body whitespace-nowrap transition-colors",
              touch ? "h-11" : "h-9.5",
              item.subs ? "pr-9" : "pr-2.5",
              self ? "bg-emerald-soft font-semibold text-emerald" : inGroup ? "font-semibold text-ink hover:bg-surface-sunken" : "font-medium text-ink-2 hover:bg-surface-sunken hover:text-ink",
            )}
          >
            <Icon className={cn("size-4.5 shrink-0", self || inGroup ? "text-emerald" : "text-ink-muted")} strokeWidth={2} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>
          </Link>
          {item.subs && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={subsId}
              aria-label={t("{group} pages", { group: t(item.label) })}
              disabled={inGroup}
              onClick={() => toggle(item.href)}
              className={cn("absolute top-0 right-0 flex w-9 items-center justify-center rounded-md text-ink-faint transition-colors enabled:hover:text-ink", touch ? "h-11" : "h-9.5")}
            >
              <Chevron className="size-4" strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
        {item.subs && (
          <div id={subsId} hidden={!expanded} className="mt-0.5 mb-1 ml-5.25 flex flex-col gap-0.5 border-l border-line pl-3">
            {item.subs.map((sub) => {
              const on = location?.sub === sub;
              return (
                <Link
                  key={sub.href}
                  href={leafHref(sub)}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "relative flex items-center rounded-[10px] px-2.5 text-[13.5px] whitespace-nowrap transition-colors",
                    touch ? "h-10" : "h-8",
                    on ? "bg-emerald-soft font-semibold text-emerald" : "font-medium text-ink-soft hover:bg-surface-sunken hover:text-ink",
                  )}
                >
                  <span className="min-w-0 truncate">{t(sub.label)}</span>
                </Link>
              );
            })}
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
              <SectionLabel section={section} className="px-3 pb-1" />
            )}
            {section.items.map(renderItem)}
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

// Whether any Money Tracker group shows its pages: the foot's Upgrade card
// steps aside then, so the menu is never pushed out of view (the
// AppSidebar board's rule).
export function useMoneyGroupOpen(): boolean {
  const sections = menuSections(useNavSections(), "money");
  const { location } = useNavLocation();
  const { isExpanded } = useExpandedGroups(location);
  return sections.some((section) => section.items.some(isExpanded));
}

// The Habit Tracker menu (HabitSidebar): 40px rows, the open page in a
// tinted pill with a bar at the panel's edge, and the counts on Daily
// habits (done today of planned) and To Do List (open tasks today).
export function HabitMenu({ collapsed = false, touch = false, className, style, navRef }: MenuProps) {
  const { t, locale } = useLocale();
  const sections = menuSections(useNavSections(), "habit");
  const { location } = useNavLocation();
  const { openCount } = useTodayTasks();
  const habits = useHabitsToday(true);
  const rows = useCurrentRowInView();

  const badgeOf = (item: NavItem): { text: string; title: string } | null => {
    if (item.badge === "todayTasks" && openCount > 0) {
      return { text: formatCount(openCount, locale), title: t("Today’s tasks, {count} left", { count: formatCount(openCount, locale) }) };
    }
    if (item.badge === "habitsToday" && habits && habits.total > 0) {
      const done = formatCount(habits.done, locale);
      const total = formatCount(habits.total, locale);
      return { text: `${done}/${total}`, title: t("{done} of {total} habits done today", { done, total }) };
    }
    return null;
  };

  return (
    <nav ref={navRef} aria-label={t("Habit Tracker")} style={style} className={cn(SCROLLER, className)}>
      <div ref={rows} className={cn("flex flex-col", collapsed ? "gap-3" : "gap-4.5")}>
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
              return (
                <RailTip key={leafHref(item)} label={t(item.label)} show={collapsed}>
                  <Link
                    href={leafHref(item)}
                    aria-current={on ? "page" : undefined}
                    aria-label={collapsed ? t(item.label) : undefined}
                    className={cn(
                      "relative flex shrink-0 items-center rounded-sm text-body transition-colors",
                      touch ? "h-11" : "h-10",
                      collapsed ? "justify-center" : "gap-3 px-3",
                      on ? "bg-emerald-soft font-semibold text-emerald" : "font-medium text-ink-2 hover:bg-surface-sunken hover:text-ink",
                    )}
                  >
                    <Icon className={cn("size-4.5 shrink-0", on ? "text-emerald" : "text-ink-muted")} strokeWidth={2} aria-hidden="true" />
                    {!collapsed && <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>}
                    {badge &&
                      (collapsed ? (
                        <span aria-hidden="true" className="absolute top-1.5 right-2 size-2 rounded-full bg-emerald" />
                      ) : (
                        <span title={badge.title} className={cn("min-w-5 rounded-full px-1.75 py-px text-center text-caption font-semibold tabular-nums", on ? "bg-surface text-emerald" : "bg-surface-sunken text-ink-soft")}>
                          <span aria-hidden="true">{badge.text}</span>
                          <span className="sr-only">{badge.title}</span>
                        </span>
                      ))}
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
