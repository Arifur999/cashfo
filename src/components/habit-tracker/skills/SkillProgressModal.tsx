"use client";

import { useId, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import type { Skill } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { DISPLAY_STACK } from "./fonts";
import { hoursInput, parseHours, targetLine } from "./skillMath";
import { SKILL_CTA, SKILL_FINISH_BTN, SKILL_OUTLINE_BTN } from "./skillTheme";
import { SkillTile } from "./SkillTile";

interface SkillProgressModalProps {
  skill: Skill | null; // null = closed
  onClose: () => void;
  onSave: (skill: Skill, progress: number) => void;
}

// "How far along are you?" -- a number box, a slider and a few quick chips.
// Progress is in the skill's stored unit (lessons, or minutes shown as hours).
export function SkillProgressModal({ skill, onClose, onSave }: SkillProgressModalProps) {
  const { t } = useLocale();
  return (
    <Modal open={skill !== null} onClose={onClose} title={t("Update progress")}>
      {skill && <ProgressForm key={skill.id} skill={skill} onClose={onClose} onSave={onSave} />}
    </Modal>
  );
}

function ProgressForm({ skill, onClose, onSave }: { skill: Skill; onClose: () => void; onSave: (skill: Skill, progress: number) => void }) {
  const { t } = useLocale();
  const inputId = useId();
  const isHours = skill.unit === "HOURS";
  const target = skill.target;
  const [text, setText] = useState(isHours ? hoursInput(skill.progress) : String(skill.progress));

  const parsed = text === "" ? 0 : isHours ? parseHours(text) : /^\d+$/.test(text) ? Number(text) : null;
  const invalid = text !== "" && parsed === null;
  const value = Math.min(parsed ?? 0, target);
  const show = (units: number) => (isHours ? hoursInput(units) : String(units));
  const set = (units: number) => setText(show(Math.min(target, Math.max(0, units))));
  const chips: { delta: number; label: string }[] = isHours
    ? [
        { delta: -30, label: `-30 ${t("min")}` },
        { delta: 30, label: `+30 ${t("min")}` },
        { delta: 60, label: `+1 ${t("h")}` },
      ]
    : [
        { delta: -1, label: "-1" },
        { delta: 1, label: "+1" },
        { delta: 2, label: "+2" },
      ];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (invalid) return;
        onSave(skill, value);
      }}
    >
      <div className="mb-5 flex items-center gap-4">
        <SkillTile icon={skill.icon} color={skill.color} className="w-16" />
        <div className="min-w-0">
          <p className="line-clamp-2 break-words text-base font-semibold text-neutral-900" style={{ fontFamily: DISPLAY_STACK }}>
            {skill.name}
          </p>
          {skill.source && <p className="truncate text-sm text-neutral-500">{skill.source}</p>}
        </div>
      </div>

      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-neutral-700">
        {t(isHours ? "How many hours have you done?" : "Which lesson are you on?")}
      </label>
      <div className="flex items-center gap-3">
        <input
          id={inputId}
          value={text}
          onChange={(e) => {
            const cleaned = e.target.value.replace(isHours ? /[^0-9.]/g : /\D/g, "").slice(0, 7);
            const units = cleaned === "" ? 0 : isHours ? parseHours(cleaned) : /^\d+$/.test(cleaned) ? Number(cleaned) : null;
            setText(units !== null && units > target ? show(target) : cleaned);
          }}
          inputMode={isHours ? "decimal" : "numeric"}
          autoFocus
          aria-invalid={invalid}
          aria-describedby={invalid ? `${inputId}-error` : undefined}
          className="w-28 rounded-xl border border-neutral-200 px-3.5 py-2.5 text-center text-lg font-semibold tabular-nums outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 aria-[invalid=true]:border-red-400"
        />
        <span className="text-sm tabular-nums text-neutral-500">/ {targetLine(skill, t)}</span>
      </div>
      {invalid && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red-500">
          {t("Enter a valid number.")}
        </p>
      )}

      <input
        type="range"
        min={0}
        max={target}
        step={isHours ? (target <= 300 ? 1 : 5) : 1}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        aria-label={t(isHours ? "How many hours have you done?" : "Which lesson are you on?")}
        className="mt-4 w-full accent-violet-600"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button key={chip.delta} type="button" onClick={() => set(value + chip.delta)} className={`${SKILL_OUTLINE_BTN} tabular-nums`}>
            {chip.label}
          </button>
        ))}
        <button type="button" onClick={() => set(target)} className={SKILL_FINISH_BTN}>
          {t("Completed")}
        </button>
      </div>

      {value >= target && <p className="mt-3 text-xs font-medium text-lime-800 dark:text-lime-300">{t("This will mark the skill as completed.")}</p>}

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
          {t("Cancel")}
        </button>
        <button type="submit" disabled={invalid} className={SKILL_CTA}>
          {t("Save")}
        </button>
      </div>
    </form>
  );
}
