"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import type { Skill, SkillUnit } from "@/lib/customer/api";
import { actionError } from "@/lib/customer/habitDisplay";
import { longDay } from "@/lib/customer/libraryBoard";
import { createSkillAction, updateSkillAction } from "@/lib/customer/skillActions";
import { categoryOf, countInput, normalizeLink, parseCount, SKILL_CATEGORIES, type SkillCategory, type SkillState, skillHref, STATE_INFO, stateInput, stateOf, UNIT_ORDER, UNITS } from "@/lib/customer/skillsBoard";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "../Books/BookNoteDialog";
import { DayField, LB_AREA, LB_ERROR, LB_FIELD, LB_LABEL, LB_OUTLINE, LB_PRIMARY } from "../Books/LibraryBits";
import { draftFromReminder, type ReminderBook, ReminderSection } from "../Reminders";
import { CategoryIcon } from "./SkillBits";
import { paletteFor, SKILL_PICKER } from "./skillPalette";

const STATES: SkillState[] = ["learning", "want", "paused", "done"];

interface SkillFormDialogProps {
  open: boolean;
  onClose: () => void;
  // The skill being edited; null adds one.
  editing: Skill | null;
  // Whether practice is logged for it (the unit is then fixed).
  hasPractice?: boolean;
  // The skills there are, to keep one name to one skill.
  skills: Skill[];
  // A new skill's category and state (the group or tab it was added from).
  startCategory?: SkillCategory;
  startState?: SkillState;
  reminders?: ReminderBook;
  today: string;
  onSaved?: (skill: Skill, created: boolean) => void;
}

interface Errors {
  name?: string;
  link?: string;
  total?: string;
  base?: string;
  target?: string;
}

