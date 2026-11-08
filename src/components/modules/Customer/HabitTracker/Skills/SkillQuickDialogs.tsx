"use client";

import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import type { Skill } from "@/lib/customer/api";
import { actionError } from "@/lib/customer/habitDisplay";
import { longDay } from "@/lib/customer/libraryBoard";
import { addSkillNoteAction, removeSkillNoteAction, updateSkillAction } from "@/lib/customer/skillActions";
import { daysAt, daysBetween, UNITS } from "@/lib/customer/skillsBoard";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "../Books/BookNoteDialog";
import { DayField, LB_AREA, LB_ERROR, LB_FIELD, LB_LABEL, LB_OUTLINE, LB_PRIMARY } from "../Books/LibraryBits";
import { SkillBadge, skillColors } from "./SkillBits";

const TEXT_MAX = 3000;
const shiftDay = (day: string, by: number) => new Date(Date.parse(`${day}T00:00:00.000Z`) + by * 86_400_000).toISOString().slice(0, 10);

// SkillQuickNote: a note while learning, from a card on Learning now.
export function QuickNoteDialog({ open, onClose, skill, today }: { open: boolean; onClose: () => void; skill: Skill | null; today: string }) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);
  const [prevKey, setPrevKey] = useState("closed");
  const key = open && skill ? skill.id : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    setTitle("");
    setText("");
    setError("");
  }
  if (!skill) return null;
  const { soft } = skillColors(skill);

  function save() {
    if (isPending || !skill) return;
    if (!text.trim()) return setError(t("Write the note first."));
    const target = skill;
    startTransition(async () => {
      const result = await addSkillNoteAction(target.id, { title: title.trim(), text: text.trim() });
      if (!result.success || !result.data) return void setError(actionError(result.message, "Failed to save the note", t, fmt));
      const noteId = result.data.id;
      onClose();
      router.refresh();
      toast.success(t("Note saved"), {
        action: {
          label: t("Undo"),
          onClick: async () => {
            await removeSkillNoteAction(target.id, noteId);
            router.refresh();
          },
        },
      });
    });
  }

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={560}
      className="rounded-[16px]"
      headClassName="items-center gap-3.5 px-5.5 py-4"
      headStyle={{ background: `linear-gradient(180deg, ${soft} 0%, var(--surface) 100%)` }}
      titleClassName="text-[18px] font-bold"
      lead={<SkillBadge skill={skill} className="size-10.5" rounded="rounded-[12px]" iconClassName="size-5" />}
      title={t("New note")}
      sub={
        <span className="block truncate text-[13px]">
          {skill.name} · {longDay(today, fmt)}
        </span>
      }
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        titleRef.current?.focus();
      }}
      bodyClassName="gap-3.5 px-5.5 py-4.5"
      footerClassName="px-5.5"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={isPending} className={cn(LB_OUTLINE, "mr-auto")}>
            {t("Cancel")}
          </button>
          <button type="button" onClick={save} disabled={isPending} className={cn(LB_PRIMARY, "min-w-32.5")}>
            {isPending && <Loader />}
            {t("Save note")}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="qn-title" className={LB_LABEL}>
          {t("Title")} <span className="font-normal text-ink-faint">{t("(optional)")}</span>
        </label>
        <input ref={titleRef} id="qn-title" maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("e.g. How routing works")} className={LB_FIELD} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="flex justify-between gap-2">
          <label htmlFor="qn-text" className={LB_LABEL}>
            {t("Note")} <span className="text-expense">*</span>
          </label>
          <span className="text-[12px] text-ink-faint tabular-nums">
            {formatCount(text.length, fmt)} / {formatCount(TEXT_MAX, fmt)}
          </span>
        </span>
        <textarea
          id="qn-text"
          rows={7}
          maxLength={TEXT_MAX}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError("");
          }}
          placeholder={t("Write what you learned in your own words, a tip to remember or a question to look up later.")}
          aria-invalid={!!error || undefined}
          className={LB_AREA}
        />
        {error && (
          <span role="alert" className={LB_ERROR}>
            {error}
          </span>
        )}
      </div>
      <span className="flex items-start gap-2 text-[12.5px] leading-normal text-ink-muted">
        <Info className="mt-0.5 size-3.75 shrink-0" aria-hidden="true" />
        <span>{t("All notes for this skill are on its Details page.")}</span>
      </span>
    </PopupDialog>
  );
}

