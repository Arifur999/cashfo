"use client";

import { ChevronLeft, ChevronRight, Maximize, Minimize, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import type { BookNote, NoteMark, NoteMarkColor } from "@/lib/customer/api";
import { updateBookNoteAction } from "@/lib/customer/bookActions";
import { actionError, dayText } from "@/lib/customer/habitDisplay";
import { addMark, longDay, markSegments, removeMark, NOTE_KINDS, type NoteSort, noteDay, noteKind, notePreview, READER_SIZES } from "@/lib/customer/libraryBoard";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { KindChip, LB_OUTLINE, LB_PRIMARY, PageTile } from "./LibraryBits";

const MARK_BG: Record<NoteMarkColor, string> = { yellow: "bg-mark-yellow", green: "bg-mark-green", pink: "bg-mark-pink" };
const MARK_SWATCH: Record<NoteMarkColor, string> = { yellow: "bg-mark-yellow border-mark-yellow-edge", green: "bg-mark-green border-mark-green-edge", pink: "bg-mark-pink border-mark-pink-edge" };
const MARK_NAME: Record<NoteMarkColor, string> = { yellow: "Yellow", green: "Green", pink: "Pink" };
const READER_TOOL = "inline-flex h-8.5 min-w-8.5 items-center justify-center gap-1.5 rounded-[8px] border border-line bg-surface px-2.5 text-[13px] font-semibold text-ink-2 hover:bg-surface-sunken disabled:cursor-default disabled:opacity-45";

// The sort toggle the list and the book page share: page number or date.
export function NoteSortToggle({ sort, onChange }: { sort: NoteSort; onChange: (sort: NoteSort) => void }) {
  const { t } = useLocale();
  return (
    <div role="radiogroup" aria-label={t("Sort by")} className="inline-flex rounded-[8px] bg-surface-sunken p-0.75">
      {(["page", "date"] as const).map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={sort === value}
          onClick={() => onChange(value)}
          className={cn("h-7.5 rounded-[6px] px-3 text-[13px] font-semibold", sort === value ? "bg-surface text-emerald shadow-[0_1px_2px_rgba(15,23,42,0.12)]" : "text-ink-soft hover:text-ink")}
        >
          {t(value === "page" ? "Page number" : "Date")}
        </button>
      ))}
    </div>
  );
}

interface NotesListDialogProps {
  open: boolean;
  onClose: () => void;
  bookTitle: string;
  notes: BookNote[];
  sort: NoteSort;
  onSort: (sort: NoteSort) => void;
  onOpenNote: (note: BookNote) => void;
  onWrite: () => void;
}

// ReadingNotesList: every note of one book, by page or by day, each opening
// the reader.
export function NotesListDialog({ open, onClose, bookTitle, notes, sort, onSort, onOpenNote, onWrite }: NotesListDialogProps) {
  const { t, fmt } = useLocale();
  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      width={620}
      className="h-[min(680px,calc(100dvh-48px))] w-180 rounded-[16px] leading-[normal]" subClassName="leading-[normal]"
      headClassName="px-5.5 py-4"
      title={t("All notes")}
      sub={
        <span className="block truncate text-[13px]">
          {bookTitle} · {t(notes.length === 1 ? "{count} note" : "{count} notes", { count: formatCount(notes.length, fmt) })}
        </span>
      }
      bodyClassName="gap-0 p-0"
    >
      <div className="flex shrink-0 items-center justify-between gap-2.5 border-b border-divider bg-page px-5.5 py-2.5">
        <NoteSortToggle sort={sort} onChange={onSort} />
        <button type="button" onClick={onWrite} className="inline-flex h-8.5 items-center gap-1.5 rounded-[8px] bg-primary px-3 text-[13px] font-semibold text-on-action hover:bg-emerald-hover">
          + {t("New note")}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="text-[15px] font-semibold text-ink">{t("No notes for this book yet")}</span>
            <span className="text-[13.5px] text-ink-muted">{t("Write the page number and what you liked or thought.")}</span>
            <button type="button" onClick={onWrite} className={LB_PRIMARY}>
              {t("Write the first note")}
            </button>
          </div>
        ) : (
          notes.map((note) => {
            const marks = note.marks?.length ?? 0;
            return (
              <button
                key={note.id}
                type="button"
                onClick={() => onOpenNote(note)}
                aria-label={t("Page {page}, read note", { page: note.page === null ? "–" : formatCount(note.page, fmt) })}
                className="grid w-full grid-cols-[70px_minmax(0,1fr)_20px] items-center gap-x-3.5 border-b border-divider px-5.5 py-3 text-left transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
              >
                <PageTile page={note.page} />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-muted">
                    <span>{dayText(noteDay(note), fmt, "dayMonthYY")}</span>
                    <KindChip kind={noteKind(note)} />
                    {marks > 0 && <span className="rounded-full bg-tint-yellow px-2 py-0.5 text-[11.5px] font-semibold text-tint-yellow-ink">{t("{count} highlighted", { count: formatCount(marks, fmt) })}</span>}
                  </span>
                  <span className="line-clamp-2 text-[14px] leading-[1.55] text-ink">{notePreview(note)}</span>
                </span>
                <ChevronRight className="size-4.5 text-ink-faint" aria-hidden="true" />
              </button>
            );
          })
        )}
      </div>
    </PopupDialog>
  );
}

