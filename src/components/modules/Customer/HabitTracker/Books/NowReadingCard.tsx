"use client";

import { BookOpen, Flame } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import IconTile from "@/components/smartly/IconTile";
import type { Book } from "@/lib/customer/api";
import { formatDate } from "@/lib/customer/date";
import { daysToFinish, pagesLeft, progressPct, readingPace } from "@/lib/customer/libraryDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { paletteFor } from "./bookPalette";
import { Cover } from "./Cover";

interface NowReadingCardProps {
  book: Book | null;
  today: string;
  isPending: boolean;
  onUpdate: (book: Book, pagesRead: number) => void;
  onFinish: (book: Book) => void;
  onAdd: () => void;
}

// The book on the nightstand: where the reader is, how fast it is going,
// and a box to type the page they stopped at.
export function NowReadingCard({ book, today, isPending, onUpdate, onFinish, onAdd }: NowReadingCardProps) {
  const { t } = useLocale();
  const [page, setPage] = useState("");

  // A fresh box whenever another book takes the nightstand or its progress
  // changes, so it always starts at the page the reader is on.
  const key = book ? `${book.id}:${book.pagesRead}` : "none";
  const [prevKey, setPrevKey] = useState<string | null>(null);
  if (key !== prevKey) {
    setPrevKey(key);
    setPage(book ? String(book.pagesRead) : "");
  }

  if (!book) {
    return (
      <Card padding="none" className="flex flex-col items-center justify-center gap-3 px-6 py-8 text-center">
        <IconTile size={48} tone="habits">
          <BookOpen />
        </IconTile>
        <div className="flex flex-col gap-1">
          <span className="text-title font-semibold text-ink">{t("Nothing on the nightstand")}</span>
          <span className="text-small text-ink-muted">{t("Start one from your want-to-read shelf, or add a book.")}</span>
        </div>
        <Button variant="secondary" size="sm" onClick={onAdd}>
          {t("Add book")}
        </Button>
      </Card>
    );
  }

  const palette = paletteFor(book.color);
  const pct = progressPct(book);
  const left = pagesLeft(book);
  const pace = readingPace(book, today);
  const days = daysToFinish(book, today);
  const pageNumber = Number(page);
  const valid = /^\d+$/.test(page) && pageNumber <= book.totalPages;
  const subtitle = [book.author, book.startedAt ? `${t("started")} ${formatDate(book.startedAt, "d MMM")}` : ""].filter(Boolean).join(" · ");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    // The same page again is nothing to save.
    if (valid && book && pageNumber !== book.pagesRead) onUpdate(book, pageNumber);
  }

  return (
    <Card padding="none" className="grid gap-6 px-6 py-5 md:grid-cols-[112px_minmax(0,1fr)]">
      <Cover title={book.title} author={book.author} color={book.color} className="hidden md:flex" />
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col-reverse items-start gap-2 sm:flex-row sm:justify-between sm:gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-caption font-semibold text-ink-muted">{t("Now reading")}</span>
            <span className="line-clamp-2 text-h2 font-bold text-ink sm:truncate">{book.title}</span>
            {subtitle && <span className="text-body text-ink-2">{subtitle}</span>}
          </div>
          {pace !== null && (
            <Chip tone="income" className="h-7 gap-2 text-small font-semibold">
              <Flame className="size-4" aria-hidden="true" />
              {t("About")} {pace} {t("pages a day")}
            </Chip>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-small">
            <span className="font-semibold text-ink tabular-nums">
              {t("Page")} {book.pagesRead} {t("of")} {book.totalPages}
            </span>
            <span className="text-ink-muted">{pct}%</span>
          </div>
          <span role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${book.title}: ${t("read")}`} className="block h-2 overflow-hidden rounded-full bg-surface-sunken">
            <span className="block h-full rounded-full transition-[width]" style={{ width: `${pct}%`, background: palette.from }} />
          </span>
          <span className="text-small text-ink-muted">
            {left} {t("pages left.")}
            {days !== null && ` ${t("At about")} ${pace} ${t("pages a day, you'll finish in around")} ${days} ${t(days === 1 ? "day." : "days.")}`}
          </span>
        </div>

        <form onSubmit={submit} className="mt-auto flex flex-wrap items-end gap-3 border-t border-surface-sunken pt-3">
          <Field htmlFor="lib-page" label={<span className="text-small font-medium text-ink-2">{t("I'm now on page")}</span>} className="gap-1">
            <Input id="lib-page" size="sm" inputMode="numeric" value={page} onChange={(event) => setPage(event.target.value.replace(/\D/g, "").slice(0, 5))} aria-invalid={page !== "" && pageNumber > book.totalPages} className="text-body-lg font-semibold" frameClassName="w-27.5" />
          </Field>
          <Button type="submit" variant="action" size="sm" className="h-9.5" disabled={!valid || isPending}>
            {t("Update")}
          </Button>
          <span className="flex-1 basis-40 text-small leading-[1.45] text-ink-muted">{t("Type the page you stopped at and the bar follows.")}</span>
          <Button type="button" variant="secondary" size="sm" className="h-9.5" onClick={() => onFinish(book)} disabled={isPending}>
            {t("Mark as finished")}
          </Button>
        </form>
      </div>
    </Card>
  );
}
