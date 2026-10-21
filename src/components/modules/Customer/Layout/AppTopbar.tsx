"use client";

import { ChevronRight, ListChecks } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { useTodayTasks } from "@/components/modules/Customer/Providers/TodayTasksProvider";
import { TodayTasksPanel } from "@/components/modules/Customer/HabitTracker/Todos/TodayTasksPanel";
import Logo from "@/components/smartly/Logo";
import { TONE_BG } from "@/components/smartly/tones";
import { CUSTOMER_HOME_ROUTE } from "@/lib/authUtils";
import { breadcrumbFor, findNavLocation, NAV_SECTIONS } from "@/lib/customer/nav";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./AccountMenu";
import { useAddActions, WithAddActions } from "./AddActionsProvider";
import { AddMenu } from "./AddMenu";
import { CustomerSearch } from "./CustomerSearch";
import { LanguageSwitch } from "./LanguageSwitch";
import { NavDrawer } from "./NavDrawer";
import { NotificationsBell } from "./NotificationsBell";
import { useNavSections } from "./SidebarNav";
import { ThemeToggle } from "./ThemeToggle";
import { listOf, listUrlKey, listVisitUrl, restoredListUrl, savedListUrl, savedListValue, topbarTrail } from "./topbarCrumbs";
import { useTopbarExtras } from "./TopbarExtras";
import { formatCount } from "@/lib/i18n/digits";

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

// The top bar: 64px on desktop with the breadcrumb, search, Add, Today's
// tasks, language, theme, the bell and the account menu; 56px on phones with
// the menu button, the logo (or the page's name), search, the tasks icon,
// the bell and the avatar (language and theme live in the drawer there, and
// Add is the floating button). Tablets keep the drawer's language and theme
// too; they and small laptops show only the breadcrumb's last step.
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
  const { t, locale } = useLocale();
  const { activeBusinessId } = useAuth();
  const darkModeOn = useFeature("dark_mode");
  const { openCount } = useTodayTasks();
  const { tasksOpen, setTasksOpen, attachTasksPanel } = useAddActions();
  const sections = useNavSections();
  // A page the menu hides here (Books outside a business workspace, which
  // shows its notice; Loans while switched off) still has a name.
  const location = findNavLocation(pathname, searchParams, sections) ?? findNavLocation(pathname, searchParams, NAV_SECTIONS);
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

  // A record on its list's own page (the vault's checkup) has no list to
  // go back to, so that part stays text. Read in the browser only; the
  // server (and hydration) link the plain list.
  const linkList = visitUrl === null;
  const recordList = location && record && linkList ? listOf(location) : null;
  const stored = useSyncExternalStore(subscribeNowhere, () => (recordList ? readSaved(listUrlKey(recordList)) : null), () => null);
  const listUrl = recordList ? restoredListUrl(recordList, savedListUrl(stored, activeBusinessId)) : undefined;

  const trail = location && !extras?.title ? topbarTrail(location, !!record, listUrl, { linkList }) : [];
  const current = extras?.title ?? record ?? extras?.heading ?? (crumb ? t(crumb.heading) : "");

  const tasksLabel = openCount > 0 ? t("Today’s tasks, {count} left", { count: formatCount(openCount, locale) }) : t("Today’s tasks");

  return (
    <header className="flex h-topbar-mobile shrink-0 items-center gap-1 border-b border-line bg-surface px-2 md:h-topbar md:gap-3 md:px-8 print:hidden">
      <NavDrawer />
      {titled && crumb && (
        <span className="flex min-w-0 flex-1 flex-col md:hidden">
          <span className="truncate text-title font-semibold text-ink">{t(crumb.heading)}</span>
          {extras?.subtitle}
        </span>
      )}
      <Link href={CUSTOMER_HOME_ROUTE} aria-label={`${t("Home")}`} className={cn("flex items-center rounded-md lg:hidden", titled && "max-md:hidden")}>
        {/* The wordmark on phones; the mark alone on tablets, leaving room
            for the breadcrumb, and on the narrowest phones. */}
        <span className="max-[359px]:hidden md:hidden">
          <Logo height={38} alt="" className="dark:hidden" />
          <Logo height={38} alt="" onDark className="hidden dark:block" />
        </span>
        <Logo variant="mark" height={34} alt="" className="hidden max-[359px]:block md:block" />
      </Link>

      <nav aria-label={t("Breadcrumb")} className="hidden min-w-0 flex-1 items-center gap-2 text-body md:flex">
        {crumb && trail.length > 0 && <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", TONE_BG[crumb.tone])} />}
        <ol className="flex min-w-0 items-center gap-2">
          {trail.map((part, index) => (
            // Tablets and small laptops keep only the step just above the
            // page; at lg the sidebar, language and theme leave little room.
            <li key={`${index}:${part.label}`} className={cn("flex min-w-0 items-center gap-2", index < trail.length - 1 && "hidden xl:flex")}>
              {part.href ? (
                <Link href={part.href} className="min-w-0 truncate rounded-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline">
                  {t(part.label)}
                </Link>
              ) : (
                <span className="min-w-0 truncate text-ink-muted">{t(part.label)}</span>
              )}
              <ChevronRight className="size-3.5 shrink-0 text-line-strong" aria-hidden="true" />
            </li>
          ))}
          <li className="min-w-0">
            <span aria-current="page" className="block truncate text-title text-ink">
              {current}
            </span>
          </li>
        </ol>
      </nav>
      <span className={cn("flex-1 md:hidden", titled && "max-md:hidden")} />

      <CustomerSearch />

      <div className="hidden md:block">
        <AddMenu />
      </div>

      <TodayTasksPanel open={tasksOpen} onOpenChange={setTasksOpen}>
        <button
          type="button"
          aria-label={tasksLabel}
          title={t("Today’s tasks")}
          className="relative flex size-11 shrink-0 items-center justify-center rounded-md text-ink-2 md:h-10 md:w-auto md:gap-2 md:border md:border-line md:bg-surface md:px-3 md:text-small md:font-semibold md:hover:bg-surface-sunken"
        >
          <ListChecks className="size-5 md:size-4.5" aria-hidden="true" />
          <span className="hidden xl:inline">{t("Today")}</span>
          {openCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-1.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-forest px-1 text-caption font-bold text-white tabular-nums md:static md:h-5 md:min-w-5 md:px-2 dark:bg-emerald dark:text-on-action"
            >
              {openCount}
            </span>
          )}
        </button>
      </TodayTasksPanel>

      <div className="hidden lg:block">
        <LanguageSwitch />
      </div>
      {darkModeOn && (
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>
      )}
      <NotificationsBell />
      {extras?.action && <div className="md:hidden">{extras.action}</div>}
      <div className={cn((NO_AVATAR_ON_PHONE.has(pathname) || extras?.action) && "max-md:hidden")}>
        <AccountMenu />
      </div>
    </header>
  );
}
