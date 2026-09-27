"use client";

import { Check, Pencil, Plus, Rocket, Trash2 } from "lucide-react";
import type { Skill } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { DISPLAY_STACK } from "./fonts";
import { leftLine, progressLine, progressPct, QUICK_ADD } from "./skillMath";
import { SKILL_BAR, SKILL_CARD, SKILL_CTA, SKILL_FINISH_BTN, SKILL_OUTLINE_BTN, SKILL_PRIMARY_BTN } from "./skillTheme";
import { SectionTitle } from "./SectionTitle";
import { SkillTile } from "./SkillTile";

interface CurrentlyLearningProps {
  learning: Skill[];
  wantToLearn: Skill[]; // offered as "Start" chips when nothing is being learned
  pendingIds: Set<string>; // skills with a progress request in flight
  onQuickAdd: (skill: Skill, amount: number) => void;
  onUpdate: (skill: Skill) => void;
  onFinish: (skill: Skill) => void;
  onStart: (skill: Skill) => void;
  onEdit: (skill: Skill) => void;
  onDelete: (skill: Skill) => void;
  onAdd: () => void;
}

function LearningCard({
  skill,
  pending,
  onQuickAdd,
  onUpdate,
  onFinish,
  onEdit,
  onDelete,
}: { skill: Skill; pending: boolean } & Pick<CurrentlyLearningProps, "onQuickAdd" | "onUpdate" | "onFinish" | "onEdit" | "onDelete">) {
  const { t } = useLocale();
  const pct = progressPct(skill);

  return (
    <article className={`${SKILL_CARD} flex min-w-0 gap-5 p-5`}>
      <SkillTile icon={skill.icon} color={skill.color} className="w-24 sm:w-32" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="line-clamp-2 break-words text-lg font-semibold leading-snug text-neutral-900" style={{ fontFamily: DISPLAY_STACK }} title={skill.name}>
              {skill.name}
            </h3>
            {skill.source && <p className="mt-0.5 truncate text-sm text-neutral-500">{skill.source}</p>}
          </div>
          <div className="flex shrink-0 gap-0.5">
            <button
              type="button"
              onClick={() => onEdit(skill)}
              aria-label={`${t("Edit skill")}: ${skill.name}`}
              title={t("Edit skill")}
              className="rounded-md p-1.5 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(skill)}
              aria-label={`${t("Remove skill")}: ${skill.name}`}
              title={t("Remove skill")}
              className="rounded-md p-1.5 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-brand-danger"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-auto pt-4">
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="text-3xl font-semibold lining-nums tabular-nums leading-none text-neutral-900" style={{ fontFamily: DISPLAY_STACK }}>
              {pct}
              <span className="text-base font-medium text-neutral-400">%</span>
            </span>
            <span className="text-xs tabular-nums text-neutral-500">
              {progressLine(skill, t)} · {leftLine(skill, t)}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
            <div className={`h-full rounded-full bg-gradient-to-r ${SKILL_BAR} transition-all duration-500`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {QUICK_ADD[skill.unit].map((q) => {
              const label = q.suffix ? `${q.value} ${t(q.suffix)}` : q.value;
              return (
                <button
                  key={q.amount}
                  type="button"
                  disabled={pending}
                  onClick={() => onQuickAdd(skill, q.amount)}
                  aria-label={`${label}: ${skill.name}`}
                  className={`${SKILL_OUTLINE_BTN} tabular-nums disabled:opacity-50`}
                >
                  {label}
                </button>
              );
            })}
            <button type="button" disabled={pending} onClick={() => onUpdate(skill)} aria-label={`${t("Update progress")}: ${skill.name}`} className={`${SKILL_PRIMARY_BTN} disabled:opacity-50`}>
              {t("Update")}
            </button>
            <button type="button" disabled={pending} onClick={() => onFinish(skill)} aria-label={`${t("Finish")}: ${skill.name}`} className={`${SKILL_FINISH_BTN} disabled:opacity-50`}>
              <Check className="h-3.5 w-3.5" /> {t("Finish")}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

// The skills being learned right now, as large cards with quick log buttons.
export function CurrentlyLearning({ learning, wantToLearn, pendingIds, onQuickAdd, onUpdate, onFinish, onStart, onEdit, onDelete, onAdd }: CurrentlyLearningProps) {
  const { t } = useLocale();

  return (
    <section>
      <SectionTitle title={t("Currently learning")} count={learning.length} />
      {learning.length === 0 ? (
        <div className={`${SKILL_CARD} flex flex-col items-center px-6 py-10 text-center`}>
          <Rocket className="mb-3 h-9 w-9 text-violet-500" />
          {wantToLearn.length > 0 ? (
            <>
              <p className="text-sm font-medium text-neutral-800">{t("Nothing in progress right now.")}</p>
              <p className="mt-1 text-sm text-neutral-500">{t("Pick one from your want-to-learn list to begin.")}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {wantToLearn.slice(0, 3).map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => onStart(skill)}
                    className="max-w-[16rem] truncate rounded-full border border-violet-900/15 dark:border-violet-300/25 px-3.5 py-1.5 text-xs font-semibold text-violet-800 dark:text-violet-300 transition hover:bg-violet-600/10"
                  >
                    {t("Start")}: {skill.name}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-neutral-500">{t("All caught up -- add your next skill.")}</p>
              <button type="button" onClick={onAdd} className={`${SKILL_CTA} mt-4`}>
                <Plus className="h-4 w-4" /> {t("Add Skill")}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 2xl:grid-cols-3">
          {learning.map((skill) => (
            <LearningCard key={skill.id} skill={skill} pending={pendingIds.has(skill.id)} onQuickAdd={onQuickAdd} onUpdate={onUpdate} onFinish={onFinish} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  );
}
