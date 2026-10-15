"use client";

import { X } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Skill } from "@/lib/customer/api";
import { hoursInput, hoursText, parseHours } from "@/lib/customer/skillsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface SkillProgressDialogProps {
  // The skill whose progress is being logged; null keeps the dialog closed.
  skill: Skill | null;
  onClose: () => void;
  onSave: (skill: Skill, progress: number) => void;
  onComplete: (skill: Skill) => void;
}

// "Which lesson are you on?" or "How many hours have you done?", as a total
// so far; the difference from the last total is what today's log records.
export function SkillProgressDialog({ skill, onClose, onSave, onComplete }: SkillProgressDialogProps) {
  const { t } = useLocale();
  const [text, setText] = useState("");

  const [prevId, setPrevId] = useState<string | null>(null);
  const id = skill?.id ?? null;
  if (id !== prevId) {
    setPrevId(id);
    setText(skill ? (skill.unit === "HOURS" ? hoursInput(skill.progress) : String(skill.progress)) : "");
  }

  const isHours = skill?.unit === "HOURS";
  const units = isHours ? parseHours(text) : /^\d+$/.test(text) ? Number(text) : null;
  const valid = skill !== null && units !== null && units <= skill.target;
  const error = text !== "" && units === null ? t("Enter a valid number.") : skill && units !== null && units > skill.target ? t("That's more than the target.") : undefined;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (valid && skill && units !== null) onSave(skill, units);
  }

  return (
    <AlertDialog open={skill !== null} onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent className="w-100 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
            <AlertDialogTitle className="text-h3 text-ink">{t(isHours ? "How many hours have you done?" : "Which lesson are you on?")}</AlertDialogTitle>
            <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
          <AlertDialogDescription className="px-6 pt-4 text-small text-ink-muted">{skill ? `${skill.name} · ${isHours ? `${hoursText(skill.target)} ${t("hours")}` : `${skill.target} ${t("lessons")}`}` : ""}</AlertDialogDescription>
          <div className="px-6 py-4">
            <Field htmlFor="sk-progress" label={<span className="text-body font-medium text-ink">{t(isHours ? "Hours done so far" : "Lessons done so far")}</span>} error={error}>
              <Input id="sk-progress" size="lg" inputMode={isHours ? "decimal" : "numeric"} autoFocus value={text} onChange={(event) => setText(isHours ? event.target.value.replace(/[^\d.]/g, "").slice(0, 7) : event.target.value.replace(/\D/g, "").slice(0, 4))} invalid={error !== undefined} className="text-body-lg font-semibold" frameClassName="w-40" />
            </Field>
          </div>
          <div className="flex items-center gap-3 border-t border-line bg-cream px-6 py-4">
            <Button type="button" variant="ghost" onClick={() => skill && onComplete(skill)}>
              {t("Mark as completed")}
            </Button>
            <div className="ml-auto flex items-center gap-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={!valid} className="px-5">
                {t("Save")}
              </Button>
            </div>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