// The SkillsList board's "Add a skill" and the SkillDetail board's "Edit
// skill": the name, category, where it is learned and its link, how it is
// counted, the total and what is done already, its state, a target date, a
// colour and the reason -- and a practice reminder, as the app always had.
export function SkillFormDialog({ open, onClose, editing, hasPractice = false, skills, startCategory, startState, reminders, today, onSaved }: SkillFormDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<SkillCategory>("tech");
  const [where, setWhere] = useState("");
  const [link, setLink] = useState("");
  const [unit, setUnit] = useState<SkillUnit>("LESSONS");
  const [total, setTotal] = useState("");
  const [base, setBase] = useState("");
  const [state, setState] = useState<SkillState>("learning");
  const [target, setTarget] = useState("");
  const [color, setColor] = useState("violet");
  const [colorSet, setColorSet] = useState(false);
  const [why, setWhy] = useState("");
  const [reminder, setReminder] = useState(() => draftFromReminder("SKILL", null));
  const [errors, setErrors] = useState<Errors>({});
  const [isPending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? `new-${startCategory ?? ""}-${startState ?? ""}`) : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      const cat = (editing ? categoryOf(editing.category).id : (startCategory ?? "tech")) as SkillCategory;
      setName(editing?.name ?? "");
      setCategory(cat);
      setWhere(editing?.source ?? "");
      setLink(editing?.link ?? "");
      setUnit(editing?.unit ?? "LESSONS");
      setTotal(editing ? countInput(editing.unit, editing.target) : "");
      setBase(editing && editing.base ? countInput(editing.unit, editing.base) : "");
      setState(editing ? stateOf(editing) : (startState ?? "learning"));
      setTarget(editing?.targetDate ?? "");
      setColor(editing?.color ?? categoryOf(cat).color);
      setColorSet(!!editing);
      setWhy(editing?.why ?? "");
      setReminder(draftFromReminder("SKILL", null));
      setErrors({});
    }
  }

  const unitInfo = UNITS[unit];
  const unitLocked = !!editing && hasPractice;
  const started = editing?.startedAt ? editing.startedAt.slice(0, 10) : "";
  const minTarget = started || today;
  const palette = paletteFor(color);
  const clear = (field: keyof Errors) => errors[field] && setErrors((prev) => ({ ...prev, [field]: undefined }));

  function save() {
    if (isPending) return;
    const found: Errors = {};
    const cleanName = name.trim();
    if (!cleanName) found.name = t("Write the name of the skill.");
    else if (skills.some((skill) => skill.id !== editing?.id && skill.name.trim().toLowerCase() === cleanName.toLowerCase())) found.name = t("You already have a skill with this name.");
    const cleanLink = normalizeLink(link);
    if (cleanLink === null) found.link = t("Write a full link, like https://udemy.com");
    const parsedTotal = parseCount(total, unit);
    if ("problem" in parsedTotal) {
      found.total =
        parsedTotal.problem === "empty"
          ? t("Write how many {unit} in total.", { unit: t(unitInfo.many) })
          : parsedTotal.problem === "whole"
            ? t("Use a whole number, like 40.")
            : parsedTotal.problem === "big"
              ? t("That looks too big. Use 5000 or less.")
              : t("Write a number bigger than 0.");
    }
    const parsedBase = parseCount(base, unit, { allowZero: true });
    if ("problem" in parsedBase) found.base = parsedBase.problem === "whole" ? t("Use a whole number.") : t("Write a number, like 5.");
    else if ("value" in parsedTotal && parsedBase.value > parsedTotal.value) found.base = t("Can not be more than the total ({total}).", { total: total.trim() });
    if (target && target < minTarget) found.target = started ? t("Pick a date after the start ({date}).", { date: longDay(started, fmt) }) : t("Pick today or a later date.");
    setErrors(found);
    if (Object.keys(found).length || "problem" in parsedTotal || "problem" in parsedBase || cleanLink === null) {
      if (found.name) nameRef.current?.focus();
      return;
    }
    const details = { name: cleanName, category, source: where.trim(), link: cleanLink, target: parsedTotal.value, base: parsedBase.value, targetDate: target || null, color, why: why.trim() };
    startTransition(async () => {
      const result = editing
        ? await updateSkillAction(editing.id, { ...details, ...(unit !== editing.unit ? { unit } : {}), ...(state !== stateOf(editing) ? stateInput(state) : {}) })
        : await createSkillAction({ ...details, unit, ...stateInput(state) });
      if (!result.success || !result.data) {
        toast.error(actionError(result.message, "Failed to save skill", t, fmt));
        return;
      }
      const saved = result.data;
      if (!editing && reminders?.available) {
        const done = await reminders.saveDraft("SKILL", saved.id, reminder);
        if (!done.success) toast.error(t("Saved, but not its reminder. Open it again to set the reminder."));
      }
      onClose();
      router.refresh();
      if (editing) toast.success(`${saved.name} · ${t("Changes saved")}`);
      else toast.success(`${saved.name} · ${t("Skill added")}`, { action: { label: t("Open"), onClick: () => router.push(skillHref(saved.id)) } });
      onSaved?.(saved, !editing);
    });
  }

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={620}
      className="w-165 rounded-[16px] leading-[normal]" subClassName="leading-[normal]"
      headClassName="items-center gap-3 px-5.5 py-3.5"
      lead={
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[11px] text-white" style={{ background: `linear-gradient(140deg, ${palette.from} 0%, ${palette.to} 100%)` }}>
          <CategoryIcon category={category} className="size-5" />
        </span>
      }
      title={t(editing ? "Edit skill" : "Add a skill")}
      sub={<span className="text-[13px]">{t("Fields with * are required")}</span>}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        nameRef.current?.focus();
      }}
      bodyClassName="gap-3 px-5.5 pt-3.5 pb-4"
      footerClassName="px-5.5 py-3"
      footer={
        <>
          {Object.values(errors).some(Boolean) && <span className="text-[13px] font-semibold text-expense">{t("Please fix the marked fields.")}</span>}
          <span className="flex-1" />
          <button type="button" onClick={onClose} disabled={isPending} className={LB_OUTLINE}>
            {t("Cancel")}
          </button>
          <button type="button" onClick={save} disabled={isPending} className={LB_PRIMARY}>
            {isPending && <Loader />}
            {t(editing ? "Save changes" : "Add skill")}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sf-name" className={LB_LABEL}>
          {t("Skill name")} <span className="text-expense">*</span>
        </label>
        <input
          ref={nameRef}
          id="sf-name"
          value={name}
          maxLength={60}
          onChange={(event) => {
            setName(event.target.value);
            clear("name");
          }}
          placeholder={t("For example: React, Spoken English, Tajweed")}
          aria-invalid={!!errors.name || undefined}
          className={LB_FIELD}
        />
        {errors.name && <span className={LB_ERROR}>{errors.name}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <span id="sf-cat" className={LB_LABEL}>
          {t("Category")}
        </span>
        <div role="radiogroup" aria-labelledby="sf-cat" className="grid grid-cols-3 gap-2 max-sm:grid-cols-2">
          {SKILL_CATEGORIES.map((option) => {
            const on = option.id === category;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setCategory(option.id);
                  if (!colorSet) setColor(option.color);
                }}
                className={cn("flex h-9.5 min-w-0 items-center gap-2 rounded-[10px] border-[1.5px] pr-2.5 pl-1.5 text-[13px] font-semibold", on ? cn(option.ring, option.tile, option.ink) : "border-line bg-surface text-ink-2 hover:bg-hover")}
              >
                <span className={cn("flex size-6.5 shrink-0 items-center justify-center rounded-[7px]", on ? "bg-surface" : option.tile)}>
                  <CategoryIcon category={option.id} className={cn("size-3.5", option.ink)} strokeWidth={2.2} />
                </span>
                <span className="truncate">{t(option.label)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="sf-where" className={LB_LABEL}>
            {t("Where you learn")} <span className="font-normal text-ink-muted">{t("(optional)")}</span>
          </label>
          <input id="sf-where" value={where} maxLength={60} onChange={(event) => setWhere(event.target.value)} placeholder={t("Udemy, YouTube, a teacher...")} className={LB_FIELD} />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="sf-link" className={LB_LABEL}>
            {t("Link")} <span className="font-normal text-ink-muted">{t("(optional)")}</span>
          </label>
          <input
            id="sf-link"
            type="url"
            value={link}
            maxLength={300}
            onChange={(event) => {
              setLink(event.target.value);
              clear("link");
            }}
            placeholder="https://"
            aria-invalid={!!errors.link || undefined}
            className={LB_FIELD}
          />
          {errors.link && <span className={LB_ERROR}>{errors.link}</span>}
        </div>
      </div>

      <div className="grid grid-cols-[1.25fr_1fr_1fr] items-start gap-3.5 max-sm:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span id="sf-unit" className={LB_LABEL}>
            {t("Count by")}
          </span>
          <div role="radiogroup" aria-labelledby="sf-unit" className="box-border grid h-10.5 grid-cols-3 rounded-[10px] bg-surface-sunken p-0.75">
            {UNIT_ORDER.map((option) => {
              const on = option === unit;
              const off = unitLocked && !on;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={off}
                  onClick={() => {
                    setUnit(option);
                    setErrors((prev) => ({ ...prev, total: undefined, base: undefined }));
                  }}
                  className={cn("rounded-[8px] px-1 text-[13px] font-semibold whitespace-nowrap disabled:cursor-not-allowed", on ? "bg-surface text-emerald shadow-[0_1px_3px_rgba(15,23,42,0.12)]" : off ? "text-input" : "text-ink-soft hover:text-ink")}
                >
                  {t(UNITS[option].label)}
                </button>
              );
            })}
          </div>
          {unitLocked && <span className="text-[12px] leading-[1.45] text-ink-muted">{t("Locked: practice is already logged in {unit}.", { unit: t(unitInfo.many) })}</span>}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="sf-total" className={cn(LB_LABEL, "truncate")}>
            {t("Total {unit}", { unit: t(unitInfo.many) })} <span className="text-expense">*</span>
          </label>
          <input
            id="sf-total"
            inputMode="decimal"
            value={total}
            onChange={(event) => {
              setTotal(event.target.value.slice(0, 8));
              clear("total");
            }}
            placeholder={unit === "HOURS" ? t("e.g. 30") : t("e.g. 40")}
            aria-invalid={!!errors.total || undefined}
            className={LB_FIELD}
          />
          {errors.total && <span className={LB_ERROR}>{errors.total}</span>}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="sf-base" title={t("Already done ({unit})", { unit: t(unitInfo.many) })} className={cn(LB_LABEL, "truncate")}>
            {t("Already done ({unit})", { unit: t(unitInfo.many) })}
          </label>
          <input
            id="sf-base"
            inputMode="decimal"
            value={base}
            onChange={(event) => {
              setBase(event.target.value.slice(0, 8));
              clear("base");
            }}
            placeholder="0"
            aria-invalid={!!errors.base || undefined}
            className={LB_FIELD}
          />
          {errors.base ? <span className={LB_ERROR}>{errors.base}</span> : <span className="text-[12px] text-ink-muted">{t("Done before you started tracking here")}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span id="sf-state" className={LB_LABEL}>
          {t("Status")}
        </span>
        <div role="radiogroup" aria-labelledby="sf-state" className="grid grid-cols-4 gap-2 max-sm:grid-cols-2">
          {STATES.map((option) => {
            const on = option === state;
            const info = STATE_INFO[option];
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setState(option)}
                className={cn("flex h-10 min-w-0 items-center justify-center gap-1.75 rounded-[10px] border-[1.5px] text-[13px] font-semibold whitespace-nowrap", on ? info.chip : "border-line bg-surface text-ink-2 hover:bg-hover")}
                style={on ? { borderColor: "currentColor" } : undefined}
              >
                <span aria-hidden="true" className={cn("size-1.75 shrink-0 rounded-full", info.dot)} />
                {t(info.label)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 items-start gap-3.5 max-sm:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="flex items-center gap-1 text-[13.5px] font-semibold text-ink">
            <label htmlFor="sf-target">{t("Target date")}</label>
            {target ? (
              <button type="button" onClick={() => setTarget("")} className="ml-auto text-[12.5px] font-semibold text-emerald hover:underline">
                {t("Clear")}
              </button>
            ) : (
              <span className="font-normal text-ink-muted">{t("(optional)")}</span>
            )}
          </span>
          <DayField
            id="sf-target"
            value={target}
            min={minTarget}
            invalid={!!errors.target}
            label={target ? longDay(target, fmt) : t("No target date")}
            className={target ? "font-semibold" : "text-ink-faint"}
            before={<CalendarIcon />}
            after={<span className="text-[12px] font-normal text-ink-muted">{t(target ? "Change" : "Pick")}</span>}
            onChange={(value) => {
              setTarget(value);
              clear("target");
            }}
          />
          {errors.target && <span className={LB_ERROR}>{errors.target}</span>}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span id="sf-color" className={LB_LABEL}>
            {t("Colour")}
          </span>
          <div role="radiogroup" aria-labelledby="sf-color" className="flex h-10.5 flex-wrap items-center gap-2">
            {SKILL_PICKER.map((option, i) => {
              const on = option.key === color;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={t("Colour {count}", { count: String(i + 1) })}
                  title={t(option.label)}
                  onClick={() => {
                    setColor(option.key);
                    setColorSet(true);
                  }}
                  className="flex size-7 items-center justify-center rounded-full"
                  style={{ background: option.from, boxShadow: on ? `0 0 0 2px var(--surface), 0 0 0 4px ${option.from}` : "inset 0 0 0 1px rgba(0,0,0,0.08)" }}
                >
                  {on && <Check className="size-3.5 text-white" strokeWidth={3.5} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="sf-why" className={LB_LABEL}>
          {t("Why I want this")} <span className="font-normal text-ink-muted">{t("(optional)")}</span>
        </label>
        <textarea id="sf-why" rows={2} maxLength={200} value={why} onChange={(event) => setWhy(event.target.value)} placeholder={t("A line to keep you going, e.g. Take freelance work")} className={cn(LB_AREA, "resize-none leading-[1.55]")} />
      </div>

      {reminders && <ReminderSection kind="SKILL" targetKey={editing?.id ?? null} book={reminders} draft={reminder} onDraftChange={setReminder} description={t("A nudge to sit down and practise.")} />}
    </PopupDialog>
  );
}
