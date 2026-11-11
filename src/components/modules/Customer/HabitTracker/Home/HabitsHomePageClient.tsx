"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import Button from "@/components/smartly/Button";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { dayText, hijriDate } from "@/lib/customer/habitDisplay";
import { last7, prayerStreak, restingToday, streakRows } from "@/lib/customer/habitsHome";
import { nowReading } from "@/lib/customer/libraryDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { HabitDrawer } from "../Daily/HabitDrawer";
import { useReminderBook } from "../Reminders";
import { ChallengesCard } from "./ChallengesCard";
import { DailyHabitsCard } from "./DailyHabitsCard";
import { JournalNotesCard } from "./JournalNotesCard";
import type { HabitsHomeData } from "./homeTypes";
import { Last7Card } from "./Last7Card";
import { LearningMini } from "./LearningMini";
import { PrayersCard } from "./PrayersCard";
import { RamadanCard } from "./RamadanCard";
import { ReadingCard } from "./ReadingCard";
import { StreaksCard } from "./StreaksCard";
import { TodayTasksCard } from "./TodayTasksCard";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";

interface HabitsHomePageClientProps {
  data: HabitsHomeData;
}

// Habits › Today: the day in one place -- prayers, habits, tasks, the week
// behind, the streaks alive, and what is being read, learned and attempted.
// Phones get the phone board: a greeting, the prayers, habits, tasks and
// the book (and Ramadan while it is going on); the week, streaks, skills and
// challenges wait for a wider screen.
export function HabitsHomePageClient({ data }: HabitsHomePageClientProps) {
  const { t, fmt } = useLocale();
  const { hijriAdjust } = usePrayerSettings().settings;
  const { today } = data;
  const [habitOpen, setHabitOpen] = useState(false);
  const reminders = useReminderBook(data.reminders);
  const taskField = useRef<HTMLInputElement>(null);

  const reading = data.books ? nowReading(data.books.books) : null;
  const bars = last7(data.namaz, data.habits, data.logs, today);
  const streaks = streakRows(data.todayRows, { skills: data.skills?.streak ?? 0, reading: data.books?.reading.streak ?? 0, prayers: prayerStreak(data.namaz, today) });

  return (
    <PageFrame className="md:gap-5">
      <div className="flex flex-col gap-0.5 md:hidden">
        <h1 className="text-[20px] leading-[1.3] font-semibold tracking-[-0.01em] text-ink">{t("{greeting}, {name}", { greeting: t(data.greeting), name: data.firstName })}</h1>
        <p className="text-small leading-[normal] text-ink-muted">
          {dayText(today, fmt, "short")} · {hijriDate(today, fmt, hijriAdjust)}
        </p>
      </div>
      <PageHeader
        className="max-md:hidden"
        title={t("{greeting}, {name}", { greeting: t(data.greeting), name: data.firstName })}
        description={
          <span className="flex flex-wrap items-center gap-x-2">
            {dayText(today, fmt, "full")}
            <span aria-hidden="true" className="size-1 rounded-full bg-input" />
            {hijriDate(today, fmt, hijriAdjust)}
          </span>
        }
        actions={
          <>
            {/* The To Do List's New task popup (TodoNewTask), as the board links it. */}
            <Button asChild variant="secondary" className="rounded-sm">
              <Link href="/habit-tracker/todos?new=1">
                <Plus strokeWidth={2.25} />
                {t("Add task")}
              </Link>
            </Button>
            <Button onClick={() => setHabitOpen(true)} className="rounded-sm">
              <Plus strokeWidth={2.25} />
              {t("Add habit")}
            </Button>
          </>
        }
      />

      {/* The habits sit beside the prayers from 1400px. Narrower, next to the
          372px habits card the five prayer tiles get too thin for their
          status chips ("Not prayed", "Jama'at"), so the habits go under. */}
      <div className="grid items-stretch gap-4 md:gap-5 min-[1400px]:grid-cols-[minmax(0,1fr)_372px]">
        <PrayersCard trackers={data.namaz} today={today} />
        <DailyHabitsCard rows={data.todayRows} logs={data.logs} resting={restingToday(data.habits, today)} today={today} />
      </div>

      <div className="grid items-stretch gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
        <TodayTasksCard today={today} initial={data.todayList} inputRef={taskField} />
        <div className="hidden md:contents">
          <Last7Card bars={bars} today={today} />
          <StreaksCard rows={streaks} />
        </div>
      </div>

      <div className="grid items-stretch gap-4 md:gap-5 min-[768px]:grid-cols-2 min-[1024px]:grid-cols-3 min-[1400px]:grid-cols-5">
        <ReadingCard book={reading} streak={data.books?.reading.streak ?? 0} pagesToday={reading ? (data.books?.pagesToday[reading.id] ?? 0) : 0} today={today} />
        <div className="hidden md:contents">
          <LearningMini overview={data.skills} today={today} />
          <ChallengesCard trackers={data.challenges} today={today} />
        </div>
        {/* Phones see it only while Ramadan is going on (the card decides). */}
        <RamadanCard trackers={data.ramadan} today={today} />
        <div className="hidden md:contents">
          <JournalNotesCard summary={data.writing} />
        </div>
      </div>

      <HabitDrawer open={habitOpen} onClose={() => setHabitOpen(false)} editing={null} reminders={reminders} />
    </PageFrame>
  );
}
