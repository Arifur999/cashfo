"use client";

import { Check, Pencil, Play, PlusCircle, RotateCcw, Trash2, type LucideIcon } from "lucide-react";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Skill, SkillStatus, SkillWeekDay } from "@/lib/customer/api";
import { formatDate } from "@/lib/customer/date";
import { lastActivity, progressPct, progressText, relativeDay, STATUS_LABEL, STATUS_ORDER } from "@/lib/customer/skillsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { paletteFor } from "./skillPalette";
import { SkillTile } from "./SkillTile";

export type SkillAction = "log" | "complete" | "start" | "again" | "edit" | "remove";

interface SkillsTableProps {
  skills: Skill[];
  week: SkillWeekDay[];
  today: string;
  year: number;
  goalTarget: number | null;
  completedThisYear: number;
  onEditGoal: () => void;
  onAction: (skill: Skill, action: SkillAction) => void;
}

interface MenuItem {
  action: SkillAction;
  label: string;
  icon: LucideIcon;
}

const EDIT: MenuItem = { action: "edit", label: "Edit skill", icon: Pencil };
const REMOVE: MenuItem = { action: "remove", label: "Remove skill", icon: Trash2 };

const MENU: Record<SkillStatus, MenuItem[]> = {
  LEARNING: [{ action: "log", label: "Log progress", icon: PlusCircle }, { action: "complete", label: "Mark as completed", icon: Check }, EDIT, REMOVE],
  WANT_TO_LEARN: [{ action: "start", label: "Start learning", icon: Play }, EDIT, REMOVE],
  COMPLETED: [{ action: "again", label: "Learn again", icon: RotateCcw }, EDIT, REMOVE],
};

const STATUS_TONE = { LEARNING: "info", COMPLETED: "income", WANT_TO_LEARN: "neutral" } as const;

const ROW = "md:grid md:grid-cols-[minmax(0,1fr)_120px_220px_130px_120px] md:items-center md:gap-x-4";

// Every skill in one table, with this year's goal in the corner. A row opens
// a short menu of what can happen to that skill.
export function SkillsTable({ skills, week, today, year, goalTarget, completedThisYear, onEditGoal, onAction }: SkillsTableProps) {
  const { t } = useLocale();
  const rows = STATUS_ORDER.flatMap((status) => skills.filter((skill) => skill.status === status));
  const goalPct = goalTarget ? Math.min(100, Math.round((completedThisYear / goalTarget) * 100)) : 0;

  function lastPractised(skill: Skill): string {
    const last = lastActivity(week, skill.id);
    if (last) {
      const when = relativeDay(last.date, today);
      return when === "today" ? t("Today") : when === "yesterday" ? t("Yesterday") : formatDate(last.date, "d MMM");
    }
    if (skill.status === "COMPLETED" && skill.completedAt) return formatDate(skill.completedAt, "d MMM");
    if (skill.progress > 0) return formatDate(skill.updatedAt, "d MMM");
    return t("Not started");
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <h2 className="text-title font-semibold text-ink">{t("All skills")}</h2>
        <span className="flex items-center gap-2 text-small text-ink-2">
          {year} {t("goal")}:{" "}
          <b className="font-semibold text-ink">{goalTarget ? `${completedThisYear} ${t("of")} ${goalTarget} ${t("completed")}` : t("not set")}</b>
          {goalTarget !== null && (
            <span className="h-1.5 w-22.5 overflow-hidden rounded-full bg-surface-sunken">
              <span className="block h-full rounded-full bg-emerald" style={{ width: `${goalPct}%` }} />
            </span>
          )}
          <button type="button" onClick={onEditGoal} className="font-semibold text-emerald hover:underline">
            {goalTarget ? t("Edit") : t("Set a goal")}
          </button>
        </span>
      </div>
      <div className={cn("hidden border-y border-line bg-cream px-5 py-2 text-caption font-medium text-ink-muted", ROW)}>
        <span>{t("Skill")}</span>
        <span>{t("Where")}</span>
        <span>{t("Progress")}</span>
        <span>{t("Status")}</span>
        <span className="text-right">{t("Last practised")}</span>
      </div>
      {rows.map((skill) => {
        const palette = paletteFor(skill.color);
        return (
          <DropdownMenu key={skill.id}>
            <DropdownMenuTrigger aria-label={`${skill.name}: ${t("actions")}`} className={cn("flex w-full flex-col gap-2 border-b border-surface-sunken px-5 py-3 text-left text-body text-ink transition-colors last:border-b-0 hover:bg-cream/60 data-open:bg-cream/60 md:min-h-13.5 md:py-0", ROW)}>
              <span className="flex min-w-0 items-center gap-3">
                <SkillTile icon={skill.icon} color={skill.color} size={30} />
                <span className="truncate font-semibold">{skill.name}</span>
              </span>
              <span className="hidden truncate text-ink-2 md:block">{skill.source || "—"}</span>
              <span className="flex items-center gap-3">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                  <span className="block h-full rounded-full" style={{ width: `${progressPct(skill)}%`, background: palette.to }} />
                </span>
                <span className="text-small whitespace-nowrap text-ink-2 tabular-nums">{progressText(skill, t)}</span>
              </span>
              <span className="flex items-center gap-2">
                <Chip tone={STATUS_TONE[skill.status]} size="sm">
                  {t(STATUS_LABEL[skill.status])}
                </Chip>
                <span className="text-caption text-ink-muted md:hidden">{lastPractised(skill)}</span>
              </span>
              <span className="hidden text-ink-2 md:block md:text-right">{lastPractised(skill)}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
              {MENU[skill.status].map((item) => (
                <DropdownMenuItem key={item.action} onSelect={() => onAction(skill, item.action)} className={item.action === "remove" ? "rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense" : "rounded-md px-3 py-2 text-body text-ink focus:bg-cream"}>
                  <item.icon className="size-4" aria-hidden="true" />
                  {t(item.label)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </Card>
  );
}
