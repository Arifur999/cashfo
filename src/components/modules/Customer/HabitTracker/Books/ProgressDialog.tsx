"use client";

import { X } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Book } from "@/lib/customer/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface ProgressDialogProps {
  // The book whose page is being updated; null keeps the dialog closed.
  book: Book | null;
  onClose: () => void;
  onSave: (book: Book, pagesRead: number) => void;
}

// "Which page are you on?" for a book that is not on the nightstand.
export function ProgressDialog({ book, onClose, onSave }: ProgressDialogProps) {
  const { t } = useLocale();
  const [page, setPage] = useState("");

  const [prevId, setPrevId] = useState<string | null>(null);
  const id = book?.id ?? null;
  if (id !== prevId) {
    setPrevId(id);
    setPage(book ? String(book.pagesRead) : "");
  }

  const pageNumber = Number(page);
  const valid = book !== null && /^\d+$/.test(page) && pageNumber <= book.totalPages;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (valid && book) onSave(book, pageNumber);
  }

  return (
    <AlertDialog open={book !== null} onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent className="w-100 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
            <AlertDialogTitle className="text-h3 text-ink">{t("Which page are you on?")}</AlertDialogTitle>
            <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
          <AlertDialogDescription className="px-6 pt-4 text-small text-ink-muted">{book ? `${book.title} · ${book.totalPages} ${t("pages")}` : ""}</AlertDialogDescription>
          <div className="px-6 py-4">
            <Field htmlFor="bk-progress" label={<span className="text-body font-medium text-ink">{t("I'm now on page")}</span>} error={page !== "" && !valid ? t("That's more than the total pages.") : undefined}>
              <Input id="bk-progress" size="lg" inputMode="numeric" autoFocus value={page} onChange={(event) => setPage(event.target.value.replace(/\D/g, "").slice(0, 5))} invalid={page !== "" && !valid} className="text-body-lg font-semibold" frameClassName="w-40" />
            </Field>
          </div>
          <div className="flex items-center gap-3 border-t border-line bg-cream px-6 py-4">
            <Button type="button" variant="ghost" onClick={() => book && onSave(book, book.totalPages)}>
              {t("Mark as finished")}
            </Button>
            <div className="ml-auto flex items-center gap-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={!valid} className="px-5">
                {t("Save")}
              </Button>
            </div>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
