"use client";

// ReminderEditor -- the one place a habit-area reminder is set.
//
// USAGE (for wiring it into the habit screens):
//
//   Two variants, picked by `kind`:
//   * HABIT / CHALLENGE / BOOK / SKILL: an on/off switch; when on, 1-6 times
//     ("HH:MM", Dhaka) and weekday chips (none picked = every day).
//   * NAMAZ / RAMADAN: one compact row per prayer / "sehri" / "iftar": a
//     switch, the name, and a "minutes before" select (At the time, 5, 10,
//     15, 30, 60). Render five (or two) rows in a card, with
//     showPushHint={false} on each and one <ReminderPushHint /> under them.
//
//   It is controlled: `value` is a ReminderDraft, `onChange` gets the next one.
//   Two ways to save it:
//
//   1. Saves as it changes (an existing habit's drawer, the Namaz card):
//        const r = useSavedReminder({ kind: "HABIT", targetKey: habit.id, reminder });
//        <ReminderEditor kind="HABIT" value={r.draft} onChange={r.setDraft} />
//      `reminder` is the saved Reminder for (kind, targetKey) or null -- find
//      it in getReminders() (lib/customer/reminders.ts, server) or
//      getRemindersAction() (client): reminders.find((x) => x.kind === kind && x.targetKey === key).
//      Changes are saved 0.5 s after the last one (and on unmount); a failed
//      save shows a toast and puts the last saved state back.
//
//   2. Saved with a form (a habit being created has no id yet):
//        const [draft, setDraft] = useState(() => draftFromReminder("HABIT", reminder));
//        <ReminderEditor kind="HABIT" value={draft} onChange={setDraft} />
//        // after the habit is saved:
//        const result = await saveReminderDraft("HABIT", habit.id, draft, reminder);
//      saveReminderDraft returns null when there was nothing to save (off and
//      never saved), else the action's { success, message?, data? }.
//
//   To-dos keep their reminder on the task: <RemindBeforeSelect value={remindBefore}
//   onChange={setRemindBefore} /> beside the due time, sent as `remindBefore`.
//
//   Deleting a habit/challenge/book/skill deletes its reminder on the server.

import { Plus, X } from "lucide-react";
import { useId, useRef } from "react";
import WeekdayPicker from "@/components/smartly/WeekdayPicker";
import InputFrame from "@/components/smartly/form/InputFrame";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { Switch } from "@/components/ui/switch";
import type { SavedReminderKind } from "@/lib/customer/api";
import { timeLabel } from "@/lib/customer/date";
import { isOffsetKind, MAX_REMINDER_TIMES, MINUTES_BEFORE_CHOICES, minutesBeforeLabel, nextReminderTime, normalizeWeekdays, type ReminderDraft } from "@/lib/customer/reminderDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ReminderPushHint } from "./ReminderPushHint";

export interface ReminderEditorProps {
  kind: SavedReminderKind;
  value: ReminderDraft;
  onChange: (next: ReminderDraft) => void;
  // The switch's words, already translated. Defaults: "Remind me" for the
  // timed variant; required in practice for a NAMAZ/RAMADAN row ("Fajr").
  label?: React.ReactNode;
  // A line under the label, already translated.
  description?: React.ReactNode;
  // The time a new reminder's first row starts at ("HH:MM"), e.g. a to-do's
  // or a habit's usual time. Used when adding a time to an empty list.
  defaultTime?: string;
  disabled?: boolean;
  // The "turn on notifications on this device" note while the reminder is
  // on. Default: on for the timed variant, off for NAMAZ/RAMADAN rows.
  showPushHint?: boolean;
  className?: string;
}

export function ReminderEditor(props: ReminderEditorProps) {
  return isOffsetKind(props.kind) ? <OffsetReminderRow {...props} /> : <TimedReminderEditor {...props} />;
}

