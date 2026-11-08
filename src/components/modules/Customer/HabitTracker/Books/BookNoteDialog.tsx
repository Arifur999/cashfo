"use client";

import { Check, Highlighter, Info, Lightbulb, Plus, Underline } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import type { BookNote, BookNoteKind } from "@/lib/customer/api";
import { addBookNoteAction, updateBookNoteAction } from "@/lib/customer/bookActions";
import { actionError } from "@/lib/customer/habitDisplay";
import { longDay, NOTE_KIND_ORDER, NOTE_KINDS, noteDay, noteKind, noteProblem, parsePage } from "@/lib/customer/libraryBoard";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { DayField, LB_AREA, LB_ERROR, LB_FIELD, LB_LABEL, LB_OUTLINE, LB_PRIMARY, Spine } from "./LibraryBits";

const KIND_ICON = { HIGHLIGHT: Highlighter, UNDERLINE: Underline, THOUGHT: Lightbulb } as const;
// The head fades from the kind's tint (literal classes, so Tailwind sees them).
const HEAD_FROM: Record<BookNoteKind, string> = { HIGHLIGHT: "from-tint-yellow/50", UNDERLINE: "from-tint-blue/50", THOUGHT: "from-tint-violet/50" };
const PANEL: Record<BookNoteKind, string> = { HIGHLIGHT: "bg-tint-yellow/50", UNDERLINE: "bg-tint-blue/50", THOUGHT: "bg-tint-violet/50" };
const LINE_EDGE: Record<BookNoteKind, string> = { HIGHLIGHT: "border-l-tint-yellow-ink", UNDERLINE: "border-l-tint-blue-ink", THOUGHT: "border-l-tint-violet-ink" };
const RING: Record<BookNoteKind, string> = { HIGHLIGHT: "border-tint-yellow-ink shadow-[0_4px_14px_rgba(161,98,7,0.13)]", UNDERLINE: "border-tint-blue-ink shadow-[0_4px_14px_rgba(29,78,216,0.13)]", THOUGHT: "border-tint-violet-ink shadow-[0_4px_14px_rgba(109,40,217,0.13)]" };

const LINE_MAX = 600;
const TEXT_MAX = 3000;

interface BookNoteDialogProps {
  open: boolean;
  onClose: () => void;
  book: { id: string; title: string; color: string; totalPages: number };
  // The note being edited; null writes a new one.
  editing: BookNote | null;
  // A new note's page to start with (the page the reader is on).
  startPage?: number;
  today: string;
  // After a save (the note as saved); the dialog has closed unless `again`.
  onSaved?: (note: BookNote, again: boolean) => void;
}

interface Errors {
  page?: string;
  date?: string;
  text?: string;
}

