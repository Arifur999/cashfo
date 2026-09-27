"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Skill, SkillStatus } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { DISPLAY_STACK } from "./fonts";
import { progressLine, progressPct, targetLine } from "./skillMath";
import { SKILL_BAR, SKILL_CARD, STATUS_META } from "./skillTheme";
import { SectionTitle } from "./SectionTitle";
import { SkillTile } from "./SkillTile";

type Filter = "ALL" | SkillStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "LEARNING", label: "Learning" },
  { key: "WANT_TO_LEARN", label: "Want to learn" },
  { key: "COMPLETED", label: "Completed" },
];

const SHELF_ORDER: Record<SkillStatus, number> = { LEARNING: 0, WANT_TO_LEARN: 1, COMPLETED: 2 };

interface SkillLibraryProps {
  skills: Skill[];
  onStart: (skill: Skill) => void;
  onUpdate: (skill: Skill) => void;
  onLearnAgain: (skill: Skill) => void;
  onEdit: (skill: Skill) => void;
  onDelete: (skill: Skill) => void;
}

function SkillCard({ skill, onStart, onUpdate, onLearnAgain, onEdit, onDelete }: { skill: Skill } & Omit<SkillLibraryProps, "skills">) {
  const { t } = useLocale();
  const meta = STATUS_META[skill.status];
  const pct = progressPct(skill);

  const primary =
    skill.status === "WANT_TO_LEARN"
      ? { label: "Start learning", run: () => onStart(skill) }
      : skill.status === "LEARNING"
        ? { label: "Update", run: () => onUpdate(skill) }
        : { label: "Learn again", run: () => onLearnAgain(skill) };

  return (
    <article className={`${SKILL_CARD} group flex min-w-0 flex-col p-3 transition hover:-translate-y-0.5 hover:shadow-md`}>
      <SkillTile icon={skill.icon} color={skill.color} className="mx-auto w-full max-w-[7.5rem]" />
      <h3 className="mt-3 line-clamp-2 break-words text-sm font-semibold leading-snug text-neutral-900" style={{ fontFamily: DISPLAY_STACK }} title={skill.name}>
        {skill.name}
      </h3>
      <p className="mt-0.5 h-4 truncate text-xs text-neutral-500">{skill.source}</p>

      <div className="mt-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.chip}`}>{t(meta.label)}</span>
          <span className="truncate text-[11px] tabular-nums text-neutral-400">{skill.status === "WANT_TO_LEARN" ? targetLine(skill, t) : progressLine(skill, t)}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div className={`h-full rounded-full bg-gradient-to-r ${SKILL_BAR} transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-auto flex items-center gap-1.5 pt-3">
        <button
          type="button"
          onClick={primary.run}
          aria-label={`${t(primary.label)}: ${skill.name}`}
          className="min-w-0 flex-1 truncate rounded-lg border border-violet-900/15 dark:border-violet-300/25 px-2 py-1.5 text-xs font-semibold text-violet-800 dark:text-violet-300 transition hover:bg-violet-600/10"
        >
          {t(primary.label)}
        </button>
        <button
          type="button"
          onClick={() => onEdit(skill)}
          aria-label={`${t("Edit skill")}: ${skill.name}`}
          title={t("Edit skill")}
          className="shrink-0 rounded-md p-1.5 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(skill)}
          aria-label={`${t("Remove skill")}: ${skill.name}`}
          title={t("Remove skill")}
          className="shrink-0 rounded-md p-1.5 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-brand-danger"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

// Every skill as a card, filterable by shelf.
export function SkillLibrary({ skills, onStart, onUpdate, onLearnAgain, onEdit, onDelete }: SkillLibraryProps) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<Filter>("ALL");
  // "All" lists what is being learned first, then the wish list, then the
  // completed ones (each group keeps the server's most-recently-updated-first order).
  const shown = filter === "ALL" ? [...skills].sort((a, b) => SHELF_ORDER[a.status] - SHELF_ORDER[b.status]) : skills.filter((s) => s.status === filter);
  const countOf = (key: Filter) => (key === "ALL" ? skills.length : skills.filter((s) => s.status === key).length);

  return (
    <section>
      <SectionTitle title={t("All skills")} />
      <div role="group" aria-label={t("All skills")} className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                active ? "border-violet-600 bg-violet-600 text-white" : "border-violet-900/15 dark:border-violet-300/25 text-violet-800 dark:text-violet-300 hover:bg-violet-600/10"
              }`}
            >
              {t(label)}
              <span className={`rounded-full px-1.5 tabular-nums ${active ? "bg-white/25 text-white" : "bg-violet-600/10 text-violet-700 dark:text-violet-300"}`}>{countOf(key)}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className={`${SKILL_CARD} px-6 py-10 text-center text-sm text-neutral-400`}>{t("No skills here yet.")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {shown.map((skill) => (
            <SkillCard key={skill.id} skill={skill} onStart={onStart} onUpdate={onUpdate} onLearnAgain={onLearnAgain} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  );
}
