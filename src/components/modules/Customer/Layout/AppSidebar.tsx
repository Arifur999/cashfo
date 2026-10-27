"use client";

import { ArrowRight, LogOut, PanelLeftClose, PanelLeftOpen, Settings, Sprout, Star } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Avatar from "@/components/smartly/Avatar";
import Logo from "@/components/smartly/Logo";
import { useScrollFades } from "@/hooks/useScrollFades";
import { BRAND_NAME } from "@/lib/brand";
import { HABIT_APP_LABEL, HABIT_HOME, MONEY_HOME, navAppFor, SETTINGS_ROUTE, type NavApp } from "@/lib/customer/nav";
import { sidebarCookie } from "@/lib/customer/sidebarState";
import { workspaceName } from "@/lib/customer/workspaceSwitch";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { LanguageSwitch } from "./LanguageSwitch";
import { HabitMenu, MoneyMenu, RailTip, useMoneyGroupOpen } from "./SidebarNav";
import { workspaceKind } from "./workspaceKind";

// The desktop sidebar, one of two by the page on screen (lib/customer/nav):
// the Money Tracker's floating white panel (AppSidebar board: 248px, 12px
// off the edges, 22px corners) or the Habit Tracker's full-height white
// column with a right border (HabitSidebar board: 260px). From `lg` up;
// below that NavDrawer opens the same menu from the top bar. Either folds
// to a 72px rail of icons -- each name in a tooltip -- and remembers that
// in a cookie, so the server draws it folded too.
export function AppSidebar({ initialCollapsed = false }: { initialCollapsed?: boolean }) {
  const app = navAppFor(usePathname());
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = sidebarCookie(next);
  };

  if (app === "habit") {
    return (
      <aside
        data-collapsed={collapsed || undefined}
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface py-4 transition-[width] duration-200 ease-out motion-reduce:transition-none lg:flex print:hidden",
          collapsed ? "w-18 px-3" : "w-65 px-3",
        )}
      >
        <SidebarPanel app="habit" collapsed={collapsed} onToggle={toggle} />
      </aside>
    );
  }

  return (
    <aside data-collapsed={collapsed || undefined} className="sticky top-0 hidden h-screen shrink-0 py-3 pl-3 lg:flex print:hidden">
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-panel bg-surface py-3.5 shadow-card transition-[width] duration-200 ease-out motion-reduce:transition-none dark:border dark:border-line",
          collapsed ? "w-18 px-2.5" : "w-62 px-2.5",
        )}
      >
        <SidebarPanel app="money" collapsed={collapsed} onToggle={toggle} />
      </div>
    </aside>
  );
}

interface SidebarPanelProps {
  app: NavApp;
  collapsed?: boolean;
  // The fold button; the phone drawer has none.
  onToggle?: () => void;
  // The phone drawer: bigger rows, and the brand block becomes its header.
  touch?: boolean;
  // What the phone drawer puts in place of the brand block's link (the
  // workspace switcher and the close button).
  header?: React.ReactNode;
  // A control the phone drawer adds to the foot (the theme button).
  footExtra?: React.ReactNode;
}

// What both sidebars draw inside their panel -- the brand block, the menu
// (fading at its edges when it scrolls) and the foot -- shared with the
// phone drawer.
export function SidebarPanel({ app, collapsed = false, onToggle, touch = false, header, footExtra }: SidebarPanelProps) {
  const { ref, style } = useScrollFades<HTMLElement>();
  const habit = app === "habit";
  return (
    <>
      {header ?? <BrandBlock app={app} collapsed={collapsed} />}
      {habit ? (
        <HabitMenu navRef={ref} style={style} collapsed={collapsed} touch={touch} className={collapsed ? "mt-4" : "mt-5.5"} />
      ) : (
        <MoneyMenu navRef={ref} style={style} collapsed={collapsed} touch={touch} className="mt-2.5" />
      )}
      {habit ? <HabitFoot collapsed={collapsed} onToggle={onToggle} extra={footExtra} /> : <MoneyFoot collapsed={collapsed} onToggle={onToggle} extra={footExtra} compact={touch} />}
    </>
  );
}

