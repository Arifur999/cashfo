"use client";

import { ListPlus, Plus } from "lucide-react";
import { useRef, useState } from "react";
import Button from "@/components/smartly/Button";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { hijriDate } from "@/lib/customer/habitDisplay";
import { last7, prayerStreak, restingToday, streakRows } from "@/lib/customer/habitsHome";
import { nowReading } from "@/lib/customer/libraryDisplay";
import { dayLabel } from "@/lib/customer/todoDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { HabitDrawer } from "../Daily/HabitDrawer";
import { ChallengesCard } from "./ChallengesCard";
import { DailyHabitsCard } from "./DailyHabitsCard";
import type { HabitsHomeData } from "./homeTypes";
import { Last7Card } from "./Last7Card";
import { LearningMini } from "./LearningMini";
import { PrayersCard } from "./PrayersCard";
import { RamadanCard } from "./RamadanCard";
import { ReadingCard } from "./ReadingCard";
import { StreaksCard } from "./StreaksCard";
import { TodayTasksCard } from "./TodayTasksCard";

interface HabitsHomePageClientProps {
  data: HabitsHomeData;
}

// Habits › Today: the day in one place -- prayers, habits, tasks, the week
// behind, the streaks alive, and what is being read, learned and attempted.
export function HabitsHomePageClient({ data }: HabitsHomePageClientProps) {
  const { t, locale } = useLocale();
  const { today } = data;
  const [habitOpen, setHabitOpen] = useState(false);
  const taskField = useRef<HTMLInputElement>(null);

  const bars = last7(data.namaz, data.habits, data.logs, today);
  const streaks = streakRows(data.todayRows, data.skills?.streak ?? 0, prayerStreak(data.namaz, today));

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={t("Habits")}
        tone="habits"
        title={t("Today")}
        description={
          <span className="flex items-center gap-2">
            {dayLabel(today, "EEEE, d MMMM yyyy")}
            <span aria-hidden="true" className="size-1 rounded-full bg-ink-faint" />
            {hijriDate(today, locale)}
          </span>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => taskField.current?.focus()}>
              <ListPlus />
              {t("Add task")}
            </Button>
            <Button onClick={() => setHabitOpen(true)}>
              <Plus strokeWidth={2.25} />
              {t("Add habit")}
            </Button>
          </>
        }
      />

      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_372px]">
        <PrayersCard trackers={data.namaz} today={today} />
        <DailyHabitsCard rows={data.todayRows} resting={restingToday(data.habits, today)} today={today} />
      </div>

      <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
        <TodayTasksCard today={today} inputRef={taskField} />
        <Last7Card bars={bars} today={today} />
        <StreaksCard rows={streaks} />
      </div>

      <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4">
        <ReadingCard book={data.books ? nowReading(data.books.books) : null} today={today} />
        <LearningMini overview={data.skills} today={today} />
        <ChallengesCard trackers={data.challenges} today={today} />
        <RamadanCard trackers={data.ramadan} today={today} />
      </div>

      <HabitDrawer open={habitOpen} onClose={() => setHabitOpen(false)} editing={null} />
    </PageFrame>
  );
}
