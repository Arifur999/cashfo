"use client";

import { Archive, Check, Eye, Minus, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import ChoiceCard, { ChoiceCardGroup } from "@/components/smartly/ChoiceCard";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import WeekdayPicker from "@/components/smartly/WeekdayPicker";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Habit, HabitFrequency } from "@/lib/customer/api";
import { budgetCategoryHex, budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { actionError, latinDigits, ruleLabel, unitKey, unitLabel, WEEKDAY_LONG } from "@/lib/customer/habitDisplay";
import { createHabitAction, deleteHabitAction, updateHabitAction } from "@/lib/customer/habitsActions";
import { formatCount } from "@/lib/i18n/digits";
import { weekStartOf } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { draftFromReminder, type ReminderBook, ReminderSection } from "../Reminders";
import { CloseButton, PanelFooter } from "../Tracker/PanelParts";
import { HABIT_COLORS, HABIT_ICONS, HABIT_UNITS, type HabitColorKey, type HabitIconKey } from "./habitVisuals";

interface HabitDrawerProps {
  open: boolean;
  onClose: () => void;
  editing: Habit | null;
  // The page's saved reminders; without them the drawer has no reminder.
  reminders?: ReminderBook;
}

const OFTEN: { value: HabitFrequency; title: string; sub: string }[] = [
  { value: "DAILY", title: "Every day", sub: "Planned for all seven days" },
  { value: "WEEKLY_DAYS", title: "On certain days", sub: "Pick the days, like Sunday to Thursday" },
  { value: "WEEKLY_COUNT", title: "A few times a week", sub: "Any days you like. The week starts on {day}." },
];

// A new or edited habit in the design's drawer: its name, icon and colour,
// how often, and whether an amount is counted each time. Archive keeps it
// (and its history) to bring back later; Delete asks first.
export function HabitDrawer({ open, onClose, editing, reminders }: HabitDrawerProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const oftenId = useId();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<HabitIconKey>("droplet");
  const [color, setColor] = useState<HabitColorKey>("blue");
  const [frequency, setFrequency] = useState<HabitFrequency>("DAILY");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [count, setCount] = useState(3);
  const [counted, setCounted] = useState(false);
  const [target, setTarget] = useState("");
  // The unit as shown in the field, in the reader's language; saved as its
  // chip's key when it is one (unitKey).
  const [unit, setUnit] = useState("minutes");
  // A new habit's reminder, saved once the habit is (an edited one's saves itself).
  const [reminder, setReminder] = useState(() => draftFromReminder("HABIT", null));
  const [deleting, setDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setName(editing?.name ?? "");
      setIcon((editing?.icon as HabitIconKey) ?? "droplet");
      setColor((editing?.color as HabitColorKey) ?? "blue");
      setFrequency(editing?.frequencyType ?? "DAILY");
      setDays(editing?.weeklyDays?.length ? editing.weeklyDays : [0, 1, 2, 3, 4]);
      setCount(editing?.weeklyCount ?? 3);
      setCounted(!!editing?.targetValue);
      setTarget(editing?.targetValue ? String(editing.targetValue) : "");
      setUnit(unitLabel(editing?.unit ?? "minutes", t));
      setReminder(draftFromReminder("HABIT", null));
      setDeleting(false);
    }
  }

  const targetValue = Number(target) || 0;
  const noDays = frequency === "WEEKLY_DAYS" && days.length === 0;
  const noGoal = counted && targetValue <= 0;
  const valid = name.trim().length > 0 && !noDays && !noGoal;
  const savedUnit = unitKey(unit, t);
  const preview = ruleLabel({ frequencyType: frequency, weeklyDays: days, weeklyCount: count, targetValue: counted ? targetValue : null, unit: counted ? savedUnit : null }, t, fmt);
  const tone = categoryTone(color);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const input = {
        name: name.trim(),
        icon,
        color,
        frequencyType: frequency,
        weeklyDays: frequency === "WEEKLY_DAYS" ? [...days].sort((a, b) => a - b) : [],
        weeklyCount: frequency === "WEEKLY_COUNT" ? count : undefined,
        targetValue: counted ? targetValue : null,
        unit: counted ? savedUnit || null : null,
      };
      const result = editing ? await updateHabitAction(editing.id, input) : await createHabitAction(input);
      if (result.success) {
        toast.success(editing ? t("Habit updated") : t("Habit added"));
        // A new habit's reminder needs its id, so it is saved now.
        if (!editing && result.data && reminders?.available) {
          const saved = await reminders.saveDraft("HABIT", result.data.id, reminder);
          if (!saved.success) toast.error(t("Saved, but not its reminder. Open it again to set the reminder."));
        }
        onClose();
        router.refresh();
      } else {
        toast.error(actionError(result.message, editing ? "Failed to update the habit" : "Failed to add the habit", t, fmt));
      }
    });
  }

  // Archiving always keeps the habit and its days, to bring back later.
  function archive() {
    if (!editing || isPending) return;
    startTransition(async () => {
      const result = await updateHabitAction(editing.id, { isArchived: true });
      if (result.success) {
        toast.success(t("Habit archived"));
        onClose();
        router.refresh();
      } else {
        toast.error(actionError(result.message, "Failed to archive the habit", t, fmt));
      }
    });
  }

  // Deleting removes a habit that was never ticked; one with history is
  // archived instead, so its days stay (the server decides).
  function remove() {
    if (!editing || isPending) return;
    startTransition(async () => {
      const result = await deleteHabitAction(editing.id);
      if (result.success) {
        toast.success(result.data?.action === "deleted" ? t("Habit removed") : t("It has days ticked, so it was archived instead"));
        setDeleting(false);
        onClose();
        router.refresh();
      } else {
        toast.error(actionError(result.message, "Failed to remove habit", t, fmt));
      }
    });
  }

  const label = (text: string) => <span className="text-body font-medium text-ink">{text}</span>;
  const chip = "h-6.5 rounded-full border px-2.5 text-caption font-semibold transition-colors pointer-coarse:h-11";

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-120 shadow-drawer data-[side=right]:sm:max-w-120" : "rounded-t-xl data-[side=bottom]:max-h-[92dvh]")}>
        <SheetHeader className={cn("flex-row items-start justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-4.5" : "px-4 pt-4 pb-2")}>
          <div className="flex flex-col gap-0.5">
            <SheetTitle className="text-h3 text-ink">{editing ? t("Edit habit") : t("New habit")}</SheetTitle>
            <span className="text-small leading-[normal] text-ink-muted">{t("It shows up in your daily list on the days you plan.")}</span>
          </div>
          <CloseButton onClick={onClose} label={t("Close")} />
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4.5 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <Field htmlFor="hb-name" label={label(t("Name"))}>
              <Input id="hb-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={80} placeholder={t("Morning walk")} />
            </Field>

            {/* Stacked on a phone, side by side from sm up; the icons wrap to fit. */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
              <fieldset className="flex min-w-0 flex-col gap-2">
                <legend className="mb-2 text-body leading-[normal] font-medium text-ink">{t("Icon")}</legend>
                <div role="radiogroup" aria-label={t("Icon")} className="grid grid-cols-[repeat(auto-fill,36px)] gap-2">
                  {HABIT_ICONS.map((option) => {
                    const on = option.key === icon;
                    return (
                      <button key={option.key} type="button" role="radio" aria-checked={on} aria-label={t(option.label)} onClick={() => setIcon(option.key)} className={cn("flex size-9 items-center justify-center rounded-[9px] border transition-colors [&_svg]:size-4.5", on ? cn("border-2", tone.bg, tone.fg) : "border-line bg-surface text-ink-soft hover:border-line-strong")} style={on ? { borderColor: budgetCategoryHex(color) } : undefined}>
                        {createElement(budgetCategoryIcon(option.key), { "aria-hidden": true })}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-body leading-[normal] font-medium text-ink">{t("Colour")}</legend>
                <div role="radiogroup" aria-label={t("Colour")} className="grid grid-cols-[repeat(8,28px)] gap-x-2.5 gap-y-2 sm:grid-cols-[repeat(4,28px)]">
                  {HABIT_COLORS.map((option) => {
                    const on = option.key === color;
                    return <button key={option.key} type="button" role="radio" aria-checked={on} aria-label={t(option.label)} onClick={() => setColor(option.key)} className="relative size-7 rounded-full transition-shadow after:absolute after:-inset-1.5" style={{ background: budgetCategoryHex(option.key), ...(on && { boxShadow: `0 0 0 2px var(--surface), 0 0 0 4px ${budgetCategoryHex(option.key)}` }) }} />;
                  })}
                </div>
              </fieldset>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend id={oftenId} className="mb-2 text-body leading-[normal] font-medium text-ink">
                {t("How often")}
              </legend>
              {/* One tab stop; the arrow keys move the choice, as native radios do. */}
              <ChoiceCardGroup aria-labelledby={oftenId}>
                {OFTEN.map((option) => (
                  <ChoiceCard key={option.value} checked={frequency === option.value} onSelect={() => setFrequency(option.value)} title={t(option.title)} sub={t(option.sub, { day: t(WEEKDAY_LONG[weekStartOf(fmt)]) })}>
                    {option.value === "WEEKLY_DAYS" && (
                      <span className="flex flex-col gap-2 pl-8">
                        <WeekdayPicker value={days} onChange={setDays} />
                        {noDays && <span className="text-caption text-expense">{t("Pick at least one day.")}</span>}
                      </span>
                    )}
                    {option.value === "WEEKLY_COUNT" && (
                      <span className="flex flex-wrap items-center gap-2.5 pl-7">
                        <span className="flex h-9 items-center overflow-hidden rounded-sm border border-input bg-surface pointer-coarse:h-11">
                          <button type="button" aria-label={t("One less")} onClick={() => setCount(Math.max(1, count - 1))} className="flex h-full w-8.5 items-center justify-center text-ink-soft hover:bg-surface-sunken pointer-coarse:w-11">
                            <Minus className="size-4" aria-hidden="true" />
                          </button>
                          <span className="w-9 border-x border-line text-center text-[15px] leading-8.5 font-bold text-ink tabular-nums">{formatCount(count, fmt)}</span>
                          <button type="button" aria-label={t("One more")} onClick={() => setCount(Math.min(7, count + 1))} className="flex h-full w-8.5 items-center justify-center text-ink-soft hover:bg-surface-sunken pointer-coarse:w-11">
                            <Plus className="size-4" aria-hidden="true" />
                          </button>
                        </span>
                        <span className="text-[13.5px] leading-[normal] text-ink-2">{t("times a week, on any days")}</span>
                      </span>
                    )}
                  </ChoiceCard>
                ))}
              </ChoiceCardGroup>
            </fieldset>

            <div className="flex flex-col gap-2.5 rounded-field border border-line bg-strip p-3.5">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="hb-counted" className="flex cursor-pointer flex-col gap-px">
                  <span id="hb-counted-title" className="text-body font-semibold text-ink">
                    {t("Count an amount")}
                  </span>
                  <span id="hb-counted-sub" className="text-[12.5px] leading-[normal] text-ink-muted">
                    {t("Like 8 glasses or 30 minutes. Leave off for a simple tick.")}
                  </span>
                </label>
                <Switch id="hb-counted" checked={counted} onCheckedChange={setCounted} aria-labelledby="hb-counted-title" aria-describedby="hb-counted-sub" />
              </div>
              {counted && (
                <>
                  <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2.5">
                    <Field htmlFor="hb-target" label={<span className="text-[12.5px] font-medium text-ink-soft">{t("Goal each time")}</span>} error={noGoal && target !== "" ? t("Enter a goal of 1 or more.") : undefined}>
                      <Input id="hb-target" size="sm" inputMode="numeric" value={target} onChange={(event) => setTarget(latinDigits(event.target.value).replace(/\D/g, "").slice(0, 6))} invalid={noGoal && target !== ""} placeholder="30" />
                    </Field>
                    <Field htmlFor="hb-unit" label={<span className="text-[12.5px] font-medium text-ink-soft">{t("Unit")}</span>}>
                      <Input id="hb-unit" size="sm" value={unit} onChange={(event) => setUnit(event.target.value)} maxLength={20} placeholder={t("minutes")} />
                    </Field>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {HABIT_UNITS.map((option) => (
                      <button key={option} type="button" aria-pressed={savedUnit === option} onClick={() => setUnit(t(option))} className={cn(chip, savedUnit === option ? "border-emerald bg-mint-50 text-brand-ink" : "border-line bg-surface text-ink-soft hover:border-line-strong")}>
                        {t(option)}
                      </button>
                    ))}
                  </div>
                  {noGoal && target === "" && <span className="text-caption text-ink-muted">{t("Enter a goal to save the habit.")}</span>}
                </>
              )}
            </div>

            {reminders && <ReminderSection kind="HABIT" targetKey={editing?.id ?? null} book={reminders} draft={reminder} onDraftChange={setReminder} description={t("Skipped on a day it's already done.")} />}

            <span className="flex items-start gap-2 text-small text-ink-soft">
              <Eye className="mt-px size-3.75 shrink-0 text-ink-muted" aria-hidden="true" />
              <span>
                {t("Shows as")}{" "}
                <b className="font-semibold text-ink">{[name.trim() || t("Habit"), preview.days, preview.amount ? t("{amount} each time", { amount: preview.amount }) : null].filter(Boolean).join(" · ")}</b>
              </span>
            </span>
          </div>

          <PanelFooter
            drawer
            aside={
              editing &&
              !editing.isArchived && (
                <>
                  <Button type="button" variant="ghost" onClick={archive} disabled={isPending}>
                    <Archive />
                    {t("Archive")}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setDeleting(true)} disabled={isPending} className="text-expense hover:bg-expense-soft hover:text-expense">
                    <Trash2 />
                    {t("Delete")}
                  </Button>
                </>
              )
            }
          >
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!valid || isPending} className="px-5">
              {isPending ? <Loader /> : editing ? <Check /> : null}
              {editing ? t("Save changes") : t("Add habit")}
            </Button>
          </PanelFooter>
        </form>
      </SheetContent>
      {editing && (
        <ConfirmDialog
          open={deleting}
          onClose={() => !isPending && setDeleting(false)}
          onConfirm={remove}
          isPending={isPending}
          title={t("Delete {name}?", { name: editing.name })}
          description={t("A habit you never ticked is deleted for good. One with days ticked is archived instead, so its history stays.")}
          confirmLabel={t("Delete habit")}
        />
      )}
    </Sheet>
  );
}
