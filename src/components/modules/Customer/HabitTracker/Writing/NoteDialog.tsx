"use client";

import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import Textarea from "@/components/smartly/form/Textarea";
import type { Note, NoteCategory, NoteColor, NoteKind } from "@/lib/customer/api";
import { updateNoteAction } from "@/lib/customer/writingActions";
import { categoryDotClass, NOTE_BODY_MAX, NOTE_COLORS, NOTE_TITLE_MAX, noteColorClass, parseTagList, TAGS_PER_NOTE } from "@/lib/customer/writingDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface NoteDialogProps {
  // The note open; null when closed.
  note: Note | null;
  categories: NoteCategory[];
  onClose: () => void;
  onSaved: (note: Note) => void;
  // Deletes it (with Undo); true once gone.
  onDelete: (note: Note) => Promise<boolean>;
}

// A note opened from its card (the board's "Note" popup): Note or Idea, a
// pin, the title and text, a category, tags and a tint; Archive and Delete
// at the foot.
export function NoteDialog({ note, categories, onClose, onSaved, onDelete }: NoteDialogProps) {
  return note ? <NoteForm key={note.id} note={note} categories={categories} onClose={onClose} onSaved={onSaved} onDelete={onDelete} /> : null;
}

function NoteForm({ note, categories, onClose, onSaved, onDelete }: NoteDialogProps & { note: Note }) {
  const { t } = useLocale();
  const [kind, setKind] = useState<NoteKind>(note.kind);
  const [pinned, setPinned] = useState(note.pinned);
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [categoryId, setCategoryId] = useState(categories.some((category) => category.id === note.categoryId) ? note.categoryId : null);
  const [tagText, setTagText] = useState(note.tags.join(", "));
  const [color, setColor] = useState<NoteColor>(note.color);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { tags, invalid } = parseTagList(tagText);
  const tagError = invalid.length > 0 ? t("A tag is one word: letters, digits, _ or -, up to 30 of them") : tags.length > TAGS_PER_NOTE ? t("A note can have up to {count} tags", { count: TAGS_PER_NOTE }) : null;

  const save = (changes: Parameters<typeof updateNoteAction>[1], done: string) => {
    startTransition(async () => {
      const result = await updateNoteAction(note.id, changes);
      if (!result.success || !result.data) {
        setError(t(result.message ?? "Failed to save the note"));
        return;
      }
      toast.success(t(done));
      onSaved(result.data);
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim()) {
      setError(t("Write something first"));
      return;
    }
    if (tagError) return;
    save({ kind, pinned, title: title.trim(), body: body.trim(), categoryId, tags, color }, "Saved");
  };

  const typeButton = (value: NoteKind, label: string) => (
    <button
      type="button"
      aria-pressed={kind === value}
      onClick={() => setKind(value)}
      className={cn("h-8.5 rounded-sm border px-3 text-small font-semibold transition-colors", kind === value ? "border-emerald bg-emerald-soft text-emerald" : "border-line bg-surface text-ink hover:bg-surface-sunken")}
    >
      {label}
    </button>
  );

  return (
    <PopupDialog
      open
      onClose={onClose}
      busy={isPending}
      width={500}
      title={t("Note")}
      onSubmit={submit}
      footerClassName="justify-between"
      footer={
        <>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={() => save({ archived: !note.archived }, note.archived ? "Back in your notes" : "Archived")}>
              {note.archived ? <ArchiveRestore strokeWidth={2} /> : <Archive strokeWidth={2} />}
              {t(note.archived ? "Unarchive" : "Archive")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              className="text-expense hover:bg-expense-soft hover:text-expense"
              onClick={() =>
                startTransition(async () => {
                  if (await onDelete(note)) onClose();
                })
              }
            >
              <Trash2 strokeWidth={2} />
              {t("Delete")}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={isPending} onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={isPending || !!tagError}>
              {t("Save")}
            </Button>
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("Type")}>
          {typeButton("NOTE", `📝 ${t("Note")}`)}
          {typeButton("IDEA", `💡 ${t("Idea")}`)}
          <span className="flex-1" />
          <button
            type="button"
            aria-pressed={pinned}
            onClick={() => setPinned(!pinned)}
            className={cn("h-8.5 rounded-sm border px-3 text-small font-semibold transition-colors", pinned ? "border-warning-line bg-warning-soft text-warning-ink" : "border-line bg-surface text-ink hover:bg-surface-sunken")}
          >
            📌 {t(pinned ? "Pinned" : "Pin")}
          </button>
        </div>

        <Field htmlFor="note-title" label={t("Title")}>
          <Input id="note-title" size="md" value={title} maxLength={NOTE_TITLE_MAX} onChange={(event) => setTitle(event.target.value)} placeholder={t("Optional")} />
        </Field>

        <Field htmlFor="note-body" label={t("Note")} error={error}>
          <Textarea
            id="note-body"
            rows={5}
            value={body}
            maxLength={NOTE_BODY_MAX}
            invalid={!!error}
            onChange={(event) => {
              setBody(event.target.value);
              setError(null);
            }}
          />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-small font-semibold text-ink-2">{t("Category")}</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("Category")}>
            {categories.map((category) => {
              const on = categoryId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCategoryId(on ? null : category.id)}
                  className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-small font-semibold text-ink transition-colors", on ? "border-ink-soft bg-strip" : "border-line bg-surface hover:bg-surface-sunken")}
                >
                  <span aria-hidden="true" className={cn("size-2 rounded-[2px]", categoryDotClass(category.color))} />
                  {category.name}
                </button>
              );
            })}
            {categories.length === 0 && <span className="text-small text-ink-muted">{t("No categories yet.")}</span>}
          </div>
        </div>

        <Field htmlFor="note-tags" label={t("Tags (comma separated)")} error={tagError}>
          <Input id="note-tags" size="md" value={tagText} invalid={!!tagError} onChange={(event) => setTagText(event.target.value.slice(0, 400))} placeholder={t("e.g. furnify, marketing")} />
        </Field>

        <div className="flex flex-wrap items-center gap-2.5" role="radiogroup" aria-label={t("Colour")}>
          <span className="text-small font-semibold text-ink-2">{t("Colour")}</span>
          {NOTE_COLORS.map((swatch) => (
            <button
              key={swatch.key}
              type="button"
              role="radio"
              aria-checked={color === swatch.key}
              aria-label={t(swatch.label)}
              title={t(swatch.label)}
              onClick={() => setColor(swatch.key)}
              className={cn("size-7 rounded-full border border-line-strong transition-shadow", noteColorClass(swatch.key), color === swatch.key && "shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--emerald)]")}
            />
          ))}
        </div>
      </div>
    </PopupDialog>
  );
}