// "Target date" on a Learning now card: the day to be done by, what a day
// must hold to make it, and whether the pace does.
export function TargetDialog({ open, onClose, skill, left, pace, today }: { open: boolean; onClose: () => void; skill: Skill | null; left: number; pace: number; today: string }) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [day, setDay] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [prevKey, setPrevKey] = useState("closed");
  const key = open && skill ? skill.id : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    setDay(skill?.targetDate ?? "");
    setError("");
  }
  if (!skill) return null;
  const hours = skill.unit === "HOURS";
  const need = daysAt(left, pace);

  let info: { text: string; warn: boolean } | null = null;
  if (day && day > today && left > 0) {
    const days = daysBetween(today, day);
    const per = left / days;
    const perText = hours ? t("{count} minutes", { count: formatCount(Math.ceil(per), fmt) }) : `${toLocaleDigits(String(Math.round(per * 10) / 10), fmt)} ${t(UNITS[skill.unit].many)}`;
    let text = t("You need about {amount} a day to finish by then.", { amount: perText });
    let warn = false;
    if (need) {
      const dayWord = t(need === 1 ? "{count} day" : "{count} days", { count: formatCount(need, fmt) });
      if (need <= days) text += ` ${t("At your pace you will make it in about {days}.", { days: dayWord })}`;
      else {
        text += ` ${t("At your pace it takes about {days}, so practise a bit more.", { days: dayWord })}`;
        warn = true;
      }
    }
    info = { text, warn };
  }

  function apply(next: string | null, message: string) {
    if (!skill) return;
    const target = skill;
    const before = skill.targetDate ?? null;
    startTransition(async () => {
      const result = await updateSkillAction(target.id, { targetDate: next });
      if (!result.success) return void setError(actionError(result.message, "Failed to save skill", t, fmt));
      onClose();
      router.refresh();
      toast.success(message, {
        action: {
          label: t("Undo"),
          onClick: async () => {
            await updateSkillAction(target.id, { targetDate: before });
            router.refresh();
          },
        },
      });
    });
  }

  function save() {
    if (!day) return setError(t("Pick a date."));
    if (day <= today) return setError(t("Pick a date after today."));
    apply(day, t("Target set: {date}", { date: longDay(day, fmt) }));
  }

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={440}
      className="rounded-[16px]"
      headClassName="items-center gap-3 px-5.5 py-4"
      titleClassName="text-[17px] font-bold"
      lead={<SkillBadge skill={skill} className="size-9" rounded="rounded-[10px]" iconClassName="size-4.5" />}
      title={t("Target date")}
      sub={<span className="block truncate text-[13px]">{skill.name}</span>}
      bodyClassName="gap-3 px-5.5 py-4.5"
      footerClassName="px-5.5"
      footer={
        <>
          {skill.targetDate && (
            <button type="button" onClick={() => apply(null, t("Target removed"))} disabled={isPending} className={cn(LB_OUTLINE, "mr-auto border-expense-line text-expense hover:bg-expense-soft")}>
              {t("Remove target")}
            </button>
          )}
          <button type="button" onClick={onClose} disabled={isPending} className={LB_OUTLINE}>
            {t("Cancel")}
          </button>
          <button type="button" onClick={save} disabled={isPending} className={LB_PRIMARY}>
            {isPending && <Loader />}
            {t("Save")}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tg-date" className={LB_LABEL}>
          {t("Finish this skill by")}
        </label>
        <DayField
          id="tg-date"
          value={day}
          min={shiftDay(today, 1)}
          invalid={!!error}
          label={day ? longDay(day, fmt) : t("Pick a date")}
          className={day ? "font-semibold" : "text-ink-faint"}
          after={<CalendarIcon />}
          onChange={(value) => {
            setDay(value);
            setError("");
          }}
        />
        {error && (
          <span role="alert" className={LB_ERROR}>
            {error}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {(
          [
            [30, "In 1 month"],
            [90, "In 3 months"],
            [180, "In 6 months"],
          ] as const
        ).map(([days, label]) => (
          <button
            key={days}
            type="button"
            onClick={() => {
              setDay(shiftDay(today, days));
              setError("");
            }}
            className="h-7.5 rounded-full border border-emerald-line bg-emerald-soft px-3 text-[12.5px] font-semibold text-emerald hover:border-emerald"
          >
            {t(label)}
          </button>
        ))}
      </div>
      {info && !error && <div className={cn("rounded-[10px] px-3 py-2.5 text-[13px] leading-normal", info.warn ? "bg-warning-50 text-warning-ink" : "bg-note-green text-success-ink")}>{info.text}</div>}
    </PopupDialog>
  );
}
