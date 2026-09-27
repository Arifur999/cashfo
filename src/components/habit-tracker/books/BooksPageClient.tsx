"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { Book, BookStatus, BooksOverview } from "@/lib/api";
import { deleteBookAction, updateBookAction } from "@/lib/bookActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { applyProgress, libraryStats } from "./bookMath";
import { BookFormModal } from "./BookFormModal";
import { BookHero } from "./BookHero";
import { BookLibrary } from "./BookLibrary";
import { BookStats } from "./BookStats";
import { CurrentlyReading } from "./CurrentlyReading";
import { EmptyLibrary } from "./EmptyLibrary";
import { GoalModal } from "./GoalModal";
import { ProgressModal } from "./ProgressModal";

// Habits -> Book: the reader's first page -- a banner with the quote of the
// day, the year's goal and numbers, what's being read right now, and every
// book below.
export function BooksPageClient({ overview, quoteDay }: { overview: BooksOverview; quoteDay: number }) {
  const router = useRouter();
  const { t } = useLocale();
  const { year, goalTarget } = overview;

  // Server props stay the source of truth; a progress change is layered on top
  // optimistically and disappears once the transition (PATCH + refresh) ends.
  const [books, applyOptimisticProgress] = useOptimistic(overview.books, (current, update: { id: string; pagesRead: number }) =>
    current.map((book) => (book.id === update.id ? applyProgress(book, update.pagesRead, year) : book)),
  );
  const [, startProgressTransition] = useTransition();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<{ book: Book | null } | null>(null); // null = closed; book null = adding
  const [progressId, setProgressId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);

  const reading = books.filter((b) => b.status === "READING");
  const wantToRead = books.filter((b) => b.status === "WANT_TO_READ");
  const stats = libraryStats(books, year);
  const progressBook = books.find((b) => b.id === progressId) ?? null;

  function setProgress(book: Book, requestedPages: number) {
    // "+10" on a book with 4 pages left means "finish it" -- never more pages
    // than the book has (the server rejects that).
    const pagesRead = Math.min(Math.max(0, requestedPages), book.totalPages);
    startProgressTransition(async () => {
      applyOptimisticProgress({ id: book.id, pagesRead });
      const result = await updateBookAction(book.id, { pagesRead });
      if (!result.success) toast.error(result.message ?? t("Failed to update"));
      else if (result.data?.status === "FINISHED" && book.status !== "FINISHED") toast.success(t("Finished! Well done."));
      router.refresh();
    });
  }

  function changeStatus(book: Book, status: BookStatus, successMessage: string) {
    startTransition(async () => {
      const result = await updateBookAction(book.id, { status });
      if (result.success) toast.success(t(successMessage));
      else toast.error(result.message ?? t("Failed to update"));
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      const result = await deleteBookAction(target.id);
      if (result.success) {
        toast.success(t("Book removed"));
        setDeleteTarget(null);
      } else {
        toast.error(result.message ?? t("Failed to remove book"));
      }
      router.refresh();
    });
  }

  const openAdd = () => setForm({ book: null });
  const openEdit = (book: Book) => setForm({ book });
  const start = (book: Book) => changeStatus(book, "READING", "Started -- happy reading!");
  const readAgain = (book: Book) => changeStatus(book, "READING", "Started -- happy reading!");

  return (
    <div className="space-y-6 px-6 py-8 pb-24 md:pb-8">
      <BookHero quoteDay={quoteDay} onAdd={openAdd} />

      {books.length === 0 ? (
        <EmptyLibrary onAdd={openAdd} />
      ) : (
        <>
          <BookStats stats={stats} year={year} goalTarget={goalTarget} onEditGoal={() => setGoalOpen(true)} />
          <CurrentlyReading
            reading={reading}
            wantToRead={wantToRead}
            onQuickAdd={(book, delta) => setProgress(book, book.pagesRead + delta)}
            onUpdate={(book) => setProgressId(book.id)}
            onFinish={(book) => setProgress(book, book.totalPages)}
            onStart={start}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onAdd={openAdd}
          />
          <BookLibrary books={books} onStart={start} onUpdate={(book) => setProgressId(book.id)} onReadAgain={readAgain} onEdit={openEdit} onDelete={setDeleteTarget} />
        </>
      )}

      <BookFormModal open={form !== null} onClose={() => setForm(null)} book={form?.book ?? null} />
      <ProgressModal
        book={progressBook}
        onClose={() => setProgressId(null)}
        onSave={(book, pagesRead) => {
          setProgressId(null);
          setProgress(book, pagesRead);
        }}
      />
      <GoalModal open={goalOpen} onClose={() => setGoalOpen(false)} year={year} current={goalTarget} />
      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isPending={isPending}
        title={t("Remove book")}
        message={deleteTarget ? `${t("Remove")} "${deleteTarget.title}"? ${t("Your progress on it will be lost.")}` : ""}
        confirmLabel={t("Remove")}
      />
    </div>
  );
}
