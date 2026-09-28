"use client";

import { BookOpen, GraduationCap, Moon, MoonStar, Sunrise, Target, TrendingUp, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { BooksOverview, HabitMonthTracker, SkillsOverview, TodoList } from "@/lib/api";
import { BOOK_BAR } from "./books/bookTheme";
import { DashboardBarChart } from "./dashboard/DashboardBarChart";
import { DashboardProgressList } from "./dashboard/DashboardProgressList";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { WeekChart } from "./skills/WeekChart";
import { NAMAZ_THEME, OTHERS_THEME, RAMADAN_THEME, TODO_THEME } from "./tracker/theme";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_ROWS = 5;

interface CardData {
  href: string;
  icon: LucideIcon;
  badge: string; // bg-*-50 dark:bg-*-500/10
  iconColor: string; // text-*-600
  title: string;
  headline: string;
  sub: string;
}

interface HabitDashboardPageClientProps {
  userName: string;
  namazTrackers: HabitMonthTracker[];
  ramadanTrackers: HabitMonthTracker[];
  booksOverview: BooksOverview | null;
  skillsOverview: SkillsOverview | null;
  othersTrackers: HabitMonthTracker[];
  todoLists: TodoList[];
}

// The Habit Tracker app-mode's landing page: a themed summary card per real
// feature (Namaz/Ramadan/My Library/Skills/Others/To Do List), each linking
// to that feature's own page. Replaces the old "Today's Habits" checklist,
// which read the generic Habit/HabitLog model that none of these features'
// real flows write to anymore.
export function HabitDashboardPageClient({ userName, namazTrackers, ramadanTrackers, booksOverview, skillsOverview, othersTrackers, todoLists }: HabitDashboardPageClientProps) {
  const { t } = useLocale();

  // A Namaz tracker's todayDay is non-null only for the ONE sheet (if any)
  // whose real Gregorian month is the current one -- computed server-side,
  // so there's no need to re-derive "today" here.
  const currentNamaz = namazTrackers.find((tr) => tr.todayDay !== null);
  const namazTicked = currentNamaz ? currentNamaz.checks.filter((c) => c.day === currentNamaz.todayDay).length : 0;

  // Ramadan/Others have no calendar concept of their own (see toView()'s
  // dateBased check) -- there's no single "current" one, so the most recent
  // (lists are already sorted year desc / createdAt desc) stands in for it.
  const latestRamadan = ramadanTrackers[0] ?? null;
  const ramadanCells = latestRamadan ? latestRamadan.totalDays * latestRamadan.items.length : 0;
  const ramadanPct = latestRamadan && ramadanCells > 0 ? Math.round((latestRamadan.checks.length / ramadanCells) * 100) : 0;

  const readingCount = booksOverview?.books.filter((b) => b.status === "READING").length ?? 0;
  const finishedThisYear = booksOverview ? booksOverview.books.filter((b) => b.status === "FINISHED" && b.finishedYear === booksOverview.year).length : 0;

  const learningCount = skillsOverview?.skills.filter((s) => s.status === "LEARNING").length ?? 0;

  const todayList = todoLists.find((l) => l.date === todayKey()) ?? null;
  const todoDone = todayList ? todayList.items.filter((i) => i.completed).length : 0;
  const todoTotal = todayList ? todayList.items.length : 0;

  // Namaz: prayers ticked per day for the last 7 elapsed days of the current
  // month (real calendar dates, since a Namaz tracker's day N is Gregorian
  // day N of its month/year -- unlike Ramadan/Others below).
  const namazBars =
    currentNamaz && currentNamaz.todayDay !== null
      ? (() => {
          const month = currentNamaz.month as number;
          const year = currentNamaz.year as number;
          const todayDay = currentNamaz.todayDay as number;
          const start = Math.max(1, todayDay - 6);
          const bars = [];
          for (let day = start; day <= todayDay; day++) {
            const count = currentNamaz.checks.filter((c) => c.day === day).length;
            const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
            bars.push({ label: t(WEEKDAY_SHORT[weekday]), value: count, display: `${count}/${currentNamaz.items.length}` });
          }
          return bars;
        })()
      : [];
  // Early in a tracked month (todayDay < 7) there aren't 7 elapsed days yet --
  // the subtitle says exactly how many bars are actually shown instead of
  // overclaiming "Last 7 days" (unlike To Do's chart below, whose 7 columns
  // are always real calendar days regardless of data).
  const namazSubtitle = namazBars.length > 0 && namazBars.length < 7 ? `${t("Last")} ${namazBars.length} ${namazBars.length === 1 ? t("day") : t("days")}` : t("Last 7 days");

  // Ramadan/Others have no calendar dates of their own, so "day N" here is
  // just the Nth tracked day, not a real weekday -- one bar per day of the
  // whole challenge, percentage of that day's habits ticked.
  const ramadanBars = latestRamadan
    ? Array.from({ length: latestRamadan.totalDays }, (_, i) => {
        const day = i + 1;
        const count = latestRamadan.checks.filter((c) => c.day === day).length;
        const pct = latestRamadan.items.length > 0 ? Math.round((count / latestRamadan.items.length) * 100) : 0;
        return { label: String(day), value: pct, display: `${pct}%` };
      })
    : [];

  // To Do List: the last 7 real calendar days ending today, however many
  // tasks each day's list happened to have (0/0 when no list exists yet).
  const todoBars = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const list = todoLists.find((l) => l.date === key);
    const done = list ? list.items.filter((it) => it.completed).length : 0;
    return { label: t(WEEKDAY_SHORT[d.getUTCDay()]), value: done, display: list ? `${done}/${list.items.length}` : "0/0" };
  });
  const todoMax = Math.max(...todoBars.map((b) => b.value), 1);

  // Others/My Library: current progress per item, newest/most-recent first
  // (both lists already come back that way), capped so the card stays a
  // glance rather than a full duplicate of the feature's own list page.
  const othersRows = othersTrackers.slice(0, MAX_ROWS).map((tr) => {
    const cells = tr.totalDays * tr.items.length;
    const pct = cells > 0 ? Math.round((tr.checks.length / cells) * 100) : 0;
    return { label: tr.name ?? t("Others"), pct, display: `${pct}%` };
  });
  const othersMore = Math.max(0, othersTrackers.length - MAX_ROWS);

  const readingBooks = booksOverview?.books.filter((b) => b.status === "READING") ?? [];
  const libraryRows = readingBooks.slice(0, MAX_ROWS).map((b) => {
    const pct = b.totalPages > 0 ? Math.round((b.pagesRead / b.totalPages) * 100) : 0;
    return { label: b.title, pct, display: `${b.pagesRead}/${b.totalPages}` };
  });
  const libraryMore = Math.max(0, readingBooks.length - MAX_ROWS);

  const cards: CardData[] = [
    {
      href: "/habit-tracker/habits?category=Namaz",
      icon: Moon,
      badge: "bg-blue-50 dark:bg-blue-500/10",
      iconColor: "text-blue-600",
      title: t("Namaz"),
      headline: currentNamaz ? `${namazTicked}/5` : "--",
      sub: currentNamaz ? t("prayers today") : t("No month tracked yet"),
    },
    {
      href: "/habit-tracker/habits?category=Ramadan",
      icon: MoonStar,
      badge: "bg-emerald-50 dark:bg-emerald-500/10",
      iconColor: "text-emerald-600",
      title: t("Ramadan"),
      headline: latestRamadan ? `${ramadanPct}%` : "--",
      sub: latestRamadan ? `${t("Ramadan")} ${latestRamadan.year}` : t("No Ramadan tracked yet"),
    },
    {
      href: "/habit-tracker/habits?category=Book",
      icon: BookOpen,
      badge: "bg-orange-50 dark:bg-orange-500/10",
      iconColor: "text-orange-600",
      title: t("My Library"),
      headline: String(readingCount),
      sub: booksOverview?.goalTarget ? `${finishedThisYear}/${booksOverview.goalTarget} ${t("books this year")}` : t("currently reading"),
    },
    {
      href: "/habit-tracker/habits?category=Course",
      icon: GraduationCap,
      badge: "bg-violet-50 dark:bg-violet-500/10",
      iconColor: "text-violet-600",
      title: t("Skills"),
      headline: String(learningCount),
      sub: skillsOverview && skillsOverview.streak > 0 ? `${skillsOverview.streak} ${t("day streak")}` : t("skills in progress"),
    },
    {
      href: "/habit-tracker/habits?category=Others",
      icon: Target,
      badge: "bg-slate-100 dark:bg-slate-500/10",
      iconColor: "text-slate-600",
      title: t("Others"),
      headline: String(othersTrackers.length),
      sub: t("active challenges"),
    },
    {
      href: "/habit-tracker/todos",
      icon: Sunrise,
      badge: "bg-teal-50 dark:bg-teal-500/10",
      iconColor: "text-teal-600",
      title: t("To Do List"),
      headline: todayList ? `${todoDone}/${todoTotal}` : "--",
      sub: todayList ? t("tasks today") : t("No tasks yet"),
    },
  ];

  return (
    <div className="space-y-6 px-6 py-8 pb-24 md:pb-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("Habit Tracker")}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {t("Welcome back")}, {userName}. {t("Here's your progress across everything you track.")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex items-center gap-3 rounded-2xl bg-surface p-5 shadow-sm shadow-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${card.badge}`}>
              <card.icon className={`h-5 w-5 ${card.iconColor}`} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-500">{card.title}</p>
              <p className="text-xl font-semibold tabular-nums text-neutral-900">{card.headline}</p>
              <p className="truncate text-xs text-neutral-400">{card.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <TrendingUp className="h-4 w-4" /> {t("Progress overview")}
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DashboardBarChart
            title={t("Namaz")}
            subtitle={namazSubtitle}
            bars={namazBars}
            max={currentNamaz ? currentNamaz.items.length : 5}
            gradient={NAMAZ_THEME.chartBar}
            emptyText={t("No month tracked yet")}
            highlightLast
          />
          <DashboardBarChart
            title={t("Ramadan")}
            subtitle={t("Daily progress")}
            bars={ramadanBars}
            max={100}
            gradient={RAMADAN_THEME.chartBar}
            emptyText={t("No Ramadan tracked yet")}
          />
          <WeekChart week={skillsOverview?.week ?? []} />
          <DashboardBarChart
            title={t("To Do List")}
            subtitle={t("Last 7 days")}
            bars={todoBars}
            max={todoMax}
            gradient={TODO_THEME.chartBar}
            emptyText={t("No tasks yet")}
            highlightLast
          />
          <DashboardProgressList
            title={t("Others")}
            subtitle={t("active challenges")}
            rows={othersRows}
            barClass={OTHERS_THEME.bar}
            emptyText={t("No active challenges yet")}
            footer={othersMore > 0 ? `+${othersMore} ${t("more")}` : undefined}
          />
          <DashboardProgressList
            title={t("My Library")}
            subtitle={t("currently reading")}
            rows={libraryRows}
            barClass={BOOK_BAR}
            emptyText={t("Not reading anything right now")}
            footer={libraryMore > 0 ? `+${libraryMore} ${t("more")}` : undefined}
          />
        </div>
      </div>
    </div>
  );
}