// One time, as TimeInput shows it ("7:00 am", in the reader's digits), with
// the browser's own picker behind it. Removing is a separate button, so a
// reminder can't be left without a time.
function ReminderTimeField({ id, value, onChange, disabled }: { id: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const { t, locale } = useLocale();
  const picker = useRef<HTMLInputElement>(null);
  function open() {
    if (disabled) return;
    try {
      picker.current?.showPicker();
    } catch {
      picker.current?.focus();
    }
  }
  return (
    <InputFrame size="md" onClick={open} className={cn("relative w-32 cursor-pointer px-3", disabled && "cursor-default opacity-60")}>
      <span className="min-w-0 flex-1 truncate tabular-nums">{timeLabel(value, t, locale)}</span>
      <input
        ref={picker}
        id={id}
        type="time"
        value={value}
        disabled={disabled}
        aria-label={t("Reminder time")}
        // A cleared picker keeps the time it had.
        onChange={(event) => event.target.value && onChange(event.target.value)}
        className="sr-only"
      />
    </InputFrame>
  );
}

function TimedReminderEditor({ value, onChange, label, description, defaultTime, disabled = false, showPushHint = true, className }: ReminderEditorProps) {
  const { t, locale } = useLocale();
  const id = useId();
  const everyDay = normalizeWeekdays(value.weekdays).length === 0;
  const canAdd = value.times.length < MAX_REMINDER_TIMES && nextReminderTime(value.times, defaultTime) !== null;

  const setTime = (index: number, time: string) => onChange({ ...value, times: value.times.map((each, i) => (i === index ? time : each)) });
  const removeTime = (index: number) => onChange({ ...value, times: value.times.filter((_, i) => i !== index) });
  function addTime() {
    const next = nextReminderTime(value.times, defaultTime);
    if (next) onChange({ ...value, times: [...value.times, next] });
  }
  function toggle(on: boolean) {
    // Turned on with no time yet: start from the default one.
    const times = on && value.times.length === 0 ? [nextReminderTime([], defaultTime) ?? "08:00"] : value.times;
    onChange({ ...value, enabled: on, times });
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between gap-4">
        <span className="flex min-w-0 flex-col gap-0.5">
          <label htmlFor={`${id}-switch`} className="text-body font-semibold text-ink">
            {label ?? t("Remind me")}
          </label>
          {description && <span className="text-small text-ink-muted">{description}</span>}
        </span>
        <Switch id={`${id}-switch`} checked={value.enabled} disabled={disabled} onCheckedChange={toggle} className="mt-0.5" />
      </div>

      {value.enabled && (
        <>
          <div role="group" aria-label={t("Reminder times")} className="flex flex-wrap items-center gap-2">
            {value.times.map((time, index) => (
              <span key={index} className="flex items-center gap-1">
                <ReminderTimeField id={`${id}-time-${index}`} value={time} onChange={(next) => setTime(index, next)} disabled={disabled} />
                {value.times.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTime(index)}
                    disabled={disabled}
                    aria-label={t("Remove {time}", { time: timeLabel(time, t, locale) })}
                    className="flex size-9 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-50 pointer-coarse:size-11"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
              </span>
            ))}
            {canAdd && (
              <button
                type="button"
                onClick={addTime}
                disabled={disabled}
                className="flex h-11 items-center gap-1.5 rounded-sm px-3 text-small font-semibold text-emerald hover:bg-mint-50 disabled:opacity-50"
              >
                <Plus className="size-4" aria-hidden="true" />
                {t("Add a time")}
              </button>
            )}
          </div>
          {!canAdd && value.times.length >= MAX_REMINDER_TIMES && (
            <span className="text-caption text-ink-muted">{t("Up to {count} times a day.", { count: formatCount(MAX_REMINDER_TIMES, locale) })}</span>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-small font-semibold text-ink-2">{t("On these days")}</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={everyDay}
                disabled={disabled}
                onClick={() => onChange({ ...value, weekdays: [] })}
                className={cn(
                  "flex h-8 items-center rounded-sm px-3 text-small font-semibold transition-colors disabled:opacity-50",
                  everyDay ? "bg-emerald text-white" : "border border-line bg-surface text-ink-2 hover:border-line-strong",
                )}
              >
                {t("Every day")}
              </button>
              <WeekdayPicker value={everyDay ? [] : value.weekdays} onChange={(days) => onChange({ ...value, weekdays: normalizeWeekdays(days) })} className={cn("flex-wrap", disabled && "pointer-events-none opacity-50")} />
            </div>
          </div>

          {showPushHint && <ReminderPushHint />}
        </>
      )}
    </div>
  );
}

// A prayer's (or Sehri's, or Iftar's) row: switch, name, how early.
function OffsetReminderRow({ value, onChange, label, description, disabled = false, showPushHint = false, className }: ReminderEditorProps) {
  const { t, locale } = useLocale();
  const id = useId();
  // A value saved from elsewhere that isn't a choice here still shows.
  const choices: number[] = (MINUTES_BEFORE_CHOICES as readonly number[]).includes(value.minutesBefore) ? [...MINUTES_BEFORE_CHOICES] : [...MINUTES_BEFORE_CHOICES, value.minutesBefore].sort((a, b) => a - b);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Switch id={`${id}-switch`} checked={value.enabled} disabled={disabled} onCheckedChange={(on) => onChange({ ...value, enabled: on })} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <label htmlFor={`${id}-switch`} className="text-body font-semibold text-ink">
            {label ?? t("Remind me")}
          </label>
          {description && <span className="text-small text-ink-muted">{description}</span>}
        </span>
        <NativeSelect
          size="sm"
          aria-label={t("When to remind")}
          value={String(value.minutesBefore)}
          disabled={disabled || !value.enabled}
          onChange={(event) => onChange({ ...value, minutesBefore: Number(event.target.value) })}
          frameClassName="w-36 shrink-0"
        >
          {choices.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutesBeforeLabel(minutes, t, locale)}
            </option>
          ))}
        </NativeSelect>
      </div>
      {showPushHint && value.enabled && <ReminderPushHint />}
    </div>
  );
}
