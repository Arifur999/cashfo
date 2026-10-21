"use client";

import { BookOpen, ChevronRight, CircleCheckBig, GraduationCap, Target } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ByWidth from "@/components/smartly/ByWidth";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import SectionHeader from "@/components/smartly/SectionHeader";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { HomePartError } from "./HomePartError";
import { PhonePrayers } from "./HomePhone";
import { HomeTodoCard } from "./HomeTodoCard";
import { SectionLink } from "./SectionLink";
import type { HomeData } from "./homeTypes";

const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

// Habits on Home: today's prayers, today's to-do list and the streaks
// (challenges, the book on the go, skills). Personal, so it shows the same
// in every workspace -- and on the setup screen too.
export function HomeHabits({ data }: { data: HomeData }) {
  const { t, locale } = useLocale();
  const namaz = data.namaz;
  const prayersDone = namaz ? namaz.checks.filter((c) => c.day === namaz.todayDay && c.status !== "MISSED").map((c) => c.item) : [];
  const prayerItems = namaz?.items.length ? namaz.items : PRAYERS;
  const prayerHref = namaz ? `/habit-tracker/habits/namaz/${namaz.id}` : "/habit-tracker/habits?category=Namaz";
  const counts = { done: formatCount(prayersDone.length, locale), total: formatCount(prayerItems.length, locale) };

  return (
    <section aria-labelledby="h-habits" className="flex flex-col gap-3 md:gap-4">
      <SectionHeader
        id="h-habits"
        eyebrow={t("Habits")}
        tone="habits"
        title={<ByWidth phone={t("Today's prayers")} wide={t("Today")} />}
        aside={<SectionLink href="/habit-tracker" phone={t("Open")} wide={t("Open habits")} arrow />}
      />
      <PhonePrayers data={data} prayers={prayerItems} done={prayersDone} href={prayerHref} />
      <div className="hidden gap-4 md:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
        <Card className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-h3 leading-6 text-ink">{t("Today's prayers")}</h3>
              {!data.unavailable.includes("namaz") && <span className="text-small text-ink-muted">{namaz ? t("{done} of {total} ticked today", counts) : t("No month tracked yet")}</span>}
            </div>
            {namaz && (
              <Chip tone="habits" className="font-semibold">
                {t("{done} of {total}", counts)}
              </Chip>
            )}
          </div>
          {data.unavailable.includes("namaz") ? (
            <HomePartError className="p-0" />
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {prayerItems.map((prayer) => {
                const done = prayersDone.includes(prayer);
                return (
                  <Link key={prayer} href={prayerHref} className={cn("flex flex-col items-center gap-2 rounded-md border border-transparent px-1 py-3", done ? "bg-mint-50" : "bg-surface-sunken")}>
                    <span className={cn("flex size-8 items-center justify-center rounded-full text-on-action", done ? "bg-emerald" : "border-[1.5px] border-dashed border-line-strong bg-surface")}>
                      {done && <CircleCheckBig className="size-4" strokeWidth={2.5} aria-hidden="true" />}
                    </span>
                    <span className="text-small font-semibold text-ink">{t(prayer)}</span>
                    <span className={cn("text-caption", done ? "text-brand-ink" : "font-normal text-ink-muted")}>{done ? t("Done") : t("Not yet")}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
        <HomeTodoCard />
        <StreaksCard data={data} />
      </div>
    </section>
  );
}

// What the challenges, the book on the go and the skills streak say, each
// a row that opens its page.
function StreaksCard({ data }: { data: HomeData }) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const failed = (["challenges", "books", "skills"] as const).filter((name) => data.unavailable.includes(name));
  const couldNot = t("Couldn't load this part right now.");
  const running = data.challengesRunning;
  const skills = data.skills;
  const streak = skills?.streak ?? 0;

  return (
    <Card className="flex flex-col gap-2">
      <h3 className="mb-1 text-h3 leading-6 text-ink">{t("Streaks")}</h3>
      {/* "Challenges", what it counts and opens: the Others sheets still going.
          With none going, "Start a challenge" opens the New challenge dialog,
          as Habits' own does (?new=1). */}
      <StreakRow
        icon={<Target />}
        title={t("Challenges")}
        text={failed.includes("challenges") ? couldNot : running > 0 ? t("{count} running", { count: formatCount(running, locale) }) : t("Start a challenge")}
        href={running > 0 || failed.includes("challenges") ? "/habit-tracker/habits?category=Others" : "/habit-tracker/habits?category=Others&new=1"}
      />
      <StreakRow
        icon={<BookOpen />}
        title={data.reading ? t("Reading · {title}", { title: data.reading.title }) : t("Reading")}
        text={
          failed.includes("books")
            ? couldNot
            : data.reading
              ? t("Page {read} of {total}", { read: formatCount(data.reading.pagesRead, locale), total: formatCount(data.reading.totalPages, locale) })
              : t("Nothing on the go")
        }
        href="/habit-tracker/habits?category=Book"
      />
      <StreakRow
        icon={<GraduationCap />}
        title={skills?.hasSkills && streak > 0 ? t(streak === 1 ? "Skills · {count} day" : "Skills · {count} days", { count: formatCount(streak, locale) }) : t("Skills")}
        text={
          failed.includes("skills")
            ? couldNot
            : !skills?.hasSkills
              ? t("Start learning a skill")
              : skills.practisedToday
                ? t("Practised today")
                : streak > 0
                  ? t("Practise again today to keep it")
                  : t("Practise today to start a streak")
        }
        href="/habit-tracker/habits?category=Course"
      />
      {failed.length > 0 && (
        <Button variant="ghost" size="sm" onClick={() => router.refresh()} className="mt-1 self-start">
          {t("Try again")}
        </Button>
      )}
    </Card>
  );
}

function StreakRow({ icon, title, text, href }: { icon: React.ReactNode; title: string; text: string; href: string }) {
  return (
    <Link href={href} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-hover">
      <IconTile tone="habits">{icon}</IconTile>
      <span className="flex min-w-0 flex-1 flex-col">
        <b className="truncate text-body leading-5 font-bold text-ink">{title}</b>
        <span className="text-small text-ink-muted">{text}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
    </Link>
  );
}
