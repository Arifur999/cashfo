"use client";

import { Flame, Gauge } from "lucide-react";
import Link from "next/link";
import Card from "@/components/smartly/Card";
import type { Book } from "@/lib/customer/api";
import { pageOfText, pagesLeft, progressPct, readingPace } from "@/lib/customer/libraryDisplay";
import { formatCount } from "@/lib/i18n/digits";
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

const LIBRARY = "/habit-tracker/habits?category=Book";

// The book on the nightstand, in brief, with the reading streak and today's
// pages; phones get the board's single row, which opens the library.
export function ReadingCard({ book, streak, pagesToday, today }: ReadingCardProps) {
  const { t, fmt } = useLocale();
  const pace = book ? readingPace(book, today) : null;
  const pct = book ? progressPct(book) : 0;
  const count = (n: number) => formatCount(n, fmt);

  const bar = book && (
    <span role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${book.title}: ${t("read")}`} className="block h-1.5 overflow-hidden rounded-full bg-surface-sunken">
      <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: paletteFor(book.color).from }} />
    </span>
  );

  return (
    <>
      {book && (
        <Card asChild padding="none" interactive className="flex items-center gap-3 rounded-md p-3.5 md:hidden">
          <Link href={LIBRARY}>
            <Cover size="thumb" title={book.title} color={book.color} />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-body leading-[normal] font-semibold text-ink">{book.title}</span>
              <span className="text-caption leading-[normal] font-normal text-ink-muted tabular-nums">
                {pageOfText(book, t, fmt)}
                {pagesToday > 0 ? ` · ${t("{count} pages today", { count: count(pagesToday) })}` : pace !== null && ` · ${t("{count} pages a day", { count: count(pace) })}`}
              </span>
              {bar}
            </span>
            {streak > 0 && (
              <span className="flex shrink-0 items-center gap-1 text-small font-bold text-ink tabular-nums" aria-label={t("{count}-day streak", { count: count(streak) })}>
                <Flame className="size-3.5 text-orange-fill" aria-hidden="true" />
                {count(streak)}
              </span>
            )}
          </Link>
        </Card>
      )}
      <Card padding="none" className={cn("flex flex-col gap-3 rounded-md px-4.5 py-4", book && "max-md:hidden")}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] leading-[normal] font-semibold text-ink">{t("Now reading")}</h2>
          <Link href={LIBRARY} className="flex items-center text-small font-semibold text-emerald hover:underline max-md:min-h-11">
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
                  {pageOfText(book, t, fmt)} · {count(pct)}%
                </span>
                <span className="mt-0.75">{bar}</span>
              </div>
            </div>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-divider pt-2.5 text-[12.5px] leading-[normal]">
              <span className="flex items-center gap-1 font-semibold text-ink">
                {streak > 0 ? (
                  <>
                    <Flame className="size-3.25 text-orange-fill" aria-hidden="true" />
                    {t("{count}-day streak", { count: count(streak) })}
                  </>
                ) : (
                  pace !== null && (
                    <>
                      <Gauge className="size-4 text-ink-muted" aria-hidden="true" />
                      {t("{count} pages a day", { count: count(pace) })}
                    </>
                  )
                )}
              </span>
              <span className="font-semibold text-income">{pagesToday > 0 ? t("{count} pages today", { count: count(pagesToday) }) : t("{count} pages left", { count: count(pagesLeft(book)) })}</span>
            </div>
          </>
        ) : (
          <span className="py-3 text-small text-ink-muted">{t("Nothing on the nightstand. Pick a book from your library.")}</span>
        )}
      </Card>
    </>
  );
}