// The panel's head: the Smartly mark with the open workspace (Money
// Tracker), or the Habit Tracker's sprout and what it keeps.
export function BrandBlock({ app, collapsed = false, as = "link" }: { app: NavApp; collapsed?: boolean; as?: "link" | "static" }) {
  const { t } = useLocale();
  const { user, activeBusiness } = useAuth();
  const habit = app === "habit";
  const title = habit ? t(HABIT_APP_LABEL) : BRAND_NAME;
  const subtitle = habit ? t("Prayers, habits and tasks") : activeBusiness && activeBusiness.type !== "PERSONAL" ? workspaceName(activeBusiness, user.name) : t(`${workspaceKind(activeBusiness)} workspace`);
  const mark = habit ? (
    <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-emerald text-on-action">
      <Sprout className="size-5" strokeWidth={2} />
    </span>
  ) : (
    <Logo variant="icon" height={36} alt="" className="rounded-md" />
  );
  const body = (
    <>
      {mark}
      {!collapsed && (
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="truncate text-[15px] leading-[normal] font-semibold text-ink">{title}</span>
          <span className="truncate text-caption text-ink-muted">{subtitle}</span>
        </span>
      )}
    </>
  );
  const className = cn("flex w-full shrink-0 items-center gap-2.5 rounded-md", collapsed ? "justify-center py-2" : "p-2");
  if (as === "static") return <div className={className}>{body}</div>;
  return (
    <RailTip label={title} show={collapsed}>
      <Link href={habit ? HABIT_HOME : MONEY_HOME} aria-label={habit ? `${title} — ${t("Dashboard")}` : t("{brand} home", { brand: BRAND_NAME })} className={className}>
        {body}
      </Link>
    </RailTip>
  );
}

// No plan is sold in the app yet (see the report): the Upgrade buttons say so.
function useUpgrade() {
  const { t } = useLocale();
  return () => toast(t("Paid plans are coming soon."));
}

const ROUND_ICON = "flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors";

// The Money Tracker's foot: the Upgrade to Pro card (only while no group
// shows its pages), the profile row with the plan, then the language
// switch, Settings and the fold button.
interface FootProps {
  collapsed: boolean;
  onToggle?: () => void;
  extra?: React.ReactNode;
  // The phone drawer: no Upgrade card (the menu would hardly show), the
  // profile row's Upgrade button instead.
  compact?: boolean;
}

