"use client";

import { Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Skill, SkillStatus, SkillUnit } from "@/lib/customer/api";
import { createSkillAction, updateSkillAction } from "@/lib/customer/skillActions";
import { hoursInput, MAX_LESSONS, MAX_MINUTES, MIN_MINUTES, parseHours, STATUS_LABEL } from "@/lib/customer/skillsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { SkillIcon } from "./SkillIcon";
import { SKILL_ICONS, SKILL_PALETTE, suggestColor } from "./skillPalette";
import { SkillTile } from "./SkillTile";

interface SkillDrawerProps {
  open: boolean;
  onClose: () => void;
  // The skill being edited; null adds a new one.
  editing: Skill | null;
  onRemove: (skill: Skill) => void;
}

const UNITS: SkillUnit[] = ["LESSONS", "HOURS"];
const UNIT_LABEL: Record<SkillUnit, string> = { LESSONS: "Lessons", HOURS: "Hours" };
const STATUSES: SkillStatus[] = ["WANT_TO_LEARN", "LEARNING", "COMPLETED"];

// Add or edit a skill: what it is, where it is learned, how it is counted
// and how much of it there is, plus an icon and a colour.
export function SkillDrawer({ open, onClose, editing, onRemove }: SkillDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [unit, setUnit] = useState<SkillUnit>("LESSONS");
  // The target as typed: lessons, or hours (decimals allowed).
  const [target, setTarget] = useState("");
  const [status, setStatus] = useState<SkillStatus>("WANT_TO_LEARN");
  const [done, setDone] = useState("");
  const [icon, setIcon] = useState("sparkles");
  // Until the learner picks a colour, a new skill takes one from its name.
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setName(editing?.name ?? "");
      setSource(editing?.source ?? "");
      setUnit(editing?.unit ?? "LESSONS");
      setTarget(editing ? (editing.unit === "HOURS" ? hoursInput(editing.target) : String(editing.target)) : "");
      setStatus("WANT_TO_LEARN");
      setDone("");
      setIcon(editing?.icon ?? "sparkles");
      setPickedColor(editing?.color ?? null);
    }
  }

  const color = pickedColor ?? suggestColor(name.trim());
  const isHours = unit === "HOURS";
  // Everything below is in the skill's stored unit: lessons, or minutes.
  const targetUnits = isHours ? parseHours(target) : /^\d+$/.test(target) ? Number(target) : null;
  const targetOk = targetUnits !== null && (isHours ? targetUnits >= MIN_MINUTES && targetUnits <= MAX_MINUTES : targetUnits >= 1 && targetUnits <= MAX_LESSONS);
  const doneUnits = done === "" ? 0 : isHours ? parseHours(done) : /^\d+$/.test(done) ? Number(done) : null;
  const doneBad = status === "LEARNING" && done !== "" && doneUnits === null;
  const doneTooHigh = status === "LEARNING" && targetOk && doneUnits !== null && doneUnits > targetUnits;
  // The server refuses a target below the progress already made; a completed
  // skill is exempt, its progress simply follows the new target.
  const shrinksBelowProgress = editing !== null && editing.status !== "COMPLETED" && targetOk && targetUnits < editing.progress;
  const valid = name.trim().length > 0 && targetOk && !doneBad && !doneTooHigh && !shrinksBelowProgress;
  const targetError = target !== "" && !targetOk ? t(isHours ? "Enter hours from 0.5 to 1000." : "Enter a number from 1 to 2000.") : shrinksBelowProgress ? t("Your progress is already more than this target.") : undefined;
  const doneError = doneBad ? t("Enter a valid number.") : doneTooHigh ? t("That's more than the target.") : undefined;
  const typed = (value: string) => (isHours ? value.replace(/[^\d.]/g, "").slice(0, 7) : value.replace(/\D/g, "").slice(0, 4));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || targetUnits === null || isPending) return;
    startTransition(async () => {
      const details = { name: name.trim(), source: source.trim(), target: targetUnits, icon, color };
      const result = editing ? await updateSkillAction(editing.id, details) : await createSkillAction({ ...details, unit, status, ...(status === "LEARNING" ? { progress: doneUnits ?? 0 } : {}) });
      if (result.success) {
        toast.success(t(editing ? "Skill updated" : "Skill added"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to save skill"));
      }
    });
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text}
      {optional && <span className="font-normal text-ink-muted"> ({t("Optional")})</span>}
    </span>
  );

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-120 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] data-[side=right]:sm:max-w-120" : "h-[92vh] rounded-t-xl")}>
        <SheetHeader className={cn("flex-row items-start justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <div className="flex flex-col gap-0.5">
            <SheetTitle className="text-h3 text-ink">{editing ? t("Edit skill") : t("Add a skill")}</SheetTitle>
            <span className="text-small text-ink-muted">{t("A course counted in lessons, or any skill counted in hours.")}</span>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <Field htmlFor="sk-name" label={label(t("Name"))}>
              <Input id="sk-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={120} placeholder={t("e.g. React")} />
            </Field>
            <Field htmlFor="sk-source" label={label(t("Where from"), true)}>
              <Input id="sk-source" size="md" value={source} onChange={(event) => setSource(event.target.value)} maxLength={80} placeholder={t("e.g. Udemy, YouTube, Self")} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-body font-medium text-ink">{t("Counted in")}</legend>
                {editing ? <span className="flex h-11 items-center text-body text-ink-2">{t(UNIT_LABEL[editing.unit])}</span> : <SegmentedControl label={t("Counted in")} variant="soft" stretch value={unit} onChange={setUnit} options={UNITS.map((value) => ({ value, label: t(UNIT_LABEL[value]) }))} />}
              </fieldset>
              <Field htmlFor="sk-target" label={label(t(isHours ? "Goal (hours)" : "Total lessons"))} error={targetError}>
                <Input id="sk-target" size="md" inputMode={isHours ? "decimal" : "numeric"} value={target} onChange={(event) => setTarget(typed(event.target.value))} placeholder={isHours ? "30" : "40"} invalid={targetError !== undefined} trailing={<span className="text-small text-ink-muted">{t(isHours ? "hours" : "lessons")}</span>} />
              </Field>
            </div>

            {!editing && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-body font-medium text-ink">{t("Status")}</legend>
                <SegmentedControl label={t("Status")} variant="soft" stretch value={status} onChange={setStatus} options={STATUSES.map((value) => ({ value, label: t(STATUS_LABEL[value]) }))} />
                {status === "LEARNING" && (
                  <Field htmlFor="sk-done" label={<span className="text-small font-medium text-ink-2">{t(isHours ? "Hours done so far" : "Lessons done so far")}</span>} error={doneError} className="mt-2">
                    <Input id="sk-done" size="md" inputMode={isHours ? "decimal" : "numeric"} value={done} onChange={(event) => setDone(typed(event.target.value))} placeholder="0" invalid={doneError !== undefined} frameClassName="w-40" />
                  </Field>
                )}
              </fieldset>
            )}

            <div className="grid grid-cols-[minmax(0,1fr)_150px] gap-5">
              <fieldset className="flex min-w-0 flex-col gap-2">
                <legend className="mb-2 text-body font-medium text-ink">{t("Icon")}</legend>
                <div role="radiogroup" aria-label={t("Icon")} className="grid grid-cols-[repeat(6,36px)] gap-2">
                  {SKILL_ICONS.map((option) => {
                    const on = option.key === icon;
                    return (
                      <button key={option.key} type="button" role="radio" aria-checked={on} aria-label={t(option.label)} title={t(option.label)} onClick={() => setIcon(option.key)} className={cn("flex size-9 items-center justify-center rounded-md border transition-colors [&_svg]:size-4.5", on ? "border-2 border-emerald bg-mint-50 text-emerald" : "border-line bg-surface text-ink-2 hover:border-line-strong")}>
                        <SkillIcon icon={option.key} />
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-body font-medium text-ink">{t("Colour")}</legend>
                <div className="flex items-start gap-3">
                  <SkillTile icon={icon} color={color} />
                  <div role="radiogroup" aria-label={t("Colour")} className="grid grid-cols-[repeat(4,24px)] gap-2">
                    {SKILL_PALETTE.map((option) => {
                      const on = option.key === color;
                      return <button key={option.key} type="button" role="radio" aria-checked={on} aria-label={t(option.label)} title={t(option.label)} onClick={() => setPickedColor(option.key)} className="size-6 rounded-full transition-shadow" style={{ backgroundImage: `linear-gradient(135deg, ${option.from}, ${option.to})`, ...(on && { boxShadow: `0 0 0 2px var(--surface), 0 0 0 4px ${option.to}` }) }} />;
                    })}
                  </div>
                </div>
              </fieldset>
            </div>
          </div>

          <div className={cn("flex items-center gap-3 border-t border-line bg-cream", wide ? "px-6 py-4" : "px-4 py-3")}>
            {editing && (
              <Button type="button" variant="ghost" className="text-expense hover:bg-expense-soft hover:text-expense" onClick={() => onRemove(editing)} disabled={isPending}>
                <Trash2 />
                {t("Remove")}
              </Button>
            )}
            <div className="ml-auto flex items-center gap-3">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={!valid || isPending} className="px-5">
                {isPending && <Loader />}
                {t(editing ? "Save" : "Add skill")}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