interface NoteReaderDialogProps {
  open: boolean;
  onClose: () => void;
  bookId: string;
  bookTitle: string;
  notes: BookNote[];
  noteId: string | null;
  onMove: (noteId: string) => void;
  onBack: () => void;
  onEdit: (note: BookNote) => void;
  onDelete: (note: BookNote) => void;
}

// ReadingNoteReader: one note on a page of paper, its text bigger or
// smaller, the whole screen if wanted, words highlighted in three colours,
// and the previous and next notes a key away.
export function NoteReaderDialog({ open, onClose, bookId, bookTitle, notes, noteId, onMove, onBack, onEdit, onDelete }: NoteReaderDialogProps) {
  const { t, fmt } = useLocale();
  const [size, setSize] = useState<number>(READER_SIZES.base);
  const [fit, setFit] = useState(false);
  // Highlights changed here, shown at once while they save.
  const [marksOf, setMarksOf] = useState<Record<string, NoteMark[]>>({});
  const textRef = useRef<HTMLParagraphElement>(null);
  const picked = useRef<{ a: number; b: number } | null>(null);

  const index = notes.findIndex((note) => note.id === noteId);
  const note = index >= 0 ? notes[index] : null;
  const marks = note ? (marksOf[note.id] ?? note.marks ?? []) : [];

  // Remember the words selected inside the note, so a colour can be put on them.
  useEffect(() => {
    if (!open) return;
    const onSelection = () => {
      const box = textRef.current;
      const selection = window.getSelection();
      if (!box || !selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (range.collapsed) return;
      if (!box.contains(range.commonAncestorContainer)) {
        picked.current = null;
        return;
      }
      const before = document.createRange();
      before.selectNodeContents(box);
      before.setEnd(range.startContainer, range.startOffset);
      const a = before.toString().length;
      picked.current = { a, b: a + range.toString().length };
    };
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, [open]);

  // The arrow keys turn the page, unless the reader is typing.
  useEffect(() => {
    if (!open || !note) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target as HTMLElement | null;
      if (target && /input|textarea|select/i.test(target.tagName)) return;
      const next = notes[index + (event.key === "ArrowLeft" ? -1 : 1)];
      if (next) onMove(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, note, notes, index, onMove]);

  function saveMarks(target: BookNote, next: NoteMark[], message: string, undo?: NoteMark[]) {
    setMarksOf((prev) => ({ ...prev, [target.id]: next }));
    void updateBookNoteAction(bookId, target.id, { marks: next }).then((result) => {
      if (!result.success) {
        setMarksOf((prev) => ({ ...prev, [target.id]: target.marks ?? [] }));
        toast.error(actionError(result.message, "Failed to save the note", t, fmt));
        return;
      }
      if (undo) toast(message, { action: { label: t("Undo"), onClick: () => saveMarks(target, undo, t("Highlights put back")) } });
      else toast.success(message);
    });
  }

  function paint(color: NoteMarkColor) {
    if (!note) return;
    const range = picked.current;
    picked.current = null;
    window.getSelection()?.removeAllRanges();
    if (!range || range.b <= range.a) {
      toast(t("First select some words in the note, then pick a colour."));
      return;
    }
    saveMarks(note, addMark(marks, range.a, range.b, color, note.text.length), t("Highlighted"));
  }

  if (!note) return null;
  const kind = NOTE_KINDS[noteKind(note)];
  const segments = markSegments(note.text, marks);
  const percent = Math.round((size / READER_SIZES.base) * 100);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn("flex flex-col gap-0 overflow-hidden border-0 bg-paper-desk p-0 text-ink shadow-overlay ring-0 sm:max-w-none", fit ? "h-dvh w-screen max-w-none rounded-none" : "h-[min(760px,calc(100dvh-48px))] w-205 max-w-[calc(100vw-32px)] rounded-[16px]")}
      >
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface px-3.5 py-2.5">
          <button type="button" onClick={onBack} title={t("All notes")} className={READER_TOOL}>
            <ChevronLeft className="size-3.75" strokeWidth={2.25} aria-hidden="true" />
            {t("All notes")}
          </button>
          <span aria-hidden="true" className="h-5.5 w-px bg-line" />
          <button type="button" onClick={() => setSize((value) => Math.max(READER_SIZES.min, value - READER_SIZES.step))} disabled={size <= READER_SIZES.min} aria-label={t("Smaller text")} title={t("Smaller text")} className={cn(READER_TOOL, "text-[12px]")}>
            A−
          </button>
          <span className="min-w-11 text-center text-[12.5px] font-semibold text-ink-soft tabular-nums">{formatCount(percent, fmt)}%</span>
          <button type="button" onClick={() => setSize((value) => Math.min(READER_SIZES.max, value + READER_SIZES.step))} disabled={size >= READER_SIZES.max} aria-label={t("Bigger text")} title={t("Bigger text")} className={cn(READER_TOOL, "text-[16px]")}>
            A+
          </button>
          <button
            type="button"
            onClick={() => {
              setFit(!fit);
              setSize(fit ? READER_SIZES.base : READER_SIZES.fit);
            }}
            aria-pressed={fit}
            title={t(fit ? "Back to the normal size" : "Fill the screen and size the text to read comfortably")}
            className={cn(READER_TOOL, fit && "border-emerald-line bg-emerald-soft text-emerald hover:bg-emerald-soft")}
          >
            {fit ? <Minimize className="size-3.75" aria-hidden="true" /> : <Maximize className="size-3.75" aria-hidden="true" />}
            {t(fit ? "Normal view" : "Fit to screen")}
          </button>
          <span aria-hidden="true" className="h-5.5 w-px bg-line" />
          <span className="text-[12.5px] font-semibold text-ink-soft">{t("Highlight")}</span>
          {(["yellow", "green", "pink"] as const).map((color) => (
            <button
              key={color}
              type="button"
              // Keep the selection: the button must not take it away on press.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => paint(color)}
              aria-label={t("Highlight {color}", { color: t(MARK_NAME[color]) })}
              title={t("Highlight {color}", { color: t(MARK_NAME[color]) })}
              className={cn(READER_TOOL, "w-8.5 px-0")}
            >
              <span aria-hidden="true" className={cn("size-4.5 rounded-[5px] border", MARK_SWATCH[color])} />
            </button>
          ))}
          {marks.length > 0 && (
            <button type="button" onClick={() => saveMarks(note, [], t("Highlights removed"), marks)} title={t("Remove highlights")} className={cn(READER_TOOL, "text-expense")}>
              {t("Remove highlights")}
            </button>
          )}
          <span className="flex-1" />
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8.5 items-center justify-center rounded-[8px] text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5.5">
          <article className={cn("mx-auto box-border flex min-h-full flex-col gap-4.5 rounded-[6px] border border-paper-edge bg-paper px-11 pt-8.5 pb-6.5 shadow-[0_2px_10px_rgba(60,50,30,0.10)] selection:bg-sky-soft max-sm:px-5", fit ? "max-w-245" : "max-w-170")}>
            <header className="flex items-start justify-between gap-3 border-b border-paper-rule pb-3">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-[12.5px] font-semibold tracking-[0.04em] text-paper-muted">{bookTitle}</span>
                <DialogTitle className="text-[22px] font-bold text-paper-ink">{t("Page {page}", { page: note.page === null ? "–" : formatCount(note.page, fmt) })}</DialogTitle>
              </div>
              <span className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="text-[12.5px] text-paper-muted">{longDay(noteDay(note), fmt)}</span>
                <span className={cn("rounded-full px-2.25 py-0.5 text-[12px] font-semibold", kind.soft, kind.ink)}>{t(kind.label)}</span>
              </span>
            </header>
            <DialogDescription className="sr-only">{t("Select words, then pick a colour to highlight them")}</DialogDescription>
            {note.line && (
              <blockquote className="rounded-[0_10px_10px_0] border-l-4 border-success bg-note-green px-4 py-3 leading-[1.75] whitespace-pre-wrap text-success-ink italic" style={{ fontSize: `${size - 1}px` }}>
                {note.line}
              </blockquote>
            )}
            <p ref={textRef} className="leading-[1.9] whitespace-pre-wrap text-paper-ink" style={{ fontSize: `${size}px` }}>
              {segments.map((segment, i) =>
                segment.color && segment.mark ? (
                  <span
                    key={i}
                    title={t("Click to remove this highlight")}
                    onClick={() => segment.mark && saveMarks(note, removeMark(marks, segment.mark), t("Highlight removed"), marks)}
                    className={cn("cursor-pointer rounded-[3px] py-px", MARK_BG[segment.color])}
                  >
                    {segment.text}
                  </span>
                ) : (
                  <span key={i}>{segment.text}</span>
                ),
              )}
            </p>
            <footer className="mt-auto flex justify-between gap-3 border-t border-paper-rule pt-3 text-[12px] text-paper-faint">
              <span>{t("Select words, then pick a colour to highlight them")}</span>
              <span className="tabular-nums">
                {formatCount(index + 1, fmt)} / {formatCount(notes.length, fmt)}
              </span>
            </footer>
          </article>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line bg-surface px-3.5 py-2.5">
          <button type="button" onClick={() => notes[index - 1] && onMove(notes[index - 1].id)} disabled={index === 0} className={cn(LB_OUTLINE, "h-9")}>
            <ChevronLeft className="size-3.75" strokeWidth={2.25} aria-hidden="true" />
            {t("Previous note")}
          </button>
          <button type="button" onClick={() => notes[index + 1] && onMove(notes[index + 1].id)} disabled={index === notes.length - 1} className={cn(LB_OUTLINE, "h-9")}>
            {t("Next note")}
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
