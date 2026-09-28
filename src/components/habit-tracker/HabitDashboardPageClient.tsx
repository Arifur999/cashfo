"use client";

import { BookOpen, GraduationCap, Moon, MoonStar, Sunrise, Target, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { BooksOverview, HabitMonthTracker, SkillsOverview, TodoList } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

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
    </div>
  );
}
