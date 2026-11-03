"use client";

import { BookHeart, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Input from "@/components/smartly/form/Input";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { JournalEntry, Note, NoteCategory, NoteKind } from "@/lib/customer/api";
import { createNoteAction, deleteNoteAction, searchJournalAction, updateNoteAction } from "@/lib/customer/writingActions";
import { categoryDotClass, entrySnippet, MOODS, NOTE_BODY_MAX, noteColorClass, noteCounts, noteMatches, parseQuickNote, sortNotes, type NoteFilter, type NoteView } from "@/lib/customer/writingDisplay";
import { formatDate, formatDay } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { NoteCategoriesDialog } from "./NoteCategoriesDialog";
import { NoteDialog } from "./NoteDialog";

interface NotesPageClientProps {
  notes: Note[];
  categories: NoteCategory[];
  today: string;
  // ?new=1 (the dashboard's "Quick note"): the quick box takes the cursor.
  focusNew?: boolean;
}

const VIEWS: { key: NoteView; emoji: string; label: string }[] = [
  { key: "all", emoji: "🗒", label: "All notes" },
  { key: "note", emoji: "📝", label: "Notes" },
  { key: "idea", emoji: "💡", label: "Ideas" },
  { key: "pinned", emoji: "📌", label: "Pinned" },
  { key: "archived", emoji: "🗄", label: "Archived@@notes" },
];

const VIEW_TITLE: Record<NoteView, string> = { all: "All notes", note: "Notes", idea: "Ideas", pinned: "Pinned", archived: "Archived@@notes" };

const NO_FILTER: NoteFilter = { view: "all", categoryId: null, tag: null, query: "" };

// Habit Tracker › Notes & Journal › Notes (the NotesHome board): a quick
// box for a note or an idea (#tags pulled out as you write), the views,
// categories and tags on the left, and the notes as cards, pinned first.
// The search also looks through the journal.
export function NotesPageClient({ notes: initialNotes, categories: initialCategories, today, focusNew = false }: NotesPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [categories, setCategories] = useState(initialCategories);
  const [filter, setFilter] = useState<NoteFilter>(NO_FILTER);
  const [quickKind, setQuickKind] = useState<NoteKind>("NOTE");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<Note | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [journalHits, setJournalHits] = useState<{ query: string; entries: JournalEntry[] } | null>(null);
  const [isSaving, startSaving] = useTransition();
  const quickRef = useRef<HTMLInputElement>(null);
  const count = (n: number) => formatCount(n, fmt);

  // The dashboard's "Quick note" lands here with ?new=1: focus the box once
  // and drop the flag, so a refresh doesn't.
  useEffect(() => {
    if (!focusNew) return;
    quickRef.current?.focus();
    router.replace("/habit-tracker/notes", { scroll: false });
  }, [focusNew, router]);

  // The journal half of the search, a moment after typing stops.
  const query = filter.query.trim();
  useEffect(() => {
    if (query.replace(/^#+/, "").length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void searchJournalAction(query).then((result) => {
        if (!cancelled) setJournalHits({ query, entries: result.success && result.data ? result.data.entries : [] });
      });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);
  const hits = journalHits && journalHits.query === query && query.replace(/^#+/, "").length >= 2 ? journalHits.entries : [];

  const counts = useMemo(() => noteCounts(notes), [notes]);
  const shown = useMemo(() => sortNotes(notes.filter((note) => noteMatches(note, filter, categories))), [notes, filter, categories]);
  const categoryOf = (id: string | null) => categories.find((category) => category.id === id) ?? null;
  const filtered = !!(filter.categoryId || filter.tag || query);
  const listTitle = query ? t("Results for “{query}”", { query }) : filter.tag ? `#${filter.tag}` : filter.categoryId ? (categoryOf(filter.categoryId)?.name ?? t("All notes")) : t(VIEW_TITLE[filter.view]);
  const emptyText = query ? t("No notes match. Try another word.") : filter.view === "archived" ? t("Nothing archived.") : t("No notes here yet. Write one above.");

  const replace = (note: Note) => setNotes((current) => current.map((entry) => (entry.id === note.id ? note : entry)));

  const saveQuick = () => {
    const text = draft.trim();
    if (!text || isSaving) return;
    const { body, tags } = parseQuickNote(text);
    startSaving(async () => {
      const result = await createNoteAction({ kind: quickKind, body: body.slice(0, NOTE_BODY_MAX), tags, categoryId: filter.categoryId });
      if (!result.success || !result.data) {
        toast.error(t(result.message ?? "Failed to save the note"));
        return;
      }
      const created = result.data;
      setNotes((current) => [created, ...current]);
      setDraft("");
      toast.success(t(quickKind === "IDEA" ? "Idea saved" : "Note saved"));
    });
  };

  const togglePin = async (note: Note) => {
    replace({ ...note, pinned: !note.pinned });
    const result = await updateNoteAction(note.id, { pinned: !note.pinned });
    if (!result.success || !result.data) {
      replace(note);
      toast.error(t(result.message ?? "Failed to save the note"));
      return;
    }
    replace(result.data);
    toast.success(t(note.pinned ? "Unpinned" : "Pinned to the top"));
  };

  // Gone at once, with Undo: the note comes back as it was (a new copy).
  const removeNote = async (note: Note) => {
    const result = await deleteNoteAction(note.id);
    if (!result.success) {
      toast.error(t(result.message ?? "Failed to delete the note"));
      return false;
    }
    setNotes((current) => current.filter((entry) => entry.id !== note.id));
    toast.success(t("Note deleted"), {
      action: {
        label: t("Undo"),
        onClick: () => {
          void createNoteAction({ kind: note.kind, title: note.title, body: note.body, categoryId: categoryOf(note.categoryId) ? note.categoryId : null, tags: note.tags, color: note.color, pinned: note.pinned }).then((restored) => {
            if (restored.success && restored.data) {
              const back = restored.data;
              setNotes((current) => [back, ...current]);
            } else toast.error(t(restored.message ?? "Failed to save the note"));
          });
        },
      },
    });
    return true;
  };

  const pick = (next: Partial<NoteFilter>) => setFilter((current) => ({ ...current, ...next }));

  return (
    <PageFrame className="gap-3.5 md:pt-7">
      <PageHeader
        title={t("Notes")}
        description={t("Quick notes, ideas and thoughts. Write first, sort later.")}
        actions={
          <>
            <Input
              type="search"
              size="sm"
              value={filter.query}
              onChange={(event) => pick({ query: event.target.value.slice(0, 80) })}
              placeholder={t("Search notes and journal")}
              aria-label={t("Search notes and journal")}
              leading={<Search className="size-4 text-ink-muted" strokeWidth={2} aria-hidden="true" />}
              frameClassName="w-full rounded-sm md:w-70"
            />
            <Button variant="secondary" className="h-9.5 rounded-sm" asChild>
              <Link href="/habit-tracker/journal">
                <BookHeart strokeWidth={2} />
                {t("Journal")}
              </Link>
            </Button>
          </>
        }
      />

      {/* The quick box: Note or Idea, the text, Save. */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          saveQuick();
        }}
        className="flex flex-wrap items-center gap-2.5 rounded-[14px] border-[1.5px] border-emerald-line bg-surface px-3 py-2.5 shadow-[0_4px_14px_rgba(15,23,42,0.06)] md:flex-nowrap"
      >
        <SegmentedControl
          label={t("Type")}
          variant="pill"
          value={quickKind}
          onChange={setQuickKind}
          options={[
            { value: "NOTE", label: `📝 ${t("Note")}` },
            { value: "IDEA", label: `💡 ${t("Idea")}` },
          ]}
        />
        <input
          ref={quickRef}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, NOTE_BODY_MAX))}
          aria-label={t("Quick note")}
          placeholder={t(quickKind === "IDEA" ? "Got an idea? Write it before it’s gone…" : "Write a quick note…")}
          className="h-9.5 min-w-0 flex-1 basis-60 bg-transparent text-body-lg text-ink outline-none placeholder:text-ink-faint"
        />
        <span className="text-caption whitespace-nowrap text-ink-faint max-md:hidden">{t("Use #tag · Enter to save")}</span>
        <Button type="submit" className="h-9.5 rounded-[9px]" disabled={!draft.trim() || isSaving}>
          {t("Save")}
        </Button>
      </form>

      <div className="grid gap-3.5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Card padding="sm" className="flex flex-col gap-3.5 self-start rounded-[14px] p-3 lg:sticky lg:top-4" aria-label={t("Filters")} role="group">
          <div className="flex gap-0.5 max-lg:overflow-x-auto lg:flex-col">
            {VIEWS.map((view) => {
              const on = filter.view === view.key && !filter.categoryId && !filter.tag;
              return (
                <button
                  key={view.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter({ ...NO_FILTER, query: filter.query, view: view.key })}
                  className={cn("flex h-8.5 shrink-0 items-center gap-2 rounded-sm px-2.5 text-left text-[13.5px] transition-colors", on ? "bg-emerald-soft font-bold text-emerald" : "font-medium text-ink-2 hover:bg-surface-sunken")}
                >
                  <span aria-hidden="true">{view.emoji}</span>
                  <span className="flex-1 whitespace-nowrap">{t(view.label)}</span>
                  <span className="text-caption font-normal text-ink-faint tabular-nums">{count(counts.views[view.key])}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-[11px] font-bold tracking-[0.06em] text-ink-muted uppercase">{t("Categories")}</span>
              <button type="button" onClick={() => setCategoriesOpen(true)} className="rounded-sm text-caption font-semibold text-emerald hover:underline">
                {t("Manage")}
              </button>
            </div>
            <div className="flex flex-wrap gap-0.5 lg:flex-col">
              {categories.map((category) => {
                const on = filter.categoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFilter({ ...NO_FILTER, query: filter.query, categoryId: on ? null : category.id })}
                    className={cn("flex h-8 items-center gap-2 rounded-sm px-2.5 text-left text-small text-ink transition-colors", on ? "bg-emerald-soft font-bold" : "font-medium hover:bg-surface-sunken")}
                  >
                    <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-[3px]", categoryDotClass(category.color))} />
                    <span className="min-w-0 flex-1 truncate">{category.name}</span>
                    <span className="text-caption font-normal text-ink-faint tabular-nums">{count(counts.byCategory[category.id] ?? 0)}</span>
                  </button>
                );
              })}
              {categories.length === 0 && <p className="px-2.5 text-caption text-ink-muted">{t("No categories yet.")}</p>}
            </div>
          </div>

          {counts.tags.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="px-1 text-[11px] font-bold tracking-[0.06em] text-ink-muted uppercase">{t("Tags")}</span>
              <div className="flex flex-wrap gap-1.25">
                {counts.tags.map((tag) => {
                  const on = filter.tag === tag.name;
                  return (
                    <button
                      key={tag.name}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setFilter({ ...NO_FILTER, query: filter.query, tag: on ? null : tag.name })}
                      className={cn("h-6.5 rounded-full border px-2.25 text-caption font-semibold transition-colors", on ? "border-emerald bg-emerald text-white dark:text-on-action" : "border-line bg-surface text-ink-soft hover:border-line-strong")}
                    >
                      #{tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        <section aria-label={t("Notes")} className="flex min-w-0 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold text-ink">{listTitle}</h2>
            <span className="text-small text-ink-muted">{t(shown.length === 1 ? "{count} note" : "{count} notes", { count: count(shown.length) })}</span>
            {filtered && (
              <button type="button" onClick={() => setFilter({ ...NO_FILTER, view: filter.view })} className="inline-flex h-6.5 items-center gap-1 rounded-full border border-line-strong bg-surface px-2.5 text-caption font-semibold text-ink-2 hover:bg-surface-sunken">
                {t("Clear filter")}
                <X className="size-3" strokeWidth={2.5} aria-hidden="true" />
              </button>
            )}
          </div>

          {shown.length > 0 ? (
            <ul className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((note) => {
                const category = categoryOf(note.categoryId);
                const sameYear = formatDate(note.createdAt, "yyyy") === today.slice(0, 4);
                return (
                  <li key={note.id} className={cn("relative flex flex-col gap-2 rounded-[14px] border p-3.5 pb-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-colors hover:border-line-strong", noteColorClass(note.color), note.pinned ? "border-emerald" : "border-line")}>
                    <span className="flex items-center gap-1.5">
                      <span className={cn("inline-flex h-5 items-center rounded-full px-1.75 text-[11px] font-bold", note.kind === "IDEA" ? "bg-warning-soft text-warning-ink" : "bg-surface-sunken text-ink-soft")}>
                        {note.kind === "IDEA" ? `💡 ${t("Idea")}` : t("Note")}
                      </span>
                      <span className="text-[11.5px] text-ink-muted">{formatDate(note.createdAt, sameYear ? "d MMM" : "d MMM yyyy", "—", fmt)}</span>
                    </span>
                    {/* The whole card opens the note; the pin sits above it. */}
                    <button type="button" onClick={() => setEditing(note)} className="text-left after:absolute after:inset-0 after:rounded-[14px] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-focus-ring">
                      {note.title && <span className="mb-1 block text-[14.5px] font-bold text-ink">{note.title}</span>}
                      <span className="line-clamp-8 text-small leading-[1.5] whitespace-pre-wrap text-ink-2">{note.body}</span>
                      {!note.title && <span className="sr-only">{t("Open note")}</span>}
                    </button>
                    {(category || note.tags.length > 0) && (
                      <span className="flex flex-wrap items-center gap-1.5">
                        {category && (
                          <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-ink-soft">
                            <span aria-hidden="true" className={cn("size-2 rounded-[2px]", categoryDotClass(category.color))} />
                            {category.name}
                          </span>
                        )}
                        {note.tags.map((tag) => (
                          <span key={tag} className="text-[11.5px] font-semibold text-emerald">
                            #{tag}
                          </span>
                        ))}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => void togglePin(note)}
                      aria-pressed={note.pinned}
                      aria-label={t(note.pinned ? "Unpin" : "Pin")}
                      title={t(note.pinned ? "Unpin" : "Pin")}
                      className={cn("absolute top-2.5 right-2.5 z-10 flex size-7 items-center justify-center rounded-full text-[14px] transition-opacity hover:bg-surface-sunken pointer-coarse:size-9", note.pinned ? "opacity-100" : "opacity-30 hover:opacity-70")}
                    >
                      <span aria-hidden="true">📌</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Card padding="lg" className="rounded-[14px] py-10 text-center text-body text-ink-muted">
              {emptyText}
            </Card>
          )}

          {hits.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-small font-bold text-ink-soft">{t("From your journal · {count}", { count: count(hits.length) })}</h3>
              {hits.map((entry) => (
                <Link
                  key={entry.date}
                  href={`/habit-tracker/journal?date=${entry.date}`}
                  className="flex items-center gap-2.5 rounded-field border border-line bg-surface px-3 py-2.5 text-ink transition-colors hover:border-line-strong"
                >
                  <span aria-hidden="true" className="text-[18px]">
                    {MOODS[entry.mood]?.emoji}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <b className="text-small">{formatDay(entry.date, "d MMM yyyy", fmt)}</b>
                    <span className="truncate text-[12.5px] text-ink-soft">{entrySnippet(entry)}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <NoteDialog
        note={editing}
        categories={categories}
        onClose={() => setEditing(null)}
        onSaved={(note) => {
          replace(note);
          setEditing(null);
        }}
        onDelete={removeNote}
      />
      <NoteCategoriesDialog
        open={categoriesOpen}
        categories={categories}
        counts={counts.byCategory}
        onClose={() => setCategoriesOpen(false)}
        onChange={setCategories}
        onRemoved={(id) => {
          setNotes((current) => current.map((note) => (note.categoryId === id ? { ...note, categoryId: null } : note)));
          if (filter.categoryId === id) pick({ categoryId: null });
        }}
      />
    </PageFrame>
  );
}
