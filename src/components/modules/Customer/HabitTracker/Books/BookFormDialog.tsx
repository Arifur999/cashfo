"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import type { Book, BookShelf, BookStatus } from "@/lib/customer/api";
import { createBookAction, createBookShelfAction, updateBookAction } from "@/lib/customer/bookActions";
import { actionError, latinDigits } from "@/lib/customer/habitDisplay";
import { BUILT_IN_SHELVES, parsePrice, shelfList, shelfNameProblem, shelfOf } from "@/lib/customer/libraryBoard";
import { formatCount } from "@/lib/i18n/digits";
import { takaSign } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { draftFromReminder, type ReminderBook, ReminderSection } from "../Reminders";
import { BOOK_PALETTE, suggestColor } from "./bookPalette";
import { LB_ERROR, LB_FIELD, LB_LABEL, LB_OUTLINE, LB_PRIMARY } from "./LibraryBits";

const STATUS_OPTIONS: { value: BookStatus; label: string }[] = [
  { value: "WANT_TO_READ", label: "Want to read" },
  { value: "READING", label: "Reading" },
  { value: "FINISHED", label: "Finished" },
];
const NEW_SHELF = "__new";
const MAX_PAGES = 20000;

interface BookFormDialogProps {
  open: boolean;
  onClose: () => void;
  // The book being edited; null adds one.
  editing: Book | null;
  shelves: BookShelf[];
  // The shelf a new book starts on (the shelf it was added from).
  startShelf?: string;
  reminders?: ReminderBook;
  // A new book was added (to show it), or the edited one was saved.
  onSaved?: (book: Book, change: { finishedNow: boolean; created: boolean }) => void;
  // The edit popup's "Delete this book".
  onDelete?: () => void;
}

interface Errors {
  title?: string;
  author?: string;
  price?: string;
  shelf?: string;
  pages?: string;
  read?: string;
}

