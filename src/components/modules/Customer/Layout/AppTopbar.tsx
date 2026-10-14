"use client";

import { ChevronRight, ListChecks } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { useTodayTasks } from "@/components/modules/Customer/Providers/TodayTasksProvider";
import { TodayTasksPanel } from "@/components/modules/Customer/HabitTracker/Todos/TodayTasksPanel";
import Logo from "@/components/smartly/Logo";
import { TONE_BG } from "@/components/smartly/tones";
import { CUSTOMER_HOME_ROUTE } from "@/lib/authUtils";
import { breadcrumbFor, findNavLocation } from "@/lib/customer/nav";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./AccountMenu";
import { AddMenu } from "./AddMenu";
import { LanguageSwitch } from "./LanguageSwitch";
import { NavDrawer } from "./NavDrawer";
import { useNavSections } from "./SidebarNav";
import { ThemeToggle } from "./ThemeToggle";

// The top bar: 64px on desktop with the breadcrumb, Add, Today's tasks,
// language, theme and the account menu; 56px on phones with the menu
// button, the logo, the tasks icon and the avatar (language and theme live
// in the drawer there, and Add is the floating button).
export function AppTopbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const darkModeOn = useFeature("dark_mode");
  const { openCount } = useTodayTasks();
  const sections = useNavSections();
  const location = findNavLocation(pathname, searchParams, sections);
  const crumb = location ? breadcrumbFor(location) : null;
  const [tasksOpen, setTasksOpen] = useState(false);

  const tasksLabel = openCount > 0 ? `${t("Today’s tasks")}, ${openCount} ${t("left")}` : t("Today’s tasks");

  return (
    <header className="flex h-topbar-mobile shrink-0 items-center gap-1 border-b border-line bg-surface px-2 md:h-topbar md:gap-3 md:px-8 print:hidden">
      <NavDrawer />
      <Link href={CUSTOMER_HOME_ROUTE} aria-label={`${t("Home")}`} className="flex items-center rounded-md lg:hidden">
        <Logo height={38} alt="" className="dark:hidden" />
        <Logo height={38} alt="" onDark className="hidden dark:block" />
      </Link>

      <nav aria-label={t("Breadcrumb")} className="hidden min-w-0 flex-1 items-center gap-2 text-body lg:flex">
        {crumb && crumb.crumbs.length > 0 && <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", TONE_BG[crumb.tone])} />}
        {crumb?.crumbs.map((part) => (
          <span key={part} className="flex items-center gap-2">
            <span className="whitespace-nowrap text-ink-muted">{t(part)}</span>
            <ChevronRight className="size-3.5 shrink-0 text-line-strong" aria-hidden="true" />
          </span>
        ))}
        <span aria-current="page" className="truncate text-title text-ink">
          {crumb ? t(crumb.heading) : ""}
        </span>
      </nav>
      <span className="flex-1 lg:hidden" />

      <div className="hidden md:block">
        <AddMenu onAddTask={() => setTasksOpen(true)} />
      </div>

      <TodayTasksPanel open={tasksOpen} onOpenChange={setTasksOpen}>
        <button
          type="button"
          aria-label={tasksLabel}
          title={t("Today’s tasks")}
          className="relative flex size-11 shrink-0 items-center justify-center rounded-md text-ink-2 md:h-10 md:w-auto md:gap-2 md:border md:border-line md:bg-surface md:px-3 md:text-small md:font-semibold md:hover:bg-surface-sunken"
        >
          <ListChecks className="size-5 md:size-4.5" aria-hidden="true" />
          <span className="hidden md:inline">{t("Today")}</span>
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

      <div className="hidden md:block">
        <LanguageSwitch />
      </div>
      {darkModeOn && (
        <div className="hidden md:block">
          <ThemeToggle />
        </div>
      )}
      <AccountMenu />
    </header>
  );
}
