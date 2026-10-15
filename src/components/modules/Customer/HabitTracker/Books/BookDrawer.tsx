"use client";

import { Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Book, BookStatus } from "@/lib/customer/api";
import { createBookAction, updateBookAction } from "@/lib/customer/bookActions";
import { SHELF_LABEL } from "@/lib/customer/libraryDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BOOK_PALETTE, suggestColor } from "./bookPalette";
import { Cover } from "./Cover";

interface BookDrawerProps {
  open: boolean;
  onClose: () => void;
  // The book being edited; null adds a new one.
  editing: Book | null;
  onRemove: (book: Book) => void;
}

const SHELF_OPTIONS: BookStatus[] = ["WANT_TO_READ", "READING", "FINISHED"];
const MAX_PAGES = 20000;

// Add or edit a book: title, author, how many pages, which shelf it starts
// on, and the cover colour.
export function BookDrawer({ open, onClose, editing, onRemove }: BookDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [status, setStatus] = useState<BookStatus>("WANT_TO_READ");
  const [pagesRead, setPagesRead] = useState("");
  // Until the reader picks a colour, a new book takes one from its title.
  const [pickedColor, setPickedColor] = useState<string | null>(null);
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
  const digits = (value: string) => value.replace(/\D/g, "").slice(0, 5);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const details = { title: title.trim(), author: author.trim(), totalPages: total, color };
      const result = editing ? await updateBookAction(editing.id, details) : await createBookAction({ ...details, status, ...(status === "READING" ? { pagesRead: Number(pagesRead || 0) } : {}) });
      if (result.success) {
        toast.success(t(editing ? "Book updated" : "Book added"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to save book"));
      }
    });
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text}
      {optional && <span className="font-normal text-ink-muted"> ({t("Optional")})</span>}
    </span>
  );

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-120 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] data-[side=right]:sm:max-w-120" : "h-[92vh] rounded-t-xl")}>
        <SheetHeader className={cn("flex-row items-start justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <div className="flex flex-col gap-0.5">
            <SheetTitle className="text-h3 text-ink">{editing ? t("Edit book") : t("Add a book")}</SheetTitle>
            <span className="text-small text-ink-muted">{t("Title, author and how many pages. The cover colour is yours to pick.")}</span>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
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
                <legend className="mb-2 text-body font-medium text-ink">{t("Shelf")}</legend>
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
                <legend className="mb-2 text-body font-medium text-ink">{t("Cover colour")}</legend>
                <div role="radiogroup" aria-label={t("Cover colour")} className="grid grid-cols-[repeat(5,28px)] gap-x-3 gap-y-2">
                  {BOOK_PALETTE.map((option) => {
                    const on = option.key === color;
                    return (
                      <button key={option.key} type="button" role="radio" aria-checked={on} aria-label={t(option.label)} title={t(option.label)} onClick={() => setPickedColor(option.key)} className="size-7 rounded-full transition-shadow" style={{ backgroundImage: `linear-gradient(135deg, ${option.from}, ${option.to})`, ...(on && { boxShadow: `0 0 0 2px var(--surface), 0 0 0 4px ${option.from}` }) }} />
                    );
                  })}
                </div>
              </div>
            </fieldset>
          </div>

          <div className={cn("flex items-center gap-3 border-t border-line bg-cream", wide ? "px-6 py-4" : "px-4 py-3")}>
            {editing && (
              <Button type="button" variant="ghost" className="text-expense hover:bg-expense-soft hover:text-expense" onClick={() => onRemove(editing)} disabled={isPending}>
                <Trash2 />
                {t("Remove")}
              </Button>
            )}
            <div className="ml-auto flex items-center gap-3">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={!valid || isPending} className="px-5">
                {isPending && <Loader />}
                {t(editing ? "Save" : "Add book")}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
