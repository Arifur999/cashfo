"use client";

import { Flame } from "lucide-react";
import Card from "@/components/smartly/Card";
import type { Skill, SkillWeekDay } from "@/lib/customer/api";
import { WEEKDAY_SHORT, weekdayOf } from "@/lib/customer/habitDisplay";
import { amountText, cellText, weekTotal } from "@/lib/customer/skillsDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { paletteFor } from "./skillPalette";

interface ThisWeekCardProps {
  // The skills being learned, one row each.
  skills: Skill[];
  week: SkillWeekDay[];
  streak: number;
  today: string;
}

const GRID = "grid grid-cols-[76px_repeat(7,minmax(0,1fr))] gap-1";

// A row per skill, a cell per day of the last week: how much was practised.
export function ThisWeekCard({ skills, week, streak, today }: ThisWeekCardProps) {
  const { t, locale } = useLocale();

  return (
    <Card padding="none" className="flex flex-col gap-3 rounded-md px-5 py-4.5">
      <div className="flex items-center justify-between">
        <h2 className="text-title font-semibold text-ink">{t("This week")}</h2>
        {streak > 0 && (
          <span className="flex items-center gap-1.25 text-small font-semibold text-ink">
            <Flame className="size-3.5 text-orange-fill" strokeWidth={2.25} aria-hidden="true" />
            {t(streak === 1 ? "{count} day in a row" : "{count} days in a row", { count: formatCount(streak, locale) })}
          </span>
        )}
      </div>

      <div role="table" aria-label={t("Practice each day this week")} className="flex flex-col gap-1.5">
        <div role="row" className={cn(GRID, "text-center text-[11.5px] text-ink-muted")}>
          <span />
          {week.map((day) => {
            const isToday = day.date === today;
            return (
              <span key={day.date} role="columnheader" className={cn(isToday ? "font-bold text-ink" : "font-medium")}>
                {isToday ? t("Today") : t(WEEKDAY_SHORT[weekdayOf(day.date)])}
              </span>
            );
          })}
        </div>
        {skills.length === 0 && <span className="py-2 text-small text-ink-muted">{t("Start a skill and its days show up here.")}</span>}
        {skills.map((skill) => {
          const palette = paletteFor(skill.color);
          return (
            <div key={skill.id} role="row" className={cn(GRID, "items-center")} style={{ "--sk-ink": palette.to, "--sk-light": palette.from } as React.CSSProperties}>
              <span role="rowheader" className="truncate text-[12.5px] font-semibold text-ink">
                {skill.name}
              </span>
              {week.map((day) => {
                const amount = day.bySkill[skill.id] ?? 0;
                return (
                  <span key={day.date} role="cell" title={amount > 0 ? `${amountText(skill.unit, amount, t, locale)} · ${skill.name}` : t("Nothing logged")} className={cn("flex h-7.5 items-center justify-center rounded-[6px] text-[11px] font-bold tabular-nums", amount > 0 ? "bg-(--sk-ink)/12 text-(--sk-ink) dark:bg-(--sk-light)/16 dark:text-(--sk-light)" : "bg-strip")}>
                    {cellText(skill.unit, amount, t, locale)}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>

      {skills.length > 0 && (
        <div className="mt-auto flex flex-wrap justify-between gap-x-3 gap-y-1 border-t border-divider pt-2.5 text-[12.5px] text-ink-soft">
          {skills.map((skill) => (
            <span key={skill.id}>
              {skill.name}: <b className="font-semibold text-ink">{amountText(skill.unit, weekTotal(week, skill.id), t, locale)}</b>
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
