"use client";

import { Flame } from "lucide-react";
import Link from "next/link";
import Card from "@/components/smartly/Card";
import type { Book } from "@/lib/customer/api";
import { pagesLeft, progressPct, readingPace } from "@/lib/customer/libraryDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { paletteFor } from "../Books/bookPalette";
import { Cover } from "../Books/Cover";

interface ReadingCardProps {
  book: Book | null;
  today: string;
}

// The book on the nightstand, in brief.
export function ReadingCard({ book, today }: ReadingCardProps) {
  const { t } = useLocale();
  const pace = book ? readingPace(book, today) : null;
  const pct = book ? progressPct(book) : 0;

  return (
    <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
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
              <span role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${book.title}: ${t("read")}`} className="mt-0.75 block h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: paletteFor(book.color).from }} />
              </span>
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-surface-sunken pt-3 text-small whitespace-nowrap">
            <span className="flex items-center gap-1 font-semibold text-ink">
              {pace !== null && (
                <>
                  <Flame className="size-4 text-warning" aria-hidden="true" />
                  {pace} {t("pages a day")}
                </>
              )}
            </span>
            <span className="font-semibold text-income">
              {pagesLeft(book)} {t("pages left")}
            </span>
          </div>
        </>
      ) : (
        <span className="py-3 text-small text-ink-muted">{t("Nothing on the nightstand. Pick a book from your library.")}</span>
      )}
    </Card>
  );
}