function MoneyFoot({ collapsed, onToggle, extra, compact = false }: FootProps) {
  const { t } = useLocale();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  // The Upgrade card steps aside while a group shows its pages.
  const groupOpen = useMoneyGroupOpen() || compact;
  const upgrade = useUpgrade();
  const settingsOn = pathname === SETTINGS_ROUTE || pathname.startsWith(`${SETTINGS_ROUTE}/`);
  // Everyone is on the free plan until the app sells one.
  const free = true;
  const toggleLabel = t(collapsed ? "Expand sidebar" : "Collapse sidebar");
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  const settingsLink = (
    <RailTip label={t("Settings")} show>
      <Link
        href={SETTINGS_ROUTE}
        aria-label={t("Settings")}
        aria-current={settingsOn ? "page" : undefined}
        className={cn(ROUND_ICON, settingsOn ? "border-emerald-line bg-emerald-soft text-emerald" : "border-line bg-surface text-ink-muted hover:text-ink")}
      >
        <Settings className="size-4.5" strokeWidth={2} aria-hidden="true" />
      </Link>
    </RailTip>
  );
  const toggleButton = onToggle && (
    <RailTip label={toggleLabel} show>
      <button type="button" onClick={onToggle} aria-label={toggleLabel} aria-expanded={!collapsed} className={cn(ROUND_ICON, "border-line bg-surface text-ink-muted hover:text-ink")}>
        <ToggleIcon className="size-4.5" strokeWidth={2} aria-hidden="true" />
      </button>
    </RailTip>
  );

  if (collapsed) {
    return (
      <div className="flex shrink-0 flex-col items-center gap-2 border-t border-line pt-3">
        {settingsLink}
        {toggleButton}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-line pt-3">
      {free && !groupOpen && (
        <section aria-labelledby="sidebar-upgrade" className="relative flex flex-col gap-1.5 overflow-hidden rounded-lg bg-mint-50 p-3.5">
          <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true" className="absolute -top-7.5 -right-7 text-mint-200 dark:text-emerald-line">
            <circle cx="48" cy="48" r="34" fill="none" stroke="currentColor" strokeWidth="16" />
          </svg>
          <span className="relative flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-forest text-mint-200">
              <Star className="size-3.75 fill-mint-200/35" strokeWidth={2} aria-hidden="true" />
            </span>
            <h2 id="sidebar-upgrade" className="text-body font-semibold text-forest dark:text-ink">
              {t("Upgrade to Pro")}
            </h2>
          </span>
          <p className="relative text-[12.5px] leading-[1.45] text-brand-ink">{t("No monthly limit on transactions, plus PDF reports, income goals and up to 5 workspaces.")}</p>
          <button type="button" onClick={upgrade} className="relative mt-1 flex h-8 items-center gap-1.5 self-start rounded-full bg-forest px-3.5 text-small font-semibold text-white hover:bg-forest-hover">
            {t("See plans")}
            <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
          </button>
        </section>
      )}
      <div className="flex items-center gap-2.5 py-1 pr-1 pl-0.5">
        <Avatar name={user.name} src={user.avatarUrl} size={36} tone="soft" alt="" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[13.5px] leading-[normal] font-semibold text-ink">{user.name}</span>
          <span className={cn("self-start rounded-full px-1.75 py-px text-[11px] leading-[normal] font-semibold whitespace-nowrap", free ? "bg-surface-sunken text-ink-soft" : "bg-mint-50 text-brand-ink")}>{t("Free plan")}</span>
        </span>
        {free && groupOpen ? (
          <button type="button" onClick={upgrade} className="flex h-7.5 shrink-0 items-center rounded-full bg-forest px-3 text-[12.5px] font-semibold whitespace-nowrap text-white hover:bg-forest-hover">
            {t("Upgrade")}
          </button>
        ) : (
          <button type="button" onClick={logout} aria-label={t("Sign out")} title={t("Sign out")} className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink">
            <LogOut className="size-4.25" strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitch className="flex-1" />
        {settingsLink}
        {extra}
        {toggleButton}
      </div>
    </div>
  );
}

// The Habit Tracker's foot: Settings, the language switch and the fold
// button, each a full row.
function HabitFoot({ collapsed, onToggle, extra }: FootProps) {
  const { t } = useLocale();
  const pathname = usePathname();
  const settingsOn = pathname === SETTINGS_ROUTE || pathname.startsWith(`${SETTINGS_ROUTE}/`);
  const toggleLabel = t(collapsed ? "Expand sidebar" : "Collapse sidebar");
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <div className={cn("flex shrink-0 flex-col gap-2.5 border-t border-line pt-3", collapsed && "items-stretch")}>
      <RailTip label={t("Settings")} show={collapsed}>
        <Link
          href={SETTINGS_ROUTE}
          aria-current={settingsOn ? "page" : undefined}
          aria-label={collapsed ? t("Settings") : undefined}
          className={cn(
            "flex h-10 items-center rounded-sm text-body transition-colors",
            collapsed ? "justify-center" : "gap-3 px-3",
            settingsOn ? "bg-emerald-soft font-semibold text-emerald" : "font-medium text-ink-2 hover:bg-surface-sunken hover:text-ink",
          )}
        >
          <Settings className={cn("size-4.5 shrink-0", settingsOn ? "text-emerald" : "text-ink-muted")} strokeWidth={2} aria-hidden="true" />
          {!collapsed && t("Settings")}
        </Link>
      </RailTip>
      {!collapsed && (
        <div className="flex items-center gap-2">
          <LanguageSwitch app="habit" className="flex-1" />
          {extra}
        </div>
      )}
      {onToggle && (
        <RailTip label={toggleLabel} show={collapsed}>
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? toggleLabel : undefined}
            aria-expanded={!collapsed}
            className={cn("flex h-9 items-center rounded-sm text-small font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink", collapsed ? "justify-center" : "gap-3 px-3")}
          >
            <ToggleIcon className="size-4.5 shrink-0" strokeWidth={2} aria-hidden="true" />
            {!collapsed && toggleLabel}
          </button>
        </RailTip>
      )}
    </div>
  );
}