// The LibraryHome / LibraryBook boards' note form: the day and the page, what
// kind of note it is, then the line from the book and the reader's words.
export function BookNoteDialog({ open, onClose, book, editing, startPage, today, onSaved }: BookNoteDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [page, setPage] = useState("");
  const [date, setDate] = useState(today);
  const [kind, setKind] = useState<BookNoteKind>("HIGHLIGHT");
  const [line, setLine] = useState("");
  const [text, setText] = useState("");
  const [lineOpen, setLineOpen] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [saved, setSaved] = useState("");
  const [isPending, startTransition] = useTransition();
  const pageRef = useRef<HTMLInputElement>(null);

  // Fill the form each time the dialog opens.
  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? `new-${startPage ?? ""}`) : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setPage(editing ? (editing.page === null ? "" : String(editing.page)) : startPage ? String(startPage) : "");
      setDate(editing ? noteDay(editing) : today);
      setKind(editing ? noteKind(editing) : "HIGHLIGHT");
      setLine(editing?.line ?? "");
      setText(editing?.text ?? "");
      setLineOpen(false);
      setErrors({});
      setSaved("");
    }
  }

  const info = NOTE_KINDS[kind];
  const showLine = kind !== "THOUGHT" || lineOpen || line.trim() !== "";

  function save(again: boolean) {
    if (isPending) return;
    const found: Errors = {};
    const parsed = parsePage(page);
    if ("problem" in parsed) found.page = parsed.problem === "empty" ? t("Write the page number.") : t("Use a whole number, like 42.");
    else if (parsed.page > book.totalPages) found.page = t("This book has {count} pages.", { count: formatCount(book.totalPages, fmt) });
    if (!date) found.date = t("Pick a date.");
    else if (date > today) found.date = t("The date cannot be in the future.");
    const problem = noteProblem(kind, line, text);
    if (problem) found.text = problem === "thought" ? t("Write your thought.") : t("Write the line from the book or a few words of your own.");
    setErrors(found);
    if (Object.keys(found).length || "problem" in parsed) {
      setSaved("");
      return;
    }
    const input = { page: parsed.page, date, kind, line: line.trim(), text: text.trim() };
    startTransition(async () => {
      const result = editing ? await updateBookNoteAction(book.id, editing.id, input) : await addBookNoteAction(book.id, input);
      if (!result.success || !result.data) {
        toast.error(actionError(result.message, "Failed to save the note", t, fmt));
        return;
      }
      router.refresh();
      onSaved?.(result.data, again);
      if (again) {
        setSaved(t("Saved the note for page {page}. Write the next one.", { page: formatCount(parsed.page, fmt) }));
        setPage("");
        setLine("");
        setText("");
        setLineOpen(false);
        requestAnimationFrame(() => pageRef.current?.focus());
        return;
      }
      toast.success(t(editing ? "Note updated" : "Note saved"));
      onClose();
    });
  }

  const clearError = (field: keyof Errors) => errors[field] && setErrors((prev) => ({ ...prev, [field]: undefined }));

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={620}
      className="w-150 rounded-[16px]"
      headClassName={cn("items-center gap-3.5 bg-linear-to-b to-surface px-5.5 py-4", HEAD_FROM[kind])}
      titleClassName="text-[18px] font-bold"
      lead={<Spine color={book.color} className="h-12 w-8.5" />}
      title={t(editing ? "Edit note" : "New note")}
      sub={<span className="block truncate text-[13px]">{book.title}</span>}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        pageRef.current?.focus();
        pageRef.current?.select();
      }}
      bodyClassName="gap-3.5 px-5.5 py-4.5"
      footerClassName="px-5.5"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={isPending} className={cn(LB_OUTLINE, "mr-auto")}>
            {t("Cancel")}
          </button>
          {!editing && (
            <button type="button" onClick={() => save(true)} disabled={isPending} className={cn(LB_OUTLINE, "border-primary text-emerald")}>
              {t("Save and add another")}
            </button>
          )}
          <button type="button" onClick={() => save(false)} disabled={isPending} className={LB_PRIMARY}>
            {isPending && <Loader />}
            {t("Save")}
          </button>
        </>
      }
    >
      {saved && (
        <div role="status" className="flex items-center gap-2 rounded-[8px] bg-note-green px-3 py-2.25 text-[13px] font-semibold text-tint-green-ink">
          <Check className="size-3.75" strokeWidth={2.5} aria-hidden="true" />
          {saved}
        </div>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_160px] gap-3.5 max-sm:grid-cols-1">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bn-date" className={LB_LABEL}>
            {t("Date")}
          </label>
          <DayField
            id="bn-date"
            value={date}
            max={today}
            invalid={!!errors.date}
            label={date ? longDay(date, fmt) : t("Pick a date")}
            after={<CalendarIcon />}
            onChange={(value) => {
              setDate(value);
              clearError("date");
            }}
          />
          {errors.date && <span className={LB_ERROR}>{errors.date}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bn-page" className={LB_LABEL}>
            {t("Page number")} <span className="text-expense">*</span>
          </label>
          <input
            ref={pageRef}
            id="bn-page"
            inputMode="numeric"
            value={page}
            onChange={(event) => {
              setPage(event.target.value.slice(0, 6));
              clearError("page");
            }}
            placeholder={t("e.g. 42")}
            aria-invalid={!!errors.page || undefined}
            className={cn(LB_FIELD, "text-[16px] font-semibold")}
          />
          {errors.page && <span className={LB_ERROR}>{errors.page}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span id="bn-kind" className={LB_LABEL}>
          {t("What kind of note is it?")}
        </span>
        <div role="radiogroup" aria-labelledby="bn-kind" className="grid grid-cols-3 gap-2.5 max-sm:grid-cols-1">
          {NOTE_KIND_ORDER.map((option) => {
            const on = option === kind;
            const meta = NOTE_KINDS[option];
            const Icon = KIND_ICON[option];
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setKind(option);
                  setErrors((prev) => ({ ...prev, text: undefined }));
                }}
                className={cn("relative flex flex-col items-start gap-2 rounded-[12px] p-3 text-left transition-colors", on ? cn("border-2", meta.soft, RING[option]) : "border border-line bg-surface hover:bg-hover")}
              >
                <span className={cn("flex size-8.5 items-center justify-center rounded-[10px]", on ? "bg-surface" : meta.soft)}>
                  <Icon className={cn("size-4.5", meta.ink)} aria-hidden="true" />
                </span>
                <span className="flex flex-col gap-px">
                  <span className={cn("text-[14px] font-bold", on ? meta.ink : "text-ink")}>{t(meta.label)}</span>
                  <span className="text-[12px] text-ink-muted">{t(meta.short)}</span>
                </span>
                {on && (
                  <span aria-hidden="true" className={cn("absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full text-white", meta.fill)}>
                    <Check className="size-3" strokeWidth={3.5} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className={cn("flex flex-col gap-3 rounded-[12px] border p-3.5", PANEL[kind], info.border)}>
        <span className={cn("flex items-start gap-2 text-[12.5px] leading-normal", info.ink)}>
          <Info className="mt-0.5 size-3.75 shrink-0" aria-hidden="true" />
          <span>{t(info.tip)}</span>
        </span>
        {showLine ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bn-line" className={LB_LABEL}>
              {t(info.lineLabel)}
            </label>
            <textarea id="bn-line" rows={2} maxLength={LINE_MAX} value={line} onChange={(event) => setLine(event.target.value)} placeholder={t(info.linePlaceholder)} className={cn(LB_AREA, "border-l-4 italic", LINE_EDGE[kind])} />
          </div>
        ) : (
          <button type="button" onClick={() => setLineOpen(true)} className={cn("-my-1 -ml-2.5 inline-flex h-7.5 items-center gap-1.5 self-start rounded-[8px] px-2.5 text-[13px] font-semibold hover:bg-surface/60", info.ink)}>
            <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
            {t("Add the line from the book (optional)")}
          </button>
        )}
        <div className="flex flex-col gap-1.5">
          <span className="flex justify-between gap-2">
            <label htmlFor="bn-text" className={LB_LABEL}>
              {t(info.noteLabel)}
              {kind === "THOUGHT" ? <span className="text-expense"> *</span> : <span> {t("(optional)")}</span>}
            </label>
            <span className="text-[12px] text-ink-faint tabular-nums">
              {formatCount(text.length, fmt)} / {formatCount(TEXT_MAX, fmt)}
            </span>
          </span>
          <textarea
            id="bn-text"
            rows={kind === "THOUGHT" ? 7 : 4}
            maxLength={TEXT_MAX}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              clearError("text");
            }}
            placeholder={t(info.notePlaceholder)}
            aria-invalid={!!errors.text || undefined}
            className={LB_AREA}
          />
          {errors.text && <span className={LB_ERROR}>{errors.text}</span>}
        </div>
      </div>
    </PopupDialog>
  );
}

export function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn("size-4 shrink-0 text-ink-muted", className)}>
      <path d="M8 2v4 M16 2v4 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M3 10h18" />
    </svg>
  );
}
