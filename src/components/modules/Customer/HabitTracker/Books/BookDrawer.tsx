"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/modules/Customer/Books/shared/Drawer";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { Book, BookStatus } from "@/lib/customer/api";
import { createBookAction, updateBookAction } from "@/lib/customer/bookActions";
import { actionError, latinDigits } from "@/lib/customer/habitDisplay";
import { SHELF_LABEL } from "@/lib/customer/libraryDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { draftFromReminder, type ReminderBook, ReminderSection } from "../Reminders";
import { BOOK_PALETTE, suggestColor } from "./bookPalette";
import { Cover } from "./Cover";

interface BookDrawerProps {
  open: boolean;
  onClose: () => void;
  // The book being edited; null adds a new one.
  editing: Book | null;
  onRemove: (book: Book) => void;
  // The page's saved reminders; without them the drawer has no reminder.
  reminders?: ReminderBook;
}

const SHELF_OPTIONS: BookStatus[] = ["WANT_TO_READ", "READING", "FINISHED"];
const MAX_PAGES = 20000;

// Add or edit a book: title, author, how many pages, which shelf it starts
// on, and the cover colour.
export function BookDrawer({ open, onClose, editing, onRemove, reminders }: BookDrawerProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [status, setStatus] = useState<BookStatus>("WANT_TO_READ");
  const [pagesRead, setPagesRead] = useState("");
  // Until the reader picks a colour, a new book takes one from its title.
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  // A new book's reminder, saved once the book is (an edited one's saves itself).
  const [reminder, setReminder] = useState(() => draftFromReminder("BOOK", null));
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setTitle(editing?.title ?? "");
      setAuthor(editing?.author ?? "");
      setTotalPages(editing ? String(editing.totalPages) : "");
      setStatus("WANT_TO_READ");
      setPagesRead("");
      setPickedColor(editing?.color ?? null);
      setReminder(draftFromReminder("BOOK", null));
    }
  }

  const color = pickedColor ?? suggestColor(title.trim());
  const total = Number(totalPages);
  const totalOk = /^\d+$/.test(totalPages) && total >= 1 && total <= MAX_PAGES;
  const readTooHigh = status === "READING" && totalOk && pagesRead !== "" && Number(pagesRead) > total;
  // The server refuses a total below the pages already read; a finished book
  // is exempt, its pages simply follow the new total.
  const shrinksBelowProgress = editing !== null && editing.status !== "FINISHED" && totalOk && total < editing.pagesRead;
  const valid = title.trim().length > 0 && totalOk && !readTooHigh && !shrinksBelowProgress;
  const digits = (value: string) => latinDigits(value).replace(/\D/g, "").slice(0, 5);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const details = { title: title.trim(), author: author.trim(), totalPages: total, color };
      const result = editing ? await updateBookAction(editing.id, details) : await createBookAction({ ...details, status, ...(status === "READING" ? { pagesRead: Number(pagesRead || 0) } : {}) });
      if (result.success) {
        toast.success(t(editing ? "Book updated" : "Book added"));
        // A new book's reminder needs its id, so it is saved now.
        if (!editing && result.data && reminders?.available) {
          const saved = await reminders.saveDraft("BOOK", result.data.id, reminder);
          if (!saved.success) toast.error(t("Saved, but not its reminder. Open it again to set the reminder."));
        }
        onClose();
        router.refresh();
      } else {
        toast.error(actionError(result.message, "Failed to save book", t, locale));
      }
    });
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text}
      {optional && <span className="font-normal text-ink-muted"> ({t("optional")})</span>}
    </span>
  );

  return (
    <Drawer
      open={open}
      title={editing ? t("Edit book") : t("Add a book")}
      description={t("Title, author and how many pages. The cover colour is yours to pick.")}
      busy={isPending}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          {editing && (
            // The icon alone on a phone, so the three buttons keep to one line.
            <Button type="button" variant="ghost" className="mr-auto text-expense hover:bg-expense-soft hover:text-expense max-sm:px-3" onClick={() => onRemove(editing)} disabled={isPending} aria-label={t("Remove")}>
              <Trash2 />
              <span className="max-sm:hidden">{t("Remove")}</span>
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={!valid || isPending} className="px-5">
            {isPending && <Loader />}
            {t(editing ? "Save changes" : "Add book")}
          </Button>
        </>
      }
    >
      <Field htmlFor="bk-title" label={label(t("Title"))}>
        <Input id="bk-title" size="md" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus maxLength={120} placeholder={t("e.g. Atomic Habits")} />
      </Field>
      <Field htmlFor="bk-author" label={label(t("Author"), true)}>
        <Input id="bk-author" size="md" value={author} onChange={(event) => setAuthor(event.target.value)} maxLength={80} />
      </Field>
      <Field htmlFor="bk-pages" label={label(t("Total pages"))} error={totalPages !== "" && !totalOk ? t("Enter a number from 1 to 20000.") : shrinksBelowProgress ? t("You've already read more pages than this.") : undefined}>
        <Input id="bk-pages" size="md" inputMode="numeric" value={totalPages} onChange={(event) => setTotalPages(digits(event.target.value))} placeholder="320" invalid={(totalPages !== "" && !totalOk) || shrinksBelowProgress} frameClassName="w-40" />
      </Field>

      {!editing && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-body leading-[normal] font-medium text-ink">{t("Shelf")}</legend>
          <SegmentedControl label={t("Shelf")} variant="soft" stretch value={status} onChange={setStatus} options={SHELF_OPTIONS.map((value) => ({ value, label: t(SHELF_LABEL[value]) }))} />
          {status === "READING" && (
            <Field htmlFor="bk-read" label={<span className="text-small font-medium text-ink-2">{t("Pages read so far")}</span>} error={readTooHigh ? t("That's more than the total pages.") : undefined} className="mt-2">
              <Input id="bk-read" size="md" inputMode="numeric" value={pagesRead} onChange={(event) => setPagesRead(digits(event.target.value))} placeholder="0" invalid={readTooHigh} frameClassName="w-40" />
            </Field>
          )}
        </fieldset>
      )}

      <fieldset className="grid grid-cols-[72px_minmax(0,1fr)] gap-4">
        <Cover size="card" title={title.trim() || t("Your book title")} author={author.trim()} color={color} />
        <div className="flex flex-col gap-2">
          <legend className="mb-2 text-body leading-[normal] font-medium text-ink">{t("Cover colour")}</legend>
          <div role="radiogroup" aria-label={t("Cover colour")} className="grid grid-cols-[repeat(auto-fill,28px)] gap-x-3 gap-y-2">
            {BOOK_PALETTE.map((option) => {
              const on = option.key === color;
              return (
                <button key={option.key} type="button" role="radio" aria-checked={on} aria-label={t(option.label)} title={t(option.label)} onClick={() => setPickedColor(option.key)} className="relative size-7 rounded-full transition-shadow after:absolute after:-inset-1.5" style={{ backgroundImage: `linear-gradient(135deg, ${option.from}, ${option.to})`, ...(on && { boxShadow: `0 0 0 2px var(--surface), 0 0 0 4px ${option.from}` }) }} />
              );
            })}
          </div>
        </div>
      </fieldset>

      {reminders && <ReminderSection kind="BOOK" targetKey={editing?.id ?? null} book={reminders} draft={reminder} onDraftChange={setReminder} description={t("A nudge to pick up the book and read.")} />}
    </Drawer>
  );
}
