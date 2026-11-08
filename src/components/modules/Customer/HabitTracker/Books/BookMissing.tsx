"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import PageFrame from "@/components/smartly/PageFrame";
import { MY_BOOKS_HREF } from "@/lib/customer/libraryBoard";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { LB_CARD, LB_PRIMARY } from "./LibraryBits";

// A book page whose book is gone (deleted, or never the reader's).
export function BookMissing() {
  const { t } = useLocale();
  return (
    <PageFrame className="min-h-[70dvh] gap-3.5 leading-[normal] md:pt-4 md:pb-5.5">
      <Link href={MY_BOOKS_HREF} className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-ink-soft hover:text-ink">
        <ChevronLeft className="size-4" strokeWidth={2.25} aria-hidden="true" />
        {t("All books")}
      </Link>
      <section className={cn(LB_CARD, "flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center")}>
        <span className="text-[17px] font-semibold text-ink">{t("This book is not in your list any more.")}</span>
        <Link href={MY_BOOKS_HREF} className={LB_PRIMARY}>
          {t("All books")}
        </Link>
      </section>
    </PageFrame>
  );
}
