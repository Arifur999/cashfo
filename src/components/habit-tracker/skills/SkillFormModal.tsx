"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type TransitionStartFunction } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { Skill, SkillStatus, SkillUnit } from "@/lib/api";
import { createSkillAction, updateSkillAction } from "@/lib/skillActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { hoursInput, parseHours } from "./skillMath";
import { SKILL_ICONS, SKILL_PALETTE, suggestColor } from "./skillPalette";
import { SKILL_CTA, STATUS_META } from "./skillTheme";
import { SkillIcon } from "./SkillIcon";
import { SkillTile } from "./SkillTile";

const STATUSES: SkillStatus[] = ["WANT_TO_LEARN", "LEARNING", "COMPLETED"];
const UNITS: { key: SkillUnit; label: string }[] = [
  { key: "LESSONS", label: "Lessons" },
  { key: "HOURS", label: "Hours" },
];
const MAX_LESSONS = 2000;
const MAX_MINUTES = 60000;
const MIN_MINUTES = 30;

const INPUT =
  "w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 aria-[invalid=true]:border-red-400";

interface SkillFormModalProps {
  open: boolean;
  onClose: () => void;
  skill: Skill | null; // the skill being edited; null = add a new one
}

// Add or edit a skill. The form itself lives in an inner component that is only
// mounted while the dialog is open, so its fields start fresh every time.
export function SkillFormModal({ open, onClose, skill }: SkillFormModalProps) {
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();

  // Once a save is in flight it will finish either way, so the dialog can't be
  // dismissed (Cancel / Escape / the X) in the meantime.
  function handleClose() {
    if (!isPending) onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={t(skill ? "Edit skill" : "Add a skill")} size="lg">
      <SkillForm skill={skill} onClose={handleClose} isPending={isPending} startTransition={startTransition} />
    </Modal>
  );
}

