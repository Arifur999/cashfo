"use client";

import { Flame } from "lucide-react";
import Link from "next/link";
import Card from "@/components/smartly/Card";
import type { Book } from "@/lib/customer/api";
import { pagesLeft, progressPct, readingPace } from "@/lib/customer/libraryDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { paletteFor } from "../Books/bookPalette";
import { Cover } from "../Books/Cover";

interface ReadingCardProps {
  book: Book | null;
  // Days in a row with pages read, and the pages read in the book today.
  streak: number;
  pagesToday: number;
  today: string;
}

// The book on the nightstand, in brief, with the reading streak and today's
// pages; phones get the board's single row.
export function ReadingCard({ book, streak, pagesToday, today }: ReadingCardProps) {
  const { t } = useLocale();
  const pace = book ? readingPace(book, today) : null;
  const pct = book ? progressPct(book) : 0;

  const bar = book && (
    <span role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${book.title}: ${t("read")}`} className="block h-1.5 overflow-hidden rounded-full bg-surface-sunken">
      <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: paletteFor(book.color).from }} />
    </span>
  );

  return (
    <>
      {book && (
        <Card padding="none" className="flex items-center gap-3 p-4 md:hidden">
          <Cover size="thumb" title={book.title} color={book.color} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="truncate text-body leading-[normal] font-semibold text-ink">{book.title}</h2>
            <span className="text-caption leading-[normal] font-normal text-ink-muted tabular-nums">
              {t("Page")} {book.pagesRead} {t("of")} {book.totalPages}
              {pagesToday > 0 ? ` · ${t("{count} pages today", { count: pagesToday })}` : pace !== null && ` · ${pace} ${t("pages a day")}`}
            </span>
            {bar}
          </div>
          {streak > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-small font-bold text-ink tabular-nums" aria-label={t("{count}-day streak", { count: streak })}>
              <Flame className="size-4 text-warning" aria-hidden="true" />
              {streak}
            </span>
          )}
        </Card>
      )}
      <Card padding="none" className={cn("flex flex-col gap-3 px-5 py-4", book && "max-md:hidden")}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-title font-semibold text-ink">{t("Now reading")}</h2>
          <Link href="/habit-tracker/habits?category=Book" className="text-small font-semibold text-emerald hover:underline">
            {t("Library")}
          </Link>
        </div>
        {book ? (
          <>
            <div className="flex gap-3">
              <Cover size="mini" title={book.title} color={book.color} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.75">
                <span className="truncate text-body font-semibold text-ink">{book.title}</span>
                {book.author && <span className="truncate text-small text-ink-muted">{book.author}</span>}
                <span className="text-small text-ink-2 tabular-nums">
                  {t("Page")} {book.pagesRead} {t("of")} {book.totalPages} · {pct}%
                </span>
                <span className="mt-0.75">{bar}</span>
              </div>
            </div>
            <div className="mt-auto flex items-center justify-between gap-3 border-t border-divider pt-3 text-small whitespace-nowrap">
              <span className="flex items-center gap-1 font-semibold text-ink">
                {streak > 0 ? (
                  <>
                    <Flame className="size-4 text-warning" aria-hidden="true" />
                    {t("{count}-day streak", { count: streak })}
                  </>
                ) : (
                  pace !== null && (
                    <>
                      <Flame className="size-4 text-warning" aria-hidden="true" />
                      {pace} {t("pages a day")}
                    </>
                  )
                )}
              </span>
              <span className="font-semibold text-income">{pagesToday > 0 ? t("{count} pages today", { count: pagesToday }) : `${pagesLeft(book)} ${t("pages left")}`}</span>
            </div>
          </>
        ) : (
          <span className="py-3 text-small text-ink-muted">{t("Nothing on the nightstand. Pick a book from your library.")}</span>
        )}
      </Card>
    </>
  );
}
