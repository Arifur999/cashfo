"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

// Shown when the library couldn't be fetched -- never an empty library, which
// would look like "all my books are gone".
export function BooksLoadError() {
  const { t } = useLocale();
  return (
    <div className="px-6 py-8">
      <p className="rounded-2xl border border-line bg-surface px-6 py-10 text-center text-sm text-ink-muted shadow-card">
        {t("We couldn't load your library. Please refresh the page.")}
      </p>
    </div>
  );
}
