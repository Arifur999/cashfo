"use client";

import { ArrowLeftRight,BookOpen,BookText,Box,CalendarCheck,ChartColumn,ChartPie,ChevronDown,ChevronRight,CircleCheckBig,Clock,CreditCard,Gift,GraduationCap,House,KeyRound,ListChecks,type LucideProps,Moon,PenLine,PiggyBank,Settings,Table2,Target,TrendingUp,Users,UsersRound,Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { useTodayTasks } from "@/components/modules/Customer/Providers/TodayTasksProvider";
import { MosqueIcon } from "@/components/smartly/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { findNavLocation, NAV_FOOT, visibleNavSections, type NavIcon, type NavItem, type NavLeaf, type NavTone } from "@/lib/customer/nav";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const ICONS: Record<NavIcon, React.ComponentType<LucideProps>> = {
  home: House,
  transactions: ArrowLeftRight,
  wallet: Wallet,
  budget: ChartPie,
  income: TrendingUp,
  loans: CreditCard,
  savings: PiggyBank,
  assets: Box,
  group: Users,
  today: CircleCheckBig,
  daily: CalendarCheck,
  namaz: MosqueIcon,
  ramadan: Moon,
  library: BookOpen,
  skills: GraduationCap,
  todo: ListChecks,
  vault: KeyRound,
  insights: ChartColumn,
  reports: Table2,
  challenges: Target,
  ledger: BookText,
  people: UsersRound,
  clock: Clock,
  journal: PenLine,
  gift: Gift,
  settings: Settings,
};

// The Night sidebar is dark in both themes, so its dots use the dark
// palette outright (the night-* colours in globals.css).
const NIGHT_DOT: Record<NavTone, string> = {
  money: "bg-night-money",
  loans: "bg-night-loans",
  habits: "bg-night-habits",
  vault: "bg-night-vault",
  insights: "bg-night-insights",
  neutral: "bg-night-neutral",
};

const MARKER = "absolute -left-3 w-0.75 rounded-r-[3px] bg-night-marker";

// On the aurora a lighter pill melted into the emerald: the open page sits
// in a darker pill with a faint edge (white on it is about 6:1), and hover
// darkens a little less. Black, not a theme token: the panel looks the same
// in both themes.
const ACTIVE_ROW = "bg-black/22 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]";
const HOVER_ROW = "hover:bg-black/12";
// On a short screen (a laptop with the browser's bars) rows close up a
// little, so more of the menu shows before it scrolls.
const SHORT = "[@media(max-height:860px)]:h-9";

// The site's focus ring is dark green, which the night panel swallows; the
// mint one reads on it. Drawn inside the row, since the scrolling menu
// clips anything outside it. Every control on the panel takes it: the
// sidebar's logo and the phone drawer's own rows too.
export const NIGHT_FOCUS = "focus-visible:outline-mint-200 focus-visible:-outline-offset-2";

const leafHref = (leaf: NavLeaf) => (leaf.query ? `${leaf.href}?${new URLSearchParams(leaf.query)}` : leaf.href);

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

function useOpenGroups() {
  const open = parseOpenGroups(useSyncExternalStore(subscribeOpenGroups, readOpenGroups, nothingRemembered));
  const toggle = (key: string) => {
    const current = parseOpenGroups(readOpenGroups());
    writeOpenGroups(JSON.stringify(current.includes(key) ? current.filter((other) => other !== key) : [...current, key]));
  };
  return { open, toggle };
}