function SkillForm({ skill, onClose, isPending, startTransition }: { skill: Skill | null; onClose: () => void; isPending: boolean; startTransition: TransitionStartFunction }) {
  const router = useRouter();
  const { t } = useLocale();
  const ids = { name: useId(), source: useId(), target: useId(), done: useId() };

  const [name, setName] = useState(skill?.name ?? "");
  const [source, setSource] = useState(skill?.source ?? "");
  const [unit, setUnit] = useState<SkillUnit>(skill?.unit ?? "LESSONS");
  // The target as typed: lessons, or hours (decimals allowed) for HOURS.
  const [target, setTarget] = useState(skill ? (skill.unit === "HOURS" ? hoursInput(skill.target) : String(skill.target)) : "");
  const [status, setStatus] = useState<SkillStatus>("WANT_TO_LEARN");
  const [done, setDone] = useState("");
  const [icon, setIcon] = useState(skill?.icon ?? "sparkles");
  // Until the learner picks a colour, a new skill takes one from its name.
  const [pickedColor, setPickedColor] = useState<string | null>(skill?.color ?? null);
  const color = pickedColor ?? suggestColor(name.trim());

  const isHours = unit === "HOURS";
  // Everything below is in the skill's stored unit (lessons, or minutes).
  const targetUnits = isHours ? parseHours(target) : /^\d+$/.test(target) ? Number(target) : null;
  const targetOk = targetUnits !== null && (isHours ? targetUnits >= MIN_MINUTES && targetUnits <= MAX_MINUTES : targetUnits >= 1 && targetUnits <= MAX_LESSONS);
  const doneUnits = done === "" ? 0 : isHours ? parseHours(done) : /^\d+$/.test(done) ? Number(done) : null;
  const doneTooHigh = status === "LEARNING" && targetOk && doneUnits !== null && doneUnits > targetUnits;
  const doneBad = status === "LEARNING" && done !== "" && doneUnits === null;
  const nameOk = name.trim().length > 0;
  // The server rejects a target below the progress already made (it used to
  // mark the skill completed, which lost the real progress once the typo was
  // fixed). A completed skill is exempt: its progress follows the new target.
  const shrinksBelowProgress = skill !== null && skill.status !== "COMPLETED" && targetOk && targetUnits < skill.progress;
  const valid = nameOk && targetOk && !doneTooHigh && !doneBad && !shrinksBelowProgress;

  function submit() {
    if (!valid || targetUnits === null) return;
    startTransition(async () => {
      const details = { name: name.trim(), source: source.trim(), target: targetUnits, icon, color };
      const result = skill
        ? await updateSkillAction(skill.id, details)
        : await createSkillAction({ ...details, unit, status, ...(status === "LEARNING" ? { progress: doneUnits ?? 0 } : {}) });
      if (result.success) {
        toast.success(t(skill ? "Skill updated" : "Skill added"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to save skill"));
      }
    });
  }

  const targetHint = isHours ? "Enter hours from 0.5 to 1000." : "Enter a number from 1 to 2000.";
  const showTargetError = target !== "" && !targetOk;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid gap-5 sm:grid-cols-[9rem_minmax(0,1fr)]"
    >
      <div className="hidden sm:block">
        <SkillTile icon={icon} color={color} className="w-full" />
        <p className="mt-3 line-clamp-2 break-words text-center text-sm font-semibold text-neutral-800">{name.trim() || t("Your skill name")}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor={ids.name} className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Name")}
          </label>
          <input id={ids.name} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus placeholder={t("e.g. Learn React")} className={INPUT} />
        </div>
        <div>
          <label htmlFor={ids.source} className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Where from")} <span className="font-normal text-neutral-400">({t("Optional")})</span>
          </label>
          <input id={ids.source} value={source} onChange={(e) => setSource(e.target.value)} maxLength={80} placeholder={t("e.g. Udemy, YouTube, Self")} className={INPUT} />
        </div>

        {!skill && (
          <div>
            <p id={`${ids.name}-unit`} className="mb-1 block text-sm font-medium text-neutral-700">
              {t("Measured in")}
            </p>
            <div role="group" aria-labelledby={`${ids.name}-unit`} className="grid grid-cols-2 gap-2">
              {UNITS.map((u) => (
                <button
                  key={u.key}
                  type="button"
                  aria-pressed={unit === u.key}
                  onClick={() => {
                    if (u.key !== unit) {
                      setUnit(u.key);
                      setTarget("");
                      setDone("");
                    }
                  }}
                  className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                    unit === u.key ? "border-violet-600 bg-violet-600/10 text-violet-800 dark:text-violet-300" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  {t(u.label)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor={ids.target} className="mb-1 block text-sm font-medium text-neutral-700">
            {t(isHours ? "Goal (hours)" : "Total lessons")}
          </label>
          <input
            id={ids.target}
            value={target}
            onChange={(e) => setTarget(e.target.value.replace(isHours ? /[^0-9.]/g : /\D/g, "").slice(0, 7))}
            inputMode={isHours ? "decimal" : "numeric"}
            placeholder={isHours ? "40" : "24"}
            aria-invalid={showTargetError || shrinksBelowProgress}
            aria-describedby={showTargetError || shrinksBelowProgress ? `${ids.target}-error` : undefined}
            className={INPUT}
          />
          {showTargetError && (
            <p id={`${ids.target}-error`} className="mt-1.5 text-xs text-red-500">
              {t(targetHint)}
            </p>
          )}
          {shrinksBelowProgress && !showTargetError && (
            <p id={`${ids.target}-error`} className="mt-1.5 text-xs text-red-500">
              {t("Your progress is already more than this target.")}
            </p>
          )}
        </div>

        {!skill && (
          <div>
            <p id={`${ids.name}-status`} className="mb-1 block text-sm font-medium text-neutral-700">
              {t("Status")}
            </p>
            <div role="group" aria-labelledby={`${ids.name}-status`} className="grid grid-cols-3 gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => setStatus(s)}
                  className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                    status === s ? "border-violet-600 bg-violet-600/10 text-violet-800 dark:text-violet-300" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  {t(STATUS_META[s].label)}
                </button>
              ))}
            </div>
            {status === "LEARNING" && (
              <div className="mt-3">
                <label htmlFor={ids.done} className="mb-1 block text-sm font-medium text-neutral-700">
                  {t(isHours ? "Hours done so far" : "Lessons done so far")}
                </label>
                <input
                  id={ids.done}
                  value={done}
                  onChange={(e) => setDone(e.target.value.replace(isHours ? /[^0-9.]/g : /\D/g, "").slice(0, 7))}
                  inputMode={isHours ? "decimal" : "numeric"}
                  placeholder="0"
                  aria-invalid={doneTooHigh || doneBad}
                  aria-describedby={doneTooHigh || doneBad ? `${ids.done}-error` : undefined}
                  className={INPUT}
                />
                {(doneTooHigh || doneBad) && (
                  <p id={`${ids.done}-error`} className="mt-1.5 text-xs text-red-500">
                    {doneTooHigh ? t("That's more than the target.") : t("Enter a valid number.")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <p id={`${ids.name}-icon`} className="mb-2 block text-sm font-medium text-neutral-700">
            {t("Icon")}
          </p>
          <div role="group" aria-labelledby={`${ids.name}-icon`} className="flex flex-wrap gap-2">
            {SKILL_ICONS.map((i) => (
              <button
                key={i.key}
                type="button"
                aria-pressed={icon === i.key}
                aria-label={t(i.label)}
                title={t(i.label)}
                onClick={() => setIcon(i.key)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                  icon === i.key ? "border-violet-600 bg-violet-600/10 text-violet-700 dark:text-violet-300" : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                }`}
              >
                <SkillIcon icon={i.key} className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <p id={`${ids.name}-colour`} className="mb-2 block text-sm font-medium text-neutral-700">
            {t("Colour")}
          </p>
          <div role="group" aria-labelledby={`${ids.name}-colour`} className="flex flex-wrap gap-2.5">
            {SKILL_PALETTE.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={color === p.key}
                aria-label={t(p.label)}
                title={t(p.label)}
                onClick={() => setPickedColor(p.key)}
                className={`h-7 w-7 rounded-full transition ${color === p.key ? "ring-2 ring-violet-600 ring-offset-2 ring-offset-surface" : "hover:scale-110"}`}
                style={{ backgroundImage: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 sm:col-span-2">
        <button type="button" onClick={onClose} disabled={isPending} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50">
          {t("Cancel")}
        </button>
        <button type="submit" disabled={!valid || isPending} className={SKILL_CTA}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t(skill ? "Save" : "Add Skill")}
        </button>
      </div>
    </form>
  );
}
