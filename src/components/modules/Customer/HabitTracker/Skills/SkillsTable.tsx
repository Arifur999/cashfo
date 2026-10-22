"use client";

import { Check, Pencil, Play, PlusCircle, RotateCcw, Trash2, type LucideIcon } from "lucide-react";
import { useState } from "react";
import Chip from "@/components/smartly/Chip";
import { ListCard, ListCell, ListFooter, ListGroupRow, ListHead, ListHeadCell, ListRow, ListRowButton } from "@/components/smartly/list";
import LoadMore from "@/components/smartly/LoadMore";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Skill, SkillStatus, SkillWeekDay } from "@/lib/customer/api";
import { dayText, instantText } from "@/lib/customer/habitDisplay";
import { lastActivity, progressPct, progressText, relativeDay, STATUS_LABEL, STATUS_ORDER } from "@/lib/customer/skillsDisplay";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
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

// From xl, where a skill is learned has a column of its own. Narrower (a
// tablet, or a laptop beside the sidebar) the five columns and the inset
// would take the whole card and leave the names no room, so the source sits
// under the name instead.
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_220px_130px_120px] xl:grid-cols-[minmax(0,1fr)_120px_220px_130px_120px]";
const LIST_ID = "all-skills";
// A long list grows 50 rows at a time.
const STEP = 50;

// Every skill in one table, grouped by where it stands, with this year's
// goal in the corner. A row opens a short menu of what can happen to that
// skill.
export function SkillsTable({ skills, week, today, year, goalTarget, completedThisYear, onEditGoal, onAction }: SkillsTableProps) {
  const { t, locale } = useLocale();
  const [shown, setShown] = useState(STEP);
  const rows = STATUS_ORDER.flatMap((status) => skills.filter((skill) => skill.status === status));
  const visible = rows.slice(0, shown);
  const goalPct = goalTarget ? Math.min(100, Math.round((completedThisYear / goalTarget) * 100)) : 0;
  const count = (n: number) => formatCount(n, locale);

  function lastPractised(skill: Skill): string {
    const last = lastActivity(week, skill.id);
    if (last) {
      const when = relativeDay(last.date, today);
      return when === "today" ? t("Today") : when === "yesterday" ? t("Yesterday") : dayText(last.date, locale, "dayMonth");
    }
    if (skill.status === "COMPLETED" && skill.completedAt) return instantText(skill.completedAt, locale);
    if (skill.progress > 0) return instantText(skill.updatedAt, locale);
    return t("Not started");
  }

  const row = (skill: Skill) => {
    const palette = paletteFor(skill.color);
    const bar = (
      <span className="h-1.5 min-w-12 flex-1 overflow-hidden rounded-full bg-surface-sunken">
        <span className="block h-full rounded-full" style={{ width: `${progressPct(skill)}%`, background: palette.to }} />
      </span>
    );
    const progress = <span className="text-small whitespace-nowrap text-ink-2 tabular-nums">{progressText(skill, t, locale)}</span>;
    return (
      // The row stays lit while its menu is open.
      <ListRow key={skill.id} columns={COLUMNS} density="regular" className="has-[[data-slot=list-row-button][data-state=open]]:bg-hover">
        <ListCell className="flex min-w-0 flex-col gap-2">
          <span className="flex min-w-0 items-center gap-3">
            <SkillTile icon={skill.icon} color={skill.color} size={30} />
            <span className="flex min-w-0 flex-col">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <ListRowButton aria-label={t("{name}: actions", { name: skill.name })} className="truncate font-semibold">
                    {skill.name}
                  </ListRowButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
                  {MENU[skill.status].map((item) => (
                    <DropdownMenuItem key={item.action} onSelect={() => onAction(skill, item.action)} className={item.action === "remove" ? "rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense pointer-coarse:min-h-11" : "rounded-md px-3 py-2 text-body text-ink focus:bg-surface-sunken pointer-coarse:min-h-11"}>
                      <item.icon className="size-4" aria-hidden="true" />
                      {t(item.label)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {/* md to xl: where it is learned, under the name (outside the button, whose label names the menu). */}
              {skill.source && <span className="hidden truncate text-small text-ink-muted md:block xl:hidden">{skill.source}</span>}
            </span>
          </span>
          {/* Phones: the progress under the name. */}
          <span className="flex items-center gap-3 md:hidden">
            {bar}
            {progress}
          </span>
        </ListCell>
        <ListCell className="hidden truncate text-ink-2 xl:block">{skill.source || "—"}</ListCell>
        <ListCell className="hidden items-center gap-3 md:flex">
          {bar}
          {progress}
        </ListCell>
        <ListCell className="flex flex-col items-end gap-1 md:items-start">
          <Chip tone={STATUS_TONE[skill.status]} size="sm">
            {t(STATUS_LABEL[skill.status])}
          </Chip>
          <span className="text-caption text-ink-muted md:hidden">{lastPractised(skill)}</span>
        </ListCell>
        <ListCell align="end" className="hidden text-ink-2 md:block">
          {lastPractised(skill)}
        </ListCell>
      </ListRow>
    );
  };

  return (
    <ListCard
      id={LIST_ID}
      label={t("All skills")}
      header={
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 md:px-6">
          <h2 className="text-title text-ink">{t("All skills")}</h2>
          <span className="flex flex-wrap items-center gap-2 text-small text-ink-2">
            <span>{fillNodes(t("{year} goal: {figure}"), { year: toLocaleDigits(String(year), locale), figure: <b className="font-semibold text-ink">{goalTarget ? t("{done} of {total} completed", { done: count(completedThisYear), total: count(goalTarget) }) : t("not set")}</b> })}</span>
            {goalTarget !== null && (
              <span className="h-1.5 w-22.5 overflow-hidden rounded-full bg-surface-sunken">
                <span className="block h-full rounded-full bg-emerald" style={{ width: `${goalPct}%` }} />
              </span>
            )}
            <button type="button" onClick={onEditGoal} className="flex min-h-8 items-center font-semibold text-emerald hover:underline pointer-coarse:min-h-11">
              {goalTarget ? t("Edit") : t("Set a goal")}
            </button>
          </span>
        </div>
      }
      footer={
        rows.length > STEP && (
          <ListFooter>
            <LoadMore shown={Math.min(shown, rows.length)} total={rows.length} step={STEP} onMore={() => setShown((value) => value + STEP)} onLess={shown >= rows.length ? () => setShown(STEP) : undefined} focusTargetId={LIST_ID} />
          </ListFooter>
        )
      }
    >
      <ListHead columns={COLUMNS}>
        <ListHeadCell>{t("Skill")}</ListHeadCell>
        <ListHeadCell className="hidden xl:block">{t("Where")}</ListHeadCell>
        <ListHeadCell>{t("Progress")}</ListHeadCell>
        <ListHeadCell>{t("Status")}</ListHeadCell>
        <ListHeadCell align="end">{t("Last practised")}</ListHeadCell>
      </ListHead>
      {STATUS_ORDER.filter((status) => visible.some((skill) => skill.status === status)).map((status, index) => {
        const all = skills.filter((skill) => skill.status === status).length;
        return (
          <div key={status} role="rowgroup">
            {/* A band after another group draws the line between them. */}
            <ListGroupRow label={t(STATUS_LABEL[status])} aside={count(all)} className={index > 0 ? "border-t border-line" : undefined} />
            {visible.filter((skill) => skill.status === status).map(row)}
          </div>
        );
      })}
    </ListCard>
  );
}
