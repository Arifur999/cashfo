"use client";

import { ArrowRight, ChevronLeft, ChevronRight, Pencil, Trophy, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Skill, SkillNote, SkillResource, SkillResourceKind } from "@/lib/customer/api";
import { actionError } from "@/lib/customer/habitDisplay";
import { longDay } from "@/lib/customer/libraryBoard";
import { addSkillNoteAction, addSkillResourceAction, updateSkillNoteAction, updateSkillResourceAction } from "@/lib/customer/skillActions";
import { normalizeLink, RESOURCE_KINDS } from "@/lib/customer/skillsBoard";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "../Books/BookNoteDialog";
import { DayField, LB_AREA, LB_BTN, LB_ERROR, LB_FIELD, LB_LABEL, LB_OUTLINE, LB_PRIMARY } from "../Books/LibraryBits";
import { RESOURCE_ICON, skillColors } from "./SkillBits";

const TEXT_MAX = 3000;

// The skill page's note: the day, a title and the words.
export function SkillNoteFormDialog({ open, onClose, skill, editing, today, onSaved }: { open: boolean; onClose: () => void; skill: Skill; editing: SkillNote | null; today: string; onSaved: (note: SkillNote, created: boolean) => void }) {
  const { t, fmt } = useLocale();
  const [date, setDate] = useState(today);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<{ date?: string; title?: string; text?: string }>({});
  const [isPending, startTransition] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);
  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "new") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    setDate(editing?.date ?? today);
    setTitle(editing?.title ?? "");
    setText(editing?.text ?? "");
    setErrors({});
  }
  const { color, dark, soft } = skillColors(skill);

  function save() {
    if (isPending) return;
    const found: typeof errors = {};
    if (!date) found.date = t("Pick a date.");
    else if (date > today) found.date = t("The date can not be in the future.");
    if (!title.trim()) found.title = t("Write a title.");
    if (!text.trim()) found.text = t("Write the note.");
    setErrors(found);
    if (Object.keys(found).length) return;
    startTransition(async () => {
      const input = { date, title: title.trim(), text: text.trim() };
      const result = editing ? await updateSkillNoteAction(skill.id, editing.id, input) : await addSkillNoteAction(skill.id, input);
      if (!result.success || !result.data) return void toast.error(actionError(result.message, "Failed to save the note", t, fmt));
      onClose();
      onSaved(result.data, !editing);
    });
  }

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={620}
      className="w-150 rounded-[18px] leading-[normal]" subClassName="leading-[normal]"
      headClassName="items-center gap-3.5 px-5.5 py-4"
      headStyle={{ background: `linear-gradient(180deg, ${soft} 0%, var(--surface) 100%)` }}
      titleClassName="text-[18px] font-bold"
      lead={
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[12px] text-white" style={{ background: `linear-gradient(145deg, ${color} 0%, ${dark} 100%)` }}>
          <Pencil className="size-4.75" />
        </span>
      }
      title={t(editing ? "Edit note" : "New note")}
      sub={<span className="block truncate text-[13px]">{skill.name}</span>}
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
          <button type="button" onClick={save} disabled={isPending} className={cn(LB_PRIMARY, "min-w-30")}>
            {isPending && <Loader />}
            {t("Save")}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sn-date" className={LB_LABEL}>
          {t("Date")}
        </label>
        <DayField
          id="sn-date"
          value={date}
          max={today}
          invalid={!!errors.date}
          label={longDay(date, fmt)}
          className="font-semibold"
          before={
            <>
              <CalendarIcon className="text-emerald" />
              {date === today && <span className="rounded-full bg-success-soft px-2 py-0.5 text-[12px] font-bold text-tint-green-ink">{t("Today")}</span>}
            </>
          }
          after={<span className="text-[12px] font-semibold text-emerald">{t("Change")}</span>}
          onChange={(value) => {
            setDate(value);
            setErrors((prev) => ({ ...prev, date: undefined }));
          }}
        />
        {errors.date && <span className={LB_ERROR}>{errors.date}</span>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sn-title" className={LB_LABEL}>
          {t("Title")} <span className="text-expense">*</span>
        </label>
        <input
          ref={titleRef}
          id="sn-title"
          maxLength={80}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          placeholder={t("e.g. Custom hooks")}
          aria-invalid={!!errors.title || undefined}
          className={cn(LB_FIELD, "font-semibold")}
        />
        {errors.title && <span className={LB_ERROR}>{errors.title}</span>}
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="flex justify-between">
          <label htmlFor="sn-text" className={LB_LABEL}>
            {t("Note")} <span className="text-expense">*</span>
          </label>
          <span className="text-[12px] text-ink-faint tabular-nums">
            {formatCount(text.length, fmt)} / {formatCount(TEXT_MAX, fmt)}
          </span>
        </span>
        <textarea
          id="sn-text"
          rows={8}
          maxLength={TEXT_MAX}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setErrors((prev) => ({ ...prev, text: undefined }));
          }}
          placeholder={t("What did you learn? Write it in your own words.")}
          aria-invalid={!!errors.text || undefined}
          className={LB_AREA}
        />
        {errors.text && <span className={LB_ERROR}>{errors.text}</span>}
      </div>
    </PopupDialog>
  );
}

