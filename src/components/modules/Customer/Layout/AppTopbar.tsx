"use client";

import { ArrowLeftRight, ChevronRight, ListChecks, Sprout, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { useTodayTasks } from "@/components/modules/Customer/Providers/TodayTasksProvider";
import { TodayTasksPanel } from "@/components/modules/Customer/HabitTracker/Todos/TodayTasksPanel";
import { CUSTOMER_HOME_ROUTE } from "@/lib/authUtils";
import { breadcrumbFor, HABIT_APP_LABEL, HABIT_HOME, MONEY_APP_LABEL, MONEY_HOME } from "@/lib/customer/nav";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./AccountMenu";
import { useAddActions, WithAddActions } from "./AddActionsProvider";
import { AddMenu } from "./AddMenu";
import { CustomerSearch } from "./CustomerSearch";
import { NavDrawer } from "./NavDrawer";
import { NotificationsBell } from "./NotificationsBell";
import { useNavLocation } from "./SidebarNav";
import { ThemeToggle } from "./ThemeToggle";
import { listOf, listUrlKey, listVisitUrl, recordListHref, restoredListUrl, savedListUrl, savedListValue, topbarTrail } from "./topbarCrumbs";
import { useTopbarExtras } from "./TopbarExtras";

// The phone boards name these pages in the top bar instead of showing the
// logo (the pages leave out their own heading there). Settings drops the
// avatar too: its profile card comes first on the page.
const TITLED_ON_PHONE = new Set(["/referrals", "/settings", "/password-manager"]);
const NO_AVATAR_ON_PHONE = new Set(["/settings"]);

// Nothing to subscribe to: the saved list address is read again whenever
// the bar renders, which every navigation brings.
const subscribeNowhere = () => () => {};

const readSaved = (key: string): string | null => {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

// A phone's icon buttons: 44px tall and 38px wide -- the boards' 40px less
// the room the bell takes, which they don't draw -- so the title still fits.
const PHONE_BUTTON = "max-md:h-11 max-md:w-9.5 max-md:rounded-full max-md:border-0 max-md:bg-transparent max-md:shadow-none";
// The wider screens' icon buttons: white pills on the Money Tracker's page
// ground, outlined 8px squares on the Habit Tracker's white bar.
const ICON_BUTTON = {
  money: cn("md:size-9.5 md:rounded-full md:bg-surface md:shadow-control", PHONE_BUTTON),
  habit: cn("md:size-9.5 md:rounded-sm md:border md:border-line md:bg-surface", PHONE_BUTTON),
};
// The count on an icon: the primary on a ring of the ground behind it.
const COUNT_BADGE = "h-4 min-w-4 px-1 text-[10px] leading-4 shadow-[0_0_0_2px_var(--surface)] max-md:top-1.5 max-md:right-0.5 md:-top-1.5 md:-right-1.5 md:h-4.5 md:min-w-4.5 md:px-1.25 md:text-[11px] md:leading-4.5";

// The top bar (AppTopbar board): the breadcrumb, "Search or jump to…",
// today's tasks, the theme, the switch to the other app and the account
// button -- 64px, on the page ground in the Money Tracker and white with a
// line under it in the Habit Tracker. The bell stays beside the tasks
// (the board has none; the reminders live there). Phones (the …Mobile
// boards) get 56px: the menu, the app's name, the tasks, the switch,
// search, the bell and the avatar. Add has no button: N opens the Add menu
// (AddMenu's hidden anchor) and the phone floats its +.
export function AppTopbar() {
  return (
    <WithAddActions>
      <Topbar />
    </WithAddActions>
  );
}

function Topbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t, fmt } = useLocale();
  const { activeBusinessId, user } = useAuth();
  // A group member's portal login has only its groups: no search, tasks,
  // bell, other app, account menu or Add menu (the sidebar signs it out).
  const portal = Boolean(user.portalOnly);
  const darkModeOn = useFeature("dark_mode");
  const { openCount } = useTodayTasks();
  const { tasksOpen, setTasksOpen, attachTasksPanel } = useAddActions();
  const { app, location } = useNavLocation();
  const habit = app === "habit";
  const crumb = location ? breadcrumbFor(location) : null;
  const extras = useTopbarExtras();
  // A record page adds its record's name as the last part, and the list
  // it belongs to joins the trail before it.
  const record = extras?.record;
  const titled = TITLED_ON_PHONE.has(pathname);

  // Today's tasks is drawn here, so "Task for today" opens it from anywhere.
  useEffect(() => attachTasksPanel(), [attachTasksPanel]);

  // A list's own page keeps its address (filters, page) for this tab and
  // workspace, so a record opened from it can lead back to it as it was.
  const visitUrl = listVisitUrl(location, pathname, searchParams);
  const visitKey = location && visitUrl ? listUrlKey(listOf(location)) : null;
  useEffect(() => {
    if (!visitKey || !visitUrl || !activeBusinessId) return;
    try {
      window.sessionStorage.setItem(visitKey, savedListValue(activeBusinessId, visitUrl));
    } catch {
      // Blocked storage: the crumb opens the list's first page instead.
    }
  }, [visitKey, visitUrl, activeBusinessId]);

  // A record page leads back to its list as it was left, read in the
  // browser only (the server, and hydration, link the plain list). A record
  // on its list's own page (the vault's checkup) leads to the plain list,
  // which closes it (recordListHref).
  const recordList = location && record && visitUrl === null ? listOf(location) : null;
  const stored = useSyncExternalStore(subscribeNowhere, () => (recordList ? readSaved(listUrlKey(recordList)) : null), () => null);
  const listUrl = recordList ? restoredListUrl(recordList, savedListUrl(stored, activeBusinessId)) : undefined;
  const listHref = location && record ? recordListHref(location, visitUrl, listUrl) : null;

  const trail = location && !extras?.title ? topbarTrail(location, !!record, listHref ?? undefined, { linkList: listHref !== null }) : [];
  const current = extras?.title ?? record ?? extras?.heading ?? (crumb ? t(crumb.heading) : "");

  const tasksLabel = openCount > 0 ? t("Today’s tasks, {count} left", { count: formatCount(openCount, fmt) }) : t("Today’s tasks");
  const iconButton = ICON_BUTTON[app];
  const switchLabel = t(habit ? "Switch to Money Tracker" : "Switch to Habit Tracker");
  const SwitchIcon = habit ? Wallet : ArrowLeftRight;

  return (
    <header
      className={cn(
        "relative flex h-topbar-mobile shrink-0 items-center gap-0.5 border-b border-line bg-surface px-1 md:h-topbar md:gap-2.5 md:px-8 print:hidden",
        !habit && "md:border-b-0 md:bg-transparent",
      )}
    >
      <NavDrawer />

      {/* Phones: the page's own name on the titled pages, else the app's. */}
      {titled && crumb ? (
        <span className="flex min-w-0 flex-1 flex-col md:hidden">
          <span className="truncate text-title font-semibold text-ink">{extras?.title ?? t(crumb.heading)}</span>
          {extras?.subtitle}
        </span>
      ) : habit ? (
        <Link href={HABIT_HOME} className="ml-0.5 flex min-w-0 flex-1 items-center gap-1.5 rounded-md md:hidden">
          <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-emerald text-on-action">
            <Sprout className="size-4" strokeWidth={2} />
          </span>
          <span className="truncate text-[15px] leading-[normal] font-semibold text-ink">{t(HABIT_APP_LABEL)}</span>
        </Link>
      ) : (
        // The DashboardMobile board: the app's tile and name, as the Habit Tracker has.
        <Link href={CUSTOMER_HOME_ROUTE} className="ml-0.5 flex min-w-0 flex-1 items-center gap-1 rounded-md md:hidden">
          <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-emerald text-on-action">
            <Wallet className="size-4" strokeWidth={2} />
          </span>
          <span className="truncate text-[14px] leading-[normal] font-semibold tracking-[-0.01em] text-ink">{t(MONEY_APP_LABEL)}</span>
        </Link>
      )}

      {/* The board sets the trail 20px in from the page edge (its header spaces two empty slots before it). */}
      <nav aria-label={t("Breadcrumb")} className="hidden min-w-0 flex-1 items-center md:flex md:pl-5">
        <ol className="flex min-w-0 items-center gap-2 text-body text-ink-muted">
          {trail.map((part, index) => (
            // Tablets and small laptops keep only the step just above the
            // page; there the sidebar and the bar's buttons leave little room.
            <li key={`${index}:${part.label}`} className={cn("flex min-w-0 items-center gap-2", index < trail.length - 1 && "hidden xl:flex")}>
              {part.href ? (
                <Link href={part.href} className="min-w-0 truncate rounded-sm underline-offset-4 hover:text-ink hover:underline">
                  {t(part.label)}
                </Link>
              ) : (
                <span className="min-w-0 truncate">{t(part.label)}</span>
              )}
              <ChevronRight className="size-3.5 shrink-0 text-ink-faint" strokeWidth={2} aria-hidden="true" />
            </li>
          ))}
          <li className="min-w-0">
            <span aria-current="page" className="block truncate text-title font-semibold text-ink">
              {current}
            </span>
          </li>
        </ol>
      </nav>

      {/* The boards took the search box off the bar; Ctrl K still opens it. */}
      {!portal && (
      <div className="flex shrink-0 max-md:order-3">
        <CustomerSearch showTriggers={false} iconClassName={iconButton} />
      </div>
      )}

      {!portal && (
      <TodayTasksPanel open={tasksOpen} onOpenChange={setTasksOpen}>
        <button type="button" aria-label={tasksLabel} title={t("Today’s tasks")} className={cn(
            "relative flex shrink-0 items-center justify-center text-ink-soft transition-colors hover:text-ink max-md:order-1",
            iconButton,
            // Open, it takes the primary's edge, wash and halo (TodayTasks boards).
            "md:data-[state=open]:border md:data-[state=open]:border-emerald md:data-[state=open]:bg-mint-50 md:data-[state=open]:text-emerald md:data-[state=open]:focus-halo",
          )}>
          <ListChecks className="size-5 md:size-4.5" strokeWidth={2} aria-hidden="true" />
          {openCount > 0 && (
            <span
              aria-hidden="true"
              className={cn("absolute rounded-full bg-emerald text-center font-bold text-on-action tabular-nums", COUNT_BADGE, !habit && "md:shadow-[0_0_0_2px_var(--page)]")}
            >
              {formatCount(openCount, fmt)}
            </span>
          )}
        </button>
      </TodayTasksPanel>
      )}

      {/* The board's order: tasks, dark mode, then the bell. */}
      {darkModeOn && <ThemeToggle className={cn("max-md:hidden", iconButton)} />}

      {!portal && (
        <div className="flex shrink-0 max-md:order-4">
          <NotificationsBell className={iconButton} badgeClassName={COUNT_BADGE} />
        </div>
      )}

      {!portal && (
      <Link
        href={habit ? MONEY_HOME : HABIT_HOME}
        aria-label={switchLabel}
        title={switchLabel}
        className={cn(
          "flex shrink-0 items-center justify-center text-emerald transition-colors max-md:order-2 max-md:h-11 max-md:w-9.5",
          "md:h-9.5 md:gap-2 md:border md:border-emerald-line md:bg-emerald-soft md:px-3.5 md:text-body md:font-semibold md:whitespace-nowrap md:hover:border-emerald",
          habit ? "md:rounded-sm" : "md:rounded-full",
        )}
      >
        <SwitchIcon className="size-5 md:size-4" strokeWidth={2.25} aria-hidden="true" />
        <span aria-hidden="true" className="hidden md:inline">
          {t(habit ? "Money Tracker" : HABIT_APP_LABEL)}
        </span>
      </Link>
      )}

      {extras?.action && <div className="max-md:order-5 md:hidden">{extras.action}</div>}
      <div className={cn("flex shrink-0 max-md:order-5 max-md:mx-0.5 md:ml-1", (NO_AVATAR_ON_PHONE.has(pathname) || extras?.action) && "max-md:hidden", portal && "hidden")}>
        <AccountMenu />
      </div>

      {/* N's Add menu hangs here, under the account button; not on phones,
          which have the +. */}
      {!portal && (
        <div className="hidden md:contents">
          <AddMenu />
        </div>
      )}
    </header>
  );
}