// The LibraryBooks board's "Add a book" and the LibraryBook board's "Edit
// book": the name, the author, the price paid, the shelf and the status --
// with the page count, the pages read so far, the cover colour and a reading
// reminder the app has always kept.
export function BookFormDialog({ open, onClose, editing, shelves, startShelf, reminders, onSaved, onDelete }: BookFormDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [price, setPrice] = useState("");
  const [shelf, setShelf] = useState("other");
  const [newShelf, setNewShelf] = useState("");
  const [status, setStatus] = useState<BookStatus>("WANT_TO_READ");
  const [pages, setPages] = useState("");
  const [read, setRead] = useState("");
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const [reminder, setReminder] = useState(() => draftFromReminder("BOOK", null));
  const [errors, setErrors] = useState<Errors>({});
  const [isPending, startTransition] = useTransition();
  const newShelfRef = useRef<HTMLInputElement>(null);

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? `new-${startShelf ?? ""}`) : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setTitle(editing?.title ?? "");
      setAuthor(editing?.author ?? "");
      setPrice(editing?.price != null ? String(editing.price) : "");
      setShelf(editing ? shelfOf(editing.shelf, shelves).id : (startShelf ?? "other"));
      setNewShelf("");
      setStatus(editing?.status ?? "WANT_TO_READ");
      setPages(editing ? String(editing.totalPages) : "");
      setRead("");
      setPickedColor(editing?.color ?? null);
      setReminder(draftFromReminder("BOOK", null));
      setErrors({});
    }
  }

  const color = pickedColor ?? suggestColor(title.trim());
  const options = shelfList(shelves);
  const digits = (value: string) => latinDigits(value).replace(/\D/g, "").slice(0, 5);
  const clear = (field: keyof Errors) => errors[field] && setErrors((prev) => ({ ...prev, [field]: undefined }));

  function save() {
    if (isPending) return;
    const found: Errors = {};
    if (!title.trim()) found.title = t("Write the book name.");
    if (!author.trim()) found.author = t("Write the author name.");
    const parsedPrice = parsePrice(price);
    if ("problem" in parsedPrice) found.price = parsedPrice.problem === "big" ? t("That price looks too big.") : t("Write the price in numbers, like 360.");
    if (shelf === NEW_SHELF) {
      const problem = shelfNameProblem(newShelf, shelves, BUILT_IN_SHELVES.flatMap((s) => [s.name, t(s.name)]));
      if (problem) found.shelf = problem === "empty" ? t("Write a name for the shelf.") : t("A shelf with this name already exists.");
    }
    const total = Number(pages);
    if (!/^\d+$/.test(pages) || total < 1 || total > MAX_PAGES) found.pages = t("Enter a number from 1 to 20000.");
    else if (editing && editing.status === "READING" && status === "READING" && total < editing.pagesRead) found.pages = t("You've already read more pages than this.");
    const pagesRead = !editing && status === "READING" && read !== "" ? Number(read) : undefined;
    if (pagesRead !== undefined && !found.pages && pagesRead > total) found.read = t("That's more than the total pages.");
    setErrors(found);
    if (Object.keys(found).length || "problem" in parsedPrice) return;

    startTransition(async () => {
      let shelfKey = shelf;
      if (shelf === NEW_SHELF) {
        const made = await createBookShelfAction(newShelf.trim());
        if (!made.success || !made.data) {
          setErrors({ shelf: actionError(made.message, "Failed to make the shelf", t, fmt) });
          return;
        }
        shelfKey = made.data.id;
        // On the list from now on, whatever happens to the book.
        setShelf(shelfKey);
        router.refresh();
      }
      const details = { title: title.trim(), author: author.trim(), totalPages: total, color, price: parsedPrice.price, shelf: shelfKey };
      const result = editing
        ? await updateBookAction(editing.id, { ...details, ...(status !== editing.status ? { status } : {}) })
        : await createBookAction({ ...details, status, ...(pagesRead !== undefined ? { pagesRead } : {}) });
      if (!result.success || !result.data) {
        toast.error(actionError(result.message, "Failed to save book", t, fmt));
        return;
      }
      if (!editing && reminders?.available) {
        const saved = await reminders.saveDraft("BOOK", result.data.id, reminder);
        if (!saved.success) toast.error(t("Saved, but not its reminder. Open it again to set the reminder."));
      }
      const finishedNow = result.data.status === "FINISHED" && editing?.status !== "FINISHED";
      onClose();
      router.refresh();
      onSaved?.(result.data, { finishedNow, created: !editing });
    });
  }

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={480}
      className="rounded-[16px]"
      headClassName="items-center px-5.5 py-4.5"
      title={t(editing ? "Edit book" : "Add a book")}
      bodyClassName="gap-3.5 px-5.5 py-4.5"
      footerClassName="px-5.5"
      footer={
        <>
          {editing && onDelete && (
            <button type="button" onClick={onDelete} disabled={isPending} className="mr-auto h-9 rounded-[8px] px-2.5 text-[13.5px] font-semibold text-expense hover:bg-expense-soft">
              {t("Delete this book")}
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
        <label htmlFor="bf-title" className={LB_LABEL}>
          {t("Book name")} <span className="text-expense">*</span>
        </label>
        <input
          id="bf-title"
          value={title}
          maxLength={120}
          onChange={(event) => {
            setTitle(event.target.value);
            clear("title");
          }}
          placeholder={t("For example: Atomic Habits")}
          aria-invalid={!!errors.title || undefined}
          className={LB_FIELD}
        />
        {errors.title && <span className={LB_ERROR}>{errors.title}</span>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bf-author" className={LB_LABEL}>
          {t("Author")} <span className="text-expense">*</span>
        </label>
        <input
          id="bf-author"
          value={author}
          maxLength={80}
          onChange={(event) => {
            setAuthor(event.target.value);
            clear("author");
          }}
          placeholder={t("For example: James Clear")}
          aria-invalid={!!errors.author || undefined}
          className={LB_FIELD}
        />
        {errors.author && <span className={LB_ERROR}>{errors.author}</span>}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-3 max-sm:grid-cols-1">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bf-price" className={LB_LABEL}>
            {t("Price you paid ({sign})", { sign: takaSign(fmt) })} <span className="font-normal text-ink-muted">{t("(optional)")}</span>
          </label>
          <span className="relative block">
            <span aria-hidden="true" className="absolute top-2.75 left-3 text-[14px] text-ink-muted">
              {takaSign(fmt)}
            </span>
            <input
              id="bf-price"
              inputMode="decimal"
              value={price}
              onChange={(event) => {
                setPrice(event.target.value.slice(0, 16));
                clear("price");
              }}
              placeholder={t("Leave empty if you do not remember")}
              aria-invalid={!!errors.price || undefined}
              className={cn(LB_FIELD, "pl-8")}
            />
          </span>
          {errors.price && <span className={LB_ERROR}>{errors.price}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bf-pages" className={LB_LABEL}>
            {t("Total pages")} <span className="text-expense">*</span>
          </label>
          <input
            id="bf-pages"
            inputMode="numeric"
            value={pages}
            onChange={(event) => {
              setPages(digits(event.target.value));
              clear("pages");
            }}
            placeholder={t("e.g. 208")}
            aria-invalid={!!errors.pages || undefined}
            className={LB_FIELD}
          />
          {errors.pages && <span className={LB_ERROR}>{errors.pages}</span>}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bf-shelf" className={LB_LABEL}>
          {t("Shelf (category)")}
        </label>
        <select
          id="bf-shelf"
          value={shelf}
          onChange={(event) => {
            setShelf(event.target.value);
            clear("shelf");
            if (event.target.value === NEW_SHELF) requestAnimationFrame(() => newShelfRef.current?.focus());
          }}
          className={cn(LB_FIELD, "select-chevron cursor-pointer appearance-none pr-9")}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.own ? option.name : t(option.name)}
            </option>
          ))}
          <option value={NEW_SHELF}>{t("+ New shelf...")}</option>
        </select>
        {shelf === NEW_SHELF && (
          <input
            ref={newShelfRef}
            value={newShelf}
            maxLength={40}
            onChange={(event) => {
              setNewShelf(event.target.value);
              clear("shelf");
            }}
            placeholder={t("Shelf name, e.g. Poetry")}
            aria-label={t("New shelf")}
            aria-invalid={!!errors.shelf || undefined}
            className={LB_FIELD}
          />
        )}
        {errors.shelf && <span className={LB_ERROR}>{errors.shelf}</span>}
      </div>
      <div className="flex flex-col gap-1.5">
        <span id="bf-status" className={LB_LABEL}>
          {t("Status")}
        </span>
        <div role="radiogroup" aria-labelledby="bf-status" className="grid grid-cols-3 gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={status === option.value}
              onClick={() => setStatus(option.value)}
              className={cn("h-10 rounded-[8px] border-[1.5px] text-[14px] font-semibold", status === option.value ? "border-primary bg-emerald-soft text-emerald" : "border-input bg-surface text-ink-2 hover:bg-hover")}
            >
              {t(option.label)}
            </button>
          ))}
        </div>
        {editing && status !== editing.status && status === "WANT_TO_READ" && editing.pagesRead > 0 && <span className="text-[12.5px] text-warning">{t("Its page goes back to the start; the days you read stay in your history.")}</span>}
      </div>
      {!editing && status === "READING" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bf-read" className={LB_LABEL}>
            {t("Pages read so far")} <span className="font-normal text-ink-muted">{t("(optional)")}</span>
          </label>
          <input
            id="bf-read"
            inputMode="numeric"
            value={read}
            onChange={(event) => {
              setRead(digits(event.target.value));
              clear("read");
            }}
            placeholder={formatCount(0, fmt)}
            aria-invalid={!!errors.read || undefined}
            className={cn(LB_FIELD, "w-40")}
          />
          {errors.read && <span className={LB_ERROR}>{errors.read}</span>}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <span id="bf-color" className={LB_LABEL}>
          {t("Cover colour")}
        </span>
        <div role="radiogroup" aria-labelledby="bf-color" className="flex flex-wrap gap-2.5">
          {BOOK_PALETTE.map((option) => {
            const on = option.key === color;
            return (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={t(option.label)}
                title={t(option.label)}
                onClick={() => setPickedColor(option.key)}
                className="relative size-7 rounded-full after:absolute after:-inset-1"
                style={{ backgroundImage: `linear-gradient(135deg, ${option.from}, ${option.to})`, ...(on && { boxShadow: `0 0 0 2px var(--surface), 0 0 0 4px ${option.from}` }) }}
              />
            );
          })}
        </div>
      </div>
      {reminders && <ReminderSection kind="BOOK" targetKey={editing?.id ?? null} book={reminders} draft={reminder} onDraftChange={setReminder} description={t("A nudge to pick up the book and read.")} />}
    </PopupDialog>
  );
}
