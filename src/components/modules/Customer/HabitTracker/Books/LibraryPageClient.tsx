"use client";

import { Library, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import EmptyState from "@/components/smartly/EmptyState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { Book, BookStatus, BooksOverview } from "@/lib/customer/api";
import { deleteBookAction, updateBookAction } from "@/lib/customer/bookActions";
import { applyProgress, nowReading, shelves } from "@/lib/customer/libraryDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { BookDrawer } from "./BookDrawer";
import { GoalDialog } from "./GoalDialog";
import { NowReadingCard } from "./NowReadingCard";
import { ProgressDialog } from "./ProgressDialog";
import { ReadingGoalCard } from "./ReadingGoalCard";
import { ShelvesCard, type ShelfAction } from "./ShelvesCard";

interface LibraryPageClientProps {
  overview: BooksOverview;
  today: string;
}

// Habits › My library: the book on the nightstand, this year's goal and the
// three shelves.
export function LibraryPageClient({ overview, today }: LibraryPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const { year, goalTarget } = overview;

  // Server props stay the source of truth; a page update is layered on top
  // optimistically and gives way once the PATCH and refresh land.
  const [books, applyOptimisticProgress] = useOptimistic(overview.books, (current, update: { id: string; pagesRead: number }) => current.map((book) => (book.id === update.id ? applyProgress(book, update.pagesRead, year) : book)));
  const [isProgressPending, startProgress] = useTransition();
  const [isPending, startTransition] = useTransition();

  const [drawer, setDrawer] = useState<{ open: boolean; editing: Book | null }>({ open: false, editing: null });
  const [goalOpen, setGoalOpen] = useState(false);
  const [progressId, setProgressId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Book | null>(null);

  const byShelf = shelves(books);
  const featured = nowReading(books);
  const progressBook = books.find((book) => book.id === progressId) ?? null;

  function setProgress(book: Book, requested: number) {
    // Never more pages than the book has; the server rejects that.
    const pagesRead = Math.min(Math.max(0, requested), book.totalPages);
    startProgress(async () => {
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

  function remove() {
    if (!removing) return;
    const target = removing;
    startTransition(async () => {
      const result = await deleteBookAction(target.id);
      if (result.success) {
        toast.success(t("Book removed"));
        setRemoving(null);
      } else {
        toast.error(result.message ?? t("Failed to remove book"));
      }
      router.refresh();
    });
  }

  const openAdd = () => setDrawer({ open: true, editing: null });

  function onAction(book: Book, action: ShelfAction) {
    if (action === "progress") setProgressId(book.id);
    else if (action === "finish") setProgress(book, book.totalPages);
    else if (action === "start" || action === "again") changeStatus(book, "READING", "Started. Happy reading!");
    else if (action === "edit") setDrawer({ open: true, editing: book });
    else setRemoving(book);
  }

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={t("Habits")}
        tone="habits"
        title={t("My library")}
        description={t("Books you're reading, want to read and have finished.")}
        actions={
          <Button onClick={openAdd}>
            <Plus strokeWidth={2.25} />
            {t("Add book")}
          </Button>
        }
      />

      {books.length === 0 ? (
        <EmptyState icon={<Library />} tone="habits" title={t("Your shelf is empty, for now")} description={t("Add the book you want to read next. It takes ten seconds.")} action={<Button onClick={openAdd}>{t("Add book")}</Button>} />
      ) : (
        <>
          <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <NowReadingCard book={featured} today={today} isPending={isProgressPending || isPending} onUpdate={setProgress} onFinish={(book) => setProgress(book, book.totalPages)} onAdd={openAdd} />
            <ReadingGoalCard books={books} year={year} goalTarget={goalTarget} today={today} onEdit={() => setGoalOpen(true)} />
          </div>
          <ShelvesCard shelves={byShelf} onAction={onAction} />
        </>
      )}

      <BookDrawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, editing: null })}
        editing={drawer.editing}
        onRemove={(book) => {
          setDrawer({ open: false, editing: null });
          setRemoving(book);
        }}
      />
      <GoalDialog open={goalOpen} onClose={() => setGoalOpen(false)} year={year} current={goalTarget} />
      <ProgressDialog
        book={progressBook}
        onClose={() => setProgressId(null)}
        onSave={(book, pagesRead) => {
          setProgressId(null);
          setProgress(book, pagesRead);
        }}
      />
      <ConfirmDialog open={removing !== null} onClose={() => setRemoving(null)} onConfirm={remove} isPending={isPending} danger title={t("Remove book")} description={removing ? `${t("Remove")} "${removing.title}"? ${t("Your progress on it will be lost.")}` : ""} confirmLabel={t("Remove")} />
    </PageFrame>
  );
}