// One note read on its own, with the ones before and after it.
export function SkillNoteViewDialog({ open, onClose, skill, notes, noteId, onMove, onEdit, onDelete }: { open: boolean; onClose: () => void; skill: Skill; notes: SkillNote[]; noteId: string | null; onMove: (id: string) => void; onEdit: (note: SkillNote) => void; onDelete: (note: SkillNote) => void }) {
  const { t, fmt } = useLocale();
  const index = notes.findIndex((note) => note.id === noteId);
  const note = index >= 0 ? notes[index] : null;
  const { color, dark } = skillColors(skill);
  if (!note) return null;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton={false} className="flex max-h-[calc(100dvh-48px)] w-170 max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-[18px] border-0 bg-surface p-0 text-ink shadow-overlay ring-0 sm:max-w-[calc(100vw-32px)]">
        <div className="flex shrink-0 items-start gap-3 border-t-5 border-b border-b-line px-6 pt-5 pb-4" style={{ borderTopColor: color }}>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="flex min-w-0 items-center gap-2 text-[13px] text-ink-muted">
              <span className="truncate font-semibold" style={{ color: dark }}>
                {skill.name}
              </span>
              <span>·</span>
              <span className="whitespace-nowrap">{longDay(note.date, fmt)}</span>
            </span>
            <DialogTitle className="text-[23px] leading-[1.3] font-bold text-ink">{note.title}</DialogTitle>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-[8px] text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </div>
        <DialogDescription asChild>
          <div className="min-h-30 flex-1 overflow-y-auto px-6 py-5">
            <p className="text-[16.5px] leading-[1.85] whitespace-pre-wrap text-ink">{note.text}</p>
          </div>
        </DialogDescription>
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line bg-strip px-5.5 py-3">
          <button type="button" onClick={() => notes[index - 1] && onMove(notes[index - 1].id)} disabled={index === 0} className={cn(LB_OUTLINE, "h-9")}>
            <ChevronLeft className="size-3.75" strokeWidth={2.25} aria-hidden="true" />
            {t("Previous")}
          </button>
          <span className="min-w-11 text-center text-[13px] text-ink-muted tabular-nums">
            {formatCount(index + 1, fmt)} / {formatCount(notes.length, fmt)}
          </span>
          <button type="button" onClick={() => notes[index + 1] && onMove(notes[index + 1].id)} disabled={index === notes.length - 1} className={cn(LB_OUTLINE, "h-9")}>
            {t("Next")}
            <ChevronRight className="size-3.75" strokeWidth={2.25} aria-hidden="true" />
          </button>
          <span className="flex-1" />
          <button type="button" onClick={() => onEdit(note)} className={cn(LB_OUTLINE, "h-9")}>
            {t("Edit")}
          </button>
          <button type="button" onClick={() => onDelete(note)} className={cn(LB_OUTLINE, "h-9 border-expense-line text-expense hover:bg-expense-soft")}>
            {t("Delete")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// A course, video, book or link the skill is learned from.
export function SkillResourceDialog({ open, onClose, skill, editing, onSaved }: { open: boolean; onClose: () => void; skill: Skill; editing: SkillResource | null; onSaved: (resource: SkillResource, created: boolean) => void }) {
  const { t, fmt } = useLocale();
  const [kind, setKind] = useState<SkillResourceKind>("COURSE");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [errors, setErrors] = useState<{ title?: string; url?: string }>({});
  const [isPending, startTransition] = useTransition();
  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "new") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    setKind(editing?.kind ?? "COURSE");
    setTitle(editing?.title ?? "");
    setUrl(editing?.url ?? "");
    setErrors({});
  }

  function save() {
    if (isPending) return;
    const found: typeof errors = {};
    if (!title.trim()) found.title = t("Write a title.");
    const link = normalizeLink(url);
    if (link === null) found.url = t("This link does not look right. Example: https://react.dev");
    setErrors(found);
    if (Object.keys(found).length || link === null) return;
    startTransition(async () => {
      const input = { kind, title: title.trim(), url: link };
      const result = editing ? await updateSkillResourceAction(skill.id, editing.id, input) : await addSkillResourceAction(skill.id, input);
      if (!result.success || !result.data) return void toast.error(actionError(result.message, "Failed to save the resource", t, fmt));
      onClose();
      onSaved(result.data, !editing);
    });
  }

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={500}
      className="rounded-[18px] leading-[normal]" subClassName="leading-[normal]"
      headClassName="items-center px-5.5 py-4"
      titleClassName="text-[18px] font-bold"
      title={t(editing ? "Edit resource" : "Add resource")}
      sub={<span className="block truncate text-[13px]">{skill.name}</span>}
      bodyClassName="gap-3.5 px-5.5 py-4.5"
      footerClassName="px-5.5"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={isPending} className={cn(LB_OUTLINE, "mr-auto")}>
            {t("Cancel")}
          </button>
          <button type="button" onClick={save} disabled={isPending} className={cn(LB_PRIMARY, "min-w-30")}>
            {isPending && <Loader />}
            {t("Save")}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <span id="sr-kind" className={LB_LABEL}>
          {t("Type")}
        </span>
        <div role="radiogroup" aria-labelledby="sr-kind" className="grid grid-cols-4 gap-2">
          {RESOURCE_KINDS.map((option) => {
            const on = option.id === kind;
            const Icon = RESOURCE_ICON[option.id];
            return (
              <button key={option.id} type="button" role="radio" aria-checked={on} onClick={() => setKind(option.id)} className={cn("flex h-16 flex-col items-center justify-center gap-1.5 rounded-[12px] border-[1.5px] text-[13px] font-semibold", on ? "border-primary bg-emerald-soft text-emerald" : "border-line bg-surface text-ink-2 hover:bg-hover")}>
                <Icon className="size-4.75" aria-hidden="true" />
                {t(option.label)}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sr-title" className={LB_LABEL}>
          {t("Title")} <span className="text-expense">*</span>
        </label>
        <input
          id="sr-title"
          maxLength={120}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          placeholder={t("e.g. React: The Complete Guide")}
          aria-invalid={!!errors.title || undefined}
          className={LB_FIELD}
        />
        {errors.title && <span className={LB_ERROR}>{errors.title}</span>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sr-url" className={LB_LABEL}>
          {t("Link")} <span className="font-normal text-ink-muted">{t("(optional)")}</span>
        </label>
        <input
          id="sr-url"
          maxLength={300}
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setErrors((prev) => ({ ...prev, url: undefined }));
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              save();
            }
          }}
          placeholder="https://"
          aria-invalid={!!errors.url || undefined}
          className={LB_FIELD}
        />
        {errors.url && <span className={LB_ERROR}>{errors.url}</span>}
      </div>
    </PopupDialog>
  );
}

// SkillCongrats: a skill completed, its sessions, the days it took and its total.
export function SkillCongratsDialog({ open, onClose, skill, stats, onNext }: { open: boolean; onClose: () => void; skill: Skill; stats: { value: string; label: string }[]; onNext: () => void }) {
  const { t } = useLocale();
  const { color, dark, soft } = skillColors(skill);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton={false} className="w-120 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 text-center text-ink shadow-overlay ring-0 sm:max-w-[calc(100vw-32px)]">
        <div className="relative px-7 pt-7.5 pb-5.5" style={{ background: `radial-gradient(120% 90% at 50% 0%, ${soft} 0%, var(--surface) 70%)` }}>
          <span aria-hidden="true" className="absolute top-8.5 left-11 size-2.5 rotate-20 rounded-[3px] opacity-50" style={{ background: color }} />
          <span aria-hidden="true" className="absolute top-6.5 right-14 size-2 rounded-full bg-warning-fill opacity-70" />
          <span aria-hidden="true" className="absolute top-24 left-23 size-1.5 rounded-full bg-success opacity-60" />
          <span aria-hidden="true" className="absolute top-23 right-22 h-1 w-3 -rotate-30 rounded-[2px] opacity-45" style={{ background: color }} />
          <span aria-hidden="true" className="mx-auto mb-3.5 flex size-19 items-center justify-center rounded-full text-white" style={{ background: `linear-gradient(145deg, ${color} 0%, ${dark} 100%)`, boxShadow: `0 12px 28px ${color}55` }}>
            <Trophy className="size-9" strokeWidth={1.9} />
          </span>
          <span className="block text-[13px] font-bold tracking-[0.04em]" style={{ color: dark }}>
            {t("CONGRATULATIONS")}
          </span>
          <DialogTitle className="mt-1.5 mb-1.5 text-[24px] leading-[1.3] font-bold">{t("You completed {name}!", { name: skill.name })}</DialogTitle>
          <DialogDescription className="text-[14px] leading-[1.6] text-ink-soft">{t("Every session counted. Keep the habit going with something new.")}</DialogDescription>
        </div>
        <div className="mx-6 grid grid-cols-3 rounded-[14px] border border-line">
          {stats.map((stat, i) => (
            <div key={stat.label} className={cn("flex flex-col gap-0.75 px-2 py-3", i > 0 && "border-l border-line")}>
              <span className="text-[20px] font-bold tabular-nums">{stat.value}</span>
              <span className="text-[12px] text-ink-muted">{stat.label}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 px-6 pt-5 pb-5.5">
          <button type="button" onClick={onNext} className={cn(LB_PRIMARY, "h-11")}>
            {t("Start the next skill")}
            <ArrowRight className="size-4" strokeWidth={2.25} aria-hidden="true" />
          </button>
          <button type="button" onClick={onClose} className={cn(LB_BTN, "text-ink-soft hover:bg-hover")}>
            {t("Close")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
