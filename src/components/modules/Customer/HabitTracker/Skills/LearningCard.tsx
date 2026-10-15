"use client";

import { Plus } from "lucide-react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import type { Skill, SkillWeekDay } from "@/lib/customer/api";
import { practiceLine, progressPct, progressText, QUICK_ADD } from "@/lib/customer/skillsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { paletteFor } from "./skillPalette";
import { SkillTile } from "./SkillTile";

interface LearningCardProps {
  skill: Skill;
  week: SkillWeekDay[];
  today: string;
  isPending: boolean;
  onQuickAdd: (skill: Skill, amount: number) => void;
  onLog: (skill: Skill) => void;
}

// One skill being learned: how far along, when it was last practised, and a
// quick "+1 lesson" or "+30 min".
export function LearningCard({ skill, week, today, isPending, onQuickAdd, onLog }: LearningCardProps) {
  const { t } = useLocale();
  const palette = paletteFor(skill.color);
  const pct = progressPct(skill);
  const quick = QUICK_ADD[skill.unit];
  const lastLine = practiceLine(skill, week, today, t) ?? t("Nothing logged this week");

  return (
    <Card padding="none" className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-3">
        <SkillTile icon={skill.icon} color={skill.color} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-title font-semibold text-ink">{skill.name}</span>
          <span className="truncate text-small text-ink-muted">{[skill.source, t(skill.unit === "LESSONS" ? "lessons" : "hours")].filter(Boolean).join(" · ")}</span>
        </span>
        <Chip tone="info" size="sm">
          {t("Learning")}
        </Chip>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-small">
          <span className="font-semibold text-ink tabular-nums">{progressText(skill, t)}</span>
          <span className="text-ink-muted">{pct}%</span>
        </div>
        <span role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${skill.name}: ${t("done")}`} className="block h-2 overflow-hidden rounded-full bg-surface-sunken">
          <span className="block h-full rounded-full transition-[width]" style={{ width: `${pct}%`, background: palette.to }} />
        </span>
        <span className="text-small text-ink-muted">{lastLine}</span>
      </div>

      <div className="mt-auto flex gap-2 border-t border-surface-sunken pt-3">
        <Button type="button" variant="soft" size="sm" onClick={() => onQuickAdd(skill, quick.amount)} disabled={isPending} className="bg-(--sk-ink)/12 text-(--sk-ink) hover:bg-(--sk-ink)/20 dark:bg-(--sk-light)/16 dark:text-(--sk-light)" style={{ "--sk-ink": palette.to, "--sk-light": palette.from } as React.CSSProperties}>
          <Plus strokeWidth={2.25} />
          {t(quick.label)}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => onLog(skill)} disabled={isPending}>
          {t("Log progress")}
        </Button>
      </div>
    </Card>
  );
}