// A folded sidebar's row: just its icon, with the name in a tooltip on the
// right (and still the link's accessible name).
function RailTip({ label, show, children }: { label: string; show: boolean; children: React.ReactElement }) {
  if (!show) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

interface SidebarNavProps {
  // Phone rows are 44px with 16px text; the desktop sidebar's 40px with 14px.
  compact?: boolean;
  // The desktop sidebar folded to its icons: no names, no group pages.
  collapsed?: boolean;
  className?: string;
  style?: React.CSSProperties;
  navRef?: React.Ref<HTMLElement>;
}

// Uses the shell's providers for what the menu depends on: the workspace
// (Books) and the member's role in it (Journal entry), the feature flags
// (Loans) and today's open tasks (the badge). allRoles keeps the items a
// staff member can't use, for working out which page is open: a staff
// member who opens Journal entry by its address is on Journal entry, not
// on the nearest row the menu does show.
export function useNavSections({ allRoles = false }: { allRoles?: boolean } = {}) {
  const { activeBusiness } = useAuth();
  const loansOn = useFeature("loan_management");
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  return visibleNavSections({ workspaceType: activeBusiness?.type, isFeatureOn: (key) => (key === "loan_management" ? loansOn : true), canManage: allRoles || canManage });
}

// The menu itself, shared by the desktop sidebar and the phone drawer. A
// group's label opens its first page; its chevron shows or hides its pages
// without leaving this one.
export function SidebarNav({ compact = true, collapsed = false, className, style, navRef }: SidebarNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t, locale } = useLocale();
  const { openCount } = useTodayTasks();
  const sections = useNavSections();
  // Found among every item, so a page hidden from this member lights no row.
  const location = findNavLocation(pathname, searchParams, useNavSections({ allRoles: true }));
  const groups = useOpenGroups();
  const baseId = useId();

  // The menu scrolls, and a page low in it (Habits on a laptop, Vault) sat
  // out of sight: bring the open page's row into view when the menu mounts
  // (the phone drawer opening too) and after each navigation. "nearest"
  // leaves a row already in view where it is.
  const rows = useRef<HTMLDivElement>(null);
  const searchKey = searchParams.toString();
  useEffect(() => {
    rows.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
  }, [pathname, searchKey]);

  const renderItem = (item: NavItem) => {
    const Icon = ICONS[item.icon];
    const self = location?.item === item && !location.sub;
    const inGroup = !!item.subs && location?.item === item;
    const lit = self || inGroup;
    // The group of the page on screen can't be closed.
    const expanded = inGroup || (!!item.subs && groups.open.includes(item.href));
    const Chevron = expanded ? ChevronDown : ChevronRight;
    const subsId = `${baseId}-pages${item.href.replace(/[^\w-]/g, "-")}`;
    const badge = item.badge === "todayTasks" && openCount > 0;
    if (collapsed) {
      return (
        <RailTip key={`${item.label}:${item.href}`} label={t(item.label)} show>
          <Link
            href={leafHref(item)}
            aria-current={self ? "page" : undefined}
            aria-label={t(item.label)}
            className={cn(
              cn("relative flex h-10 items-center justify-center rounded-md transition-colors", SHORT),
              NIGHT_FOCUS,
              lit ? cn(ACTIVE_ROW, "text-white") : cn("text-white/88 hover:text-white", HOVER_ROW),
            )}
          >
            {lit && <span aria-hidden="true" className={cn(MARKER, "top-2.5 h-5")} />}
            <Icon className={cn("size-4.75 shrink-0", lit ? "opacity-100" : "opacity-85")} strokeWidth={1.9} aria-hidden="true" />
            {badge && <span aria-hidden="true" className="absolute top-2 right-2.5 size-2 rounded-full bg-mint-200" />}
          </Link>
        </RailTip>
      );
    }
    return (
      <div key={`${item.label}:${item.href}`} className="flex flex-col">
        <div className="relative flex">
          <Link
            href={leafHref(item)}
            aria-current={self ? "page" : undefined}
            className={cn(
              "relative flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 transition-colors",
              NIGHT_FOCUS,
              compact ? cn("h-10 text-body", SHORT) : "h-11 text-body-lg",
              // Room for the chevron's own button.
              item.subs && (compact ? "pr-11" : "pr-12"),
              lit ? "font-semibold text-white" : cn("font-medium text-white/88 hover:text-white", HOVER_ROW),
              self && ACTIVE_ROW,
            )}
          >
            {self && <span aria-hidden="true" className={cn(MARKER, "h-5", compact ? "top-2.5" : "top-3")} />}
            <Icon className={cn("shrink-0", compact ? "size-4.5" : "size-4.75", lit ? "opacity-100" : "opacity-85")} strokeWidth={1.9} />
            <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>
            {badge && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-mint-200/16 px-2 text-caption font-bold text-mint-200 tabular-nums">{formatCount(openCount, locale)}</span>
            )}
            {item.tag && <span className="flex h-5.5 items-center rounded-full bg-mint-glow px-2 text-caption font-bold text-forest">{t(item.tag)}</span>}
          </Link>
          {item.subs && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={subsId}
              aria-label={t("{group} pages", { group: t(item.label) })}
              disabled={inGroup}
              onClick={() => groups.toggle(item.href)}
              className={cn(
                "absolute top-0 right-0 flex items-center justify-center rounded-md transition-colors",
                NIGHT_FOCUS,
                compact ? "size-10" : "size-11",
                lit ? "text-white/80" : cn("text-white/70 hover:text-white", HOVER_ROW),
              )}
            >
              <Chevron className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
        {item.subs && (
          <div id={subsId} hidden={!expanded} className="flex flex-col">
            {item.subs.map((sub) => {
              const on = location?.sub === sub;
              return (
                <Link
                  key={sub.href}
                  href={leafHref(sub)}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "relative flex items-center rounded-md pr-3 pl-10 transition-colors",
                    NIGHT_FOCUS,
                    compact ? "h-8.5 text-small [@media(max-height:860px)]:h-8" : "h-10 text-body",
                    on ? cn(ACTIVE_ROW, "font-semibold text-white") : "font-medium text-white/85 hover:text-white",
                  )}
                >
                  <span aria-hidden="true" className="absolute top-0 bottom-0 left-5.25 w-px bg-mint-200/16" />
                  {on && <span aria-hidden="true" className="absolute top-2.75 left-4.75 h-3 w-1.25 rounded-full bg-night-marker" />}
                  {t(sub.label)}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav ref={navRef} aria-label={t("Main")} style={style} className={cn("relative min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
      {/* The sidebar spaces its rows 2px apart; the phone drawer stacks its
          44px rows and sets the section names on their natural line. */}
      <div ref={rows} className={cn("flex flex-col", compact && "gap-0.5")}>
        {sections.map((section) => (
          <div key={section.label ?? "home"} className={cn("flex flex-col", compact && "gap-0.5")}>
            {section.label && collapsed && (
              // Folded: a short line marks where a section starts.
              <span className="flex h-5 items-center justify-center">
                <span aria-hidden="true" className="h-px w-6 bg-mint-200/16" />
                <span className="sr-only">{t(section.label)}</span>
              </span>
            )}
            {section.label && !collapsed && (
              <span className={cn("flex items-center gap-2 px-3 pt-4 text-caption font-bold tracking-[0.1em] text-mint-200/90 uppercase", compact ? "h-9 pb-2 [@media(max-height:860px)]:h-7 [@media(max-height:860px)]:pt-2.5 [@media(max-height:860px)]:pb-1" : "pb-1 leading-[normal]")}>
                <span aria-hidden="true" className={cn("size-1.5 rounded-full", NIGHT_DOT[section.tone])} />
                {t(section.label)}
              </span>
            )}
            {section.items.map(renderItem)}
          </div>
        ))}
      </div>
    </nav>
  );
}

// Invite & earn and Settings, under the scrolling menu.
export function SidebarFoot({ compact = true, collapsed = false }: { compact?: boolean; collapsed?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const location = findNavLocation(pathname, searchParams, useNavSections({ allRoles: true }));

  return (
    <div className="flex flex-col gap-0.5">
      {NAV_FOOT.map((item) => {
        const Icon = ICONS[item.icon];
        const on = location?.item === item;
        return (
          <RailTip key={item.href} label={t(item.label)} show={collapsed}>
            <Link
              href={item.href}
              aria-current={on ? "page" : undefined}
              aria-label={collapsed ? t(item.label) : undefined}
              className={cn(
                "relative flex items-center rounded-md transition-colors",
                NIGHT_FOCUS,
                collapsed ? cn("h-10 justify-center", SHORT) : cn("gap-3 px-3", compact ? cn("h-10 text-body", SHORT) : "h-11 text-body"),
                on ? cn(ACTIVE_ROW, "font-semibold text-white") : cn("font-medium text-white/88 hover:text-white", HOVER_ROW),
              )}
            >
              {on && <span aria-hidden="true" className={cn(MARKER, "h-5", compact ? "top-2.5" : "top-3")} />}
              <Icon className={cn("shrink-0", compact ? "size-4.5" : "size-4.75")} strokeWidth={1.9} aria-hidden={collapsed || undefined} />
              {!collapsed && <span className="flex-1">{t(item.label)}</span>}
              {!collapsed && item.tag && <span className="flex h-5.5 items-center rounded-full bg-mint-glow px-2 text-caption font-bold text-forest">{t(item.tag)}</span>}
              {collapsed && item.tag && <span aria-hidden="true" className="absolute top-2 right-2.5 size-2 rounded-full bg-mint-glow" />}
            </Link>
          </RailTip>
        );
      })}
    </div>
  );
}
