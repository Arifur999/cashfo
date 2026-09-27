"use client";

import { Plus } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { BookCover } from "./BookCover";
import { BOOK_CARD, BOOK_CTA } from "./bookTheme";
import { SERIF_STACK } from "./fonts";

// A first-time reader's page: three covers leaning on each other and a nudge
// to add the first book.
export function EmptyLibrary({ onAdd }: { onAdd: () => void }) {
  const { t } = useLocale();
  return (
    <div className={`${BOOK_CARD} flex flex-col items-center px-6 py-14 text-center`}>
      <div aria-hidden className="relative mb-8 h-48 w-80">
        <div className="absolute bottom-0 left-2 w-24 -rotate-6">
          <BookCover title={t("Chapter One")} color="oxblood" className="w-full" />
        </div>
        <div className="absolute bottom-2 left-1/2 z-10 w-28 -translate-x-1/2">
          <BookCover title={t("Once upon a time")} color="forest" className="w-full" />
        </div>
        <div className="absolute bottom-0 right-2 w-24 rotate-6">
          <BookCover title={t("The Next Page")} color="mustard" className="w-full" />
        </div>
      </div>
      <h2 className="text-2xl font-semibold text-neutral-900" style={{ fontFamily: SERIF_STACK }}>
        {t("Your shelf is empty -- for now")}
      </h2>
      <p className="mt-2 max-w-md text-sm text-neutral-500">{t("Add the book you want to read next. It takes ten seconds.")}</p>
      <button type="button" onClick={onAdd} className={`${BOOK_CTA} mt-6`}>
        <Plus className="h-4 w-4" /> {t("Add Book")}
      </button>
    </div>
  );
}
