"use client";

import { ArrowRight, Info, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import type { PracticeEntry, Skill } from "@/lib/customer/api";
import { actionError } from "@/lib/customer/habitDisplay";
import { loadSkillDetailAction, logPracticeAction, removePracticeAction, updateSkillAction } from "@/lib/customer/skillActions";
import { amountOf, daysAt, parseWhole, shownCount, totalText, UNITS } from "@/lib/customer/skillsBoard";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { longDay } from "@/lib/customer/libraryBoard";
import { CalendarIcon } from "../Books/BookNoteDialog";
import { DayField, LB_AREA, LB_ERROR, LB_LABEL, LB_OUTLINE, LB_PRIMARY } from "../Books/LibraryBits";
import { SkillBadge, skillColors } from "./SkillBits";

const NOTE_MAX = 500;

interface PracticeDialogProps {
  open: boolean;
  onClose: () => void;
  skill: Skill | null;
  // Every day logged (with notes), when the page has them; null loads them.
  entries: PracticeEntry[] | null;
  // The pace a day over the last 14 days, in the stored unit.
  pace: number;
  today: string;
  // The day to open on (a day picked in a calendar or a row), today by default.
  day?: string;
  // Opened from a row: that day only.
  lockDay?: boolean;
  // Learning now offers "Remove entry" on a day already logged.
  removable?: boolean;
  // After a save that completed the skill.
  onCompleted?: (skill: Skill) => void;
}

// SkillPractice: one day's practice of a skill -- how much and what was
// learned -- with the total it makes and the pace it keeps. One entry a day:
// a day already logged opens filled in for editing.
export function PracticeDialog({ open, onClose, skill, entries: given, pace, today, day: startDay, lockDay = false, removable = false, onCompleted }: PracticeDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [loaded, setLoaded] = useState<PracticeEntry[] | null>(null);
  const entries = given ?? loaded;
  const [day, setDay] = useState(today);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [finish, setFinish] = useState(true);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const amountRef = useRef<HTMLInputElement>(null);
  const count = (n: number) => formatCount(n, fmt);

  const fill = (list: PracticeEntry[] | null, value: string) => {
    const entry = list?.find((e) => e.date === value);
    setAmount(entry ? String(entry.amount) : "");
    setNote(entry?.note ?? "");
  };

  const [prevKey, setPrevKey] = useState("closed");
  const key = open && skill ? `${skill.id}:${startDay ?? today}` : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open && skill) {
      setDay(startDay ?? today);
      fill(given, startDay ?? today);
      setFinish(true);
      setError("");
      if (!given) setLoaded(null);
    }
  }

  // Learning now has the days but not their notes: read them once on opening.
  useEffect(() => {
    if (!open || !skill || given) return;
    let live = true;
    void loadSkillDetailAction(skill.id).then((result) => {
      if (!live) return;
      const list = result.data?.logs ?? [];
      setLoaded(list);
      const entry = list.find((e) => e.date === (startDay ?? today));
      if (entry) {
        setAmount(String(entry.amount));
        setNote(entry.note);
      }
    });
    return () => {
      live = false;
    };
  }, [open, skill, given, startDay, today]);

  if (!skill) return null;
  const unit = UNITS[skill.unit];
  const hours = skill.unit === "HOURS";
  const { color, dark, soft } = skillColors(skill);
  const existing = entries?.find((e) => e.date === day) ?? null;
  const logged = (entries ?? []).reduce((sum, e) => sum + e.amount, 0);
  // Done before this day's entry: what came before tracking, and every other day.
  const raw = entries ? (skill.base ?? 0) + logged : skill.progress;
  const prior = Math.min(skill.target, Math.max(0, raw - (existing?.amount ?? 0)));
  const priorLeft = Math.max(0, skill.target - prior);
  const started = skill.startedAt ? skill.startedAt.slice(0, 10) : "";
  const minDay = started && started <= today ? started : "";
  const isToday = day === today;

  const dayError = !day ? t("Pick a date.") : day > today ? t("The date cannot be in the future.") : minDay && day < minDay ? t("You started this skill on {date}. Pick that day or later.", { date: longDay(minDay, fmt) }) : "";
  const value = parseWhole(amount);
  const amountError = (() => {
    if (dayError) return dayError;
    if (!amount.trim()) return hours ? t("Write how many minutes you practised.") : t("Write how many {unit} you did.", { unit: t(unit.many) });
    if (value === null) return hours ? t("Use whole minutes, like 30.") : t("Use a whole number, like 1.");
    if (hours && value > 1440) return t("A day has only 1440 minutes.");
    if (!hours && value > priorLeft)
      return priorLeft
        ? t("Only {count} {unit} are left in this skill. If the course grew, change the total on the Details page.", { count: count(priorLeft), unit: t(unit.many) })
        : t("All {unit} are already done. Mark the skill completed instead.", { unit: t(unit.many) });
    return "";
  })();
  const valid = !amountError && value !== null;
  const after = valid ? prior + value : prior;
  const left = Math.max(0, skill.target - after);
  const atEnd = valid && after >= skill.target;
  const pct = skill.target ? Math.min(100, Math.round((after / skill.target) * 100)) : 0;
  const days = valid ? daysAt(left, pace + (day >= today ? value / 14 : 0)) : 0;
  const shown = (n: number) => toLocaleDigits(String(shownCount(skill.unit, n)), fmt);

  function save() {
    if (isPending || !skill) return;
    if (amountError || value === null) return setError(amountError);
    const target = skill;
    const before = existing;
    const willFinish = atEnd && finish;
    startTransition(async () => {
      const result = await logPracticeAction(target.id, day, { amount: value, note: note.trim(), finish: willFinish });
      if (!result.success || !result.data) {
        setError(actionError(result.message, "Failed to save the practice", t, fmt));
        return;
      }
      const completed = result.data.skill.status === "COMPLETED" && target.status !== "COMPLETED";
      onClose();
      router.refresh();
      const text = completed ? t("Saved · {amount}. {name} completed!", { amount: amountOf(target.unit, value, t, fmt), name: target.name }) : t("Saved · {amount}", { amount: amountOf(target.unit, value, t, fmt) });
      toast.success(text, {
        action: {
          label: t("Undo"),
          onClick: async () => {
            const back = before ? await logPracticeAction(target.id, before.date, { amount: before.amount, note: before.note, finish: false }) : await removePracticeAction(target.id, day);
            if (completed) await updateSkillAction(target.id, { status: "LEARNING", paused: false });
            if (!back.success) toast.error(actionError(back.message, "Failed to save the practice", t, fmt));
            router.refresh();
          },
        },
      });
      if (completed) onCompleted?.(result.data.skill);
    });
  }

  function remove() {
    if (!existing || !skill || isPending) return;
    const target = skill;
    const entry = existing;
    startTransition(async () => {
      const result = await removePracticeAction(target.id, entry.date);
      if (!result.success) return void setError(actionError(result.message, "Failed to remove the practice", t, fmt));
      onClose();
      router.refresh();
      toast(t("Practice on {date} removed", { date: longDay(entry.date, fmt) }), {
        action: {
          label: t("Undo"),
          onClick: async () => {
            await logPracticeAction(target.id, entry.date, { amount: entry.amount, note: entry.note, finish: false });
            router.refresh();
          },
        },
      });
    });
  }

  const heading = existing ? t("Edit practice") : isToday ? t("Today’s practice") : t("Log practice");
  const unitWord = hours ? t("min") : t(unit.many);

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={560}
      className="rounded-[18px]"
      headClassName="items-center gap-3.5 px-5.5 py-4.5"
      headStyle={{ background: `linear-gradient(180deg, ${soft} 0%, var(--surface) 100%)` }}
      titleClassName="text-[19px] font-bold"
      lead={<SkillBadge skill={skill} className="size-11.5" iconClassName="size-5.5" />}
      title={heading}
      sub={<span className="block truncate text-[13px]">{skill.name}</span>}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        amountRef.current?.focus();
        amountRef.current?.select();
      }}
      bodyClassName="gap-4 px-5.5 py-4.5"
      footerClassName="px-5.5"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={isPending} className={cn(LB_OUTLINE, "mr-auto")}>
            {t("Cancel")}
          </button>
          {removable && existing && (
            <button type="button" onClick={remove} disabled={isPending} className={cn(LB_OUTLINE, "border-expense-line text-expense hover:bg-expense-soft")}>
              {t("Remove entry")}
            </button>
          )}
          <button type="button" onClick={save} disabled={isPending || !entries} className={cn(LB_PRIMARY, "min-w-37.5")}>
            {(isPending || !entries) && <Loader />}
            {valid ? t("Save · {amount}", { amount: amountOf(skill.unit, value, t, fmt) }) : t("Save")}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pr-date" className={LB_LABEL}>
          {t("Date")}
        </label>
        {lockDay ? (
          <span className="flex h-10.5 items-center gap-2.5 rounded-[8px] border border-input bg-page px-3 font-semibold">
            <CalendarIcon className="text-emerald" />
            {isToday && <span className="rounded-full bg-success-soft px-2 py-0.5 text-[12px] font-bold text-tint-green-ink">{t("Today")}</span>}
            <span className="flex-1">{longDay(day, fmt)}</span>
            <span className="inline-flex items-center gap-1 text-[12px] font-normal text-ink-muted">
              <Lock className="size-3" strokeWidth={2.25} aria-hidden="true" />
              {t("Date is fixed")}
            </span>
          </span>
        ) : (
          <DayField
            id="pr-date"
            value={day}
            min={minDay}
            max={today}
            invalid={!!dayError}
            label={longDay(day, fmt)}
            className="font-semibold"
            before={
              <>
                <CalendarIcon className="text-emerald" />
                {isToday && <span className="rounded-full bg-success-soft px-2 py-0.5 text-[12px] font-bold text-tint-green-ink">{t("Today")}</span>}
              </>
            }
            after={
              <>
                {existing && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11.5px] font-bold text-warning">{t("Already logged")}</span>}
                <span className="text-[12px] font-semibold text-ink-muted">{t("Change")}</span>
              </>
            }
            onChange={(next) => {
              setDay(next);
              fill(entries, next);
              setError("");
            }}
          />
        )}
        {dayError && <span className={LB_ERROR}>{dayError}</span>}
        {existing && !lockDay && (
          <span className="flex items-center gap-1.5 text-[12.5px] text-tint-blue-ink">
            <Info className="size-3.5" aria-hidden="true" />
            {t("You already logged this day, so you are editing it.")}
          </span>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-stretch gap-2.5">
        <div className="flex min-w-0 flex-col gap-1 rounded-[12px] border border-line bg-page p-3.5">
          <span className="flex items-center gap-1.5 text-[12.5px] text-ink-muted">
            <Lock className="size-3" strokeWidth={2.25} aria-hidden="true" />
            {t("So far")}
          </span>
          <span className="truncate text-[26px] font-bold text-ink-2 tabular-nums">{hours ? amountOf("HOURS", prior, t, fmt) : count(prior)}</span>
          <span className="text-[11.5px] text-ink-faint">{t("of {total}", { total: totalText(skill, t, fmt) })}</span>
        </div>
        <span aria-hidden="true" className="flex items-center justify-center text-ink-faint">
          <ArrowRight className="size-5" strokeWidth={2.25} />
        </span>
        <label className={cn("flex min-w-0 cursor-text flex-col gap-1 rounded-[12px] border-[1.5px] p-3.5", error && !dayError && "border-expense")} style={{ background: soft, ...(error && !dayError ? {} : { borderColor: color }) }}>
          <span className="text-[12.5px] font-semibold" style={{ color: dark }}>
            {isToday ? t("Today I did") : t("On this day I did")}
          </span>
          <span className="flex items-baseline gap-1.5">
            <input
              ref={amountRef}
              inputMode="numeric"
              autoComplete="off"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value.slice(0, 6));
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  save();
                }
              }}
              placeholder={hours ? "30" : "1"}
              aria-label={isToday ? t("Today I did") : t("On this day I did")}
              className="w-full min-w-0 border-0 bg-transparent text-[26px] font-bold text-ink tabular-nums outline-none placeholder:text-ink-faint"
            />
            <span className="shrink-0 text-[13px] text-ink-muted">{unitWord}</span>
          </span>
          <span className="text-[11.5px] text-ink-muted">{hours ? t("Write the minutes you practised") : t("Write how many {unit} you finished", { unit: t(unit.many) })}</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-ink-muted">{t("Quick add:")}</span>
        {unit.quick.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => {
              setAmount(String((parseWhole(amount) ?? 0) + step));
              setError("");
            }}
            className="h-8 rounded-full border border-emerald-line bg-emerald-soft px-3 text-[13px] font-bold text-emerald hover:border-emerald"
          >
            +{hours ? amountOf("HOURS", step, t, fmt) : count(step)}
          </button>
        ))}
        {amount && (
          <button type="button" onClick={() => setAmount("")} className="h-8 rounded-full px-2.5 text-[12.5px] font-semibold text-ink-muted hover:text-ink">
            {t("Clear")}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="flex justify-between gap-2">
          <label htmlFor="pr-note" className={LB_LABEL}>
            {t("What did you learn?")} <span className="font-normal text-ink-faint">{t("(optional)")}</span>
          </label>
          <span className="text-[12px] text-ink-faint tabular-nums">
            {count(note.length)} / {count(NOTE_MAX)}
          </span>
        </span>
        <textarea id="pr-note" rows={3} maxLength={NOTE_MAX} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("e.g. Learned how to add pages with React Router")} className={LB_AREA} />
      </div>

      {error && error !== dayError && (
        <div role="alert" className="rounded-[10px] bg-expense-soft px-3 py-2.5 text-[13px] font-semibold text-expense">
          {error}
        </div>
      )}

      {valid && value !== null && (
        <div className="flex flex-col gap-2.5 rounded-[12px] border border-success-line/60 bg-note-green px-4 py-3.5">
          <div className="flex items-baseline justify-between gap-2.5">
            <span className="text-[15px] font-bold text-success-ink">{isToday ? t("Today: +{amount}", { amount: amountOf(skill.unit, value, t, fmt) }) : t("{date}: +{amount}", { date: longDay(day, fmt), amount: amountOf(skill.unit, value, t, fmt) })}</span>
            <span className="text-[13px] font-semibold whitespace-nowrap text-tint-green-ink tabular-nums">{t("New total {done} / {total} · {pct}%", { done: shown(after), total: totalText(skill, t, fmt), pct: count(pct) })}</span>
          </div>
          <div className="relative h-2.5 overflow-hidden rounded-full bg-success-soft">
            <span className="absolute inset-y-0 left-0 opacity-55" style={{ width: `${Math.min(100, (prior / skill.target) * 100)}%`, background: color }} />
            <span className="absolute inset-y-0 bg-success" style={{ left: `${Math.min(100, (prior / skill.target) * 100)}%`, width: `${Math.max(0, Math.min(100, (after / skill.target) * 100) - Math.min(100, (prior / skill.target) * 100))}%` }} />
          </div>
          <span className="text-[12.5px] text-success-ink">
            {left <= 0
              ? t("That finishes the whole skill!")
              : days
                ? t(days === 1 ? "{left} left · at this pace about {count} day" : "{left} left · at this pace about {count} days", { left: hours ? amountOf("HOURS", left, t, fmt) : amountOf(skill.unit, left, t, fmt), count: count(days) })
                : t("{left} left", { left: amountOf(skill.unit, left, t, fmt) })}
          </span>
          {atEnd && (
            <label className="flex cursor-pointer items-center gap-2 text-[13.5px] font-semibold text-success-ink">
              <input type="checkbox" checked={finish} onChange={(event) => setFinish(event.target.checked)} className="size-4 accent-success" />
              {t("Mark this skill as completed")}
            </label>
          )}
        </div>
      )}
    </PopupDialog>
  );
}
