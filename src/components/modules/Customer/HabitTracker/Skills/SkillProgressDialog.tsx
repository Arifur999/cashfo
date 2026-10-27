"use client";

import { useState } from "react";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Skill } from "@/lib/customer/api";
import { latinDigits } from "@/lib/customer/habitDisplay";
import { amountText, hoursInput, parseHours } from "@/lib/customer/skillsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CloseButton, PanelFooter } from "../Tracker/PanelParts";

interface SkillProgressDialogProps {
  // The skill whose progress is being logged; null keeps the dialog closed.
  skill: Skill | null;
  onClose: () => void;
  onSave: (skill: Skill, progress: number) => void;
  onComplete: (skill: Skill) => void;
}

// What is typed, in either language's digits: lessons as a whole number,
// hours with up to two decimals.
const typed = (value: string, hours: boolean) => (hours ? latinDigits(value).replace(/[^\d.]/g, "").slice(0, 7) : latinDigits(value).replace(/\D/g, "").slice(0, 4));

// "Which lesson are you on?" or "How many hours have you done?", as a total
// so far; the difference from the last total is what today's log records.
export function SkillProgressDialog({ skill, onClose, onSave, onComplete }: SkillProgressDialogProps) {
  const { t, locale } = useLocale();
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
      <AlertDialogContent className="w-100 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-[20px] border border-line bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-4.5">
            <div className="flex min-w-0 flex-col gap-1">
              <AlertDialogTitle className="text-h3 text-ink">{t(isHours ? "How many hours have you done?" : "Which lesson are you on?")}</AlertDialogTitle>
              <AlertDialogDescription className="text-small text-ink-muted">{skill ? `${skill.name} · ${amountText(skill.unit, skill.target, t, locale)}` : ""}</AlertDialogDescription>
            </div>
            <CloseButton onClick={onClose} label={t("Close")} className="-my-0.5 -mr-1.5 size-8.5 rounded-full" />
          </div>
          <div className="px-6 py-5">
            <Field htmlFor="sk-progress" label={<span className="text-body font-medium text-ink">{t(isHours ? "Hours done so far" : "Lessons done so far")}</span>} error={error}>
              <Input id="sk-progress" size="lg" inputMode={isHours ? "decimal" : "numeric"} autoFocus value={text} onChange={(event) => setText(typed(event.target.value, isHours))} invalid={error !== undefined} className="text-body-lg font-semibold" frameClassName="w-40" />
            </Field>
          </div>
          <PanelFooter
            aside={
              <Button type="button" variant="ghost" onClick={() => skill && onComplete(skill)}>
                {t("Mark as completed")}
              </Button>
            }
          >
            <Button type="button" variant="secondary" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!valid} className="px-5">
              {t("Save")}
            </Button>
          </PanelFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
