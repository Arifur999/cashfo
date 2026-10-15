"use client";

import { Flame } from "lucide-react";
import Link from "next/link";
import Card from "@/components/smartly/Card";
import type { SkillsOverview } from "@/lib/customer/api";
import { byStatus, practiceLine, progressPct, progressText } from "@/lib/customer/skillsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { paletteFor } from "../Skills/skillPalette";

interface LearningMiniProps {
  overview: SkillsOverview | null;
  today: string;
}

// The skills being learned, in brief, and the practice streak.
export function LearningMini({ overview, today }: LearningMiniProps) {
  const { t } = useLocale();
  const learning = overview ? byStatus(overview.skills, "LEARNING").slice(0, 2) : [];
  const streak = overview?.streak ?? 0;

  return (
    <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title font-semibold text-ink">{t("Now learning")}</h2>
        <Link href="/habit-tracker/habits?category=Course" className="text-small font-semibold text-emerald hover:underline">
          {t("Skills")}
        </Link>
      </div>
      {learning.length === 0 ? (
        <span className="py-3 text-small text-ink-muted">{t("Nothing on the go. Start a skill to see it here.")}</span>
      ) : (
        learning.map((skill) => {
          const pct = progressPct(skill);
          return (
            <div key={skill.id} className="flex flex-col gap-1">
              <div className="flex justify-between gap-2 text-small">
                <span className="truncate font-semibold text-ink">{skill.name}</span>
                <span className="shrink-0 text-ink-muted tabular-nums">{progressText(skill, t)}</span>
              </div>
              <span role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${skill.name}: ${t("done")}`} className="block h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: paletteFor(skill.color).to }} />
              </span>
              <span className="text-caption text-ink-muted">{(overview && practiceLine(skill, overview.week, today, t)) ?? t("Nothing logged this week")}</span>
            </div>
          );
        })
      )}
      <div className="mt-auto flex items-center gap-1 border-t border-surface-sunken pt-3 text-small font-semibold text-ink">
        <Flame className={streak > 0 ? "size-4 text-warning" : "size-4 text-ink-muted"} aria-hidden="true" />
        {streak > 0 ? `${t("Practice streak")}: ${streak} ${t(streak === 1 ? "day" : "days")}` : t("No practice streak yet")}
      </div>
    </Card>
  );
}
