"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface CustomerErrorProps {
  error: Error & { digest?: string };
  // Next 16.3+: re-renders the segment and re-fetches its data.
  retry: () => void;
}

// A customer page couldn't load -- most often the API was unreachable (see
// lib/customer/readFallback.ts). The sidebar and top bar stay up; only the
// content area is replaced.
export default function CustomerError({ error, retry }: CustomerErrorProps) {
  const { t } = useLocale();

  return (
    <div className="flex h-full items-center justify-center bg-brand-content px-6 py-16">
      <div className="w-full max-w-md rounded-2xl bg-surface p-8 text-center shadow-sm shadow-black/5">
        <AlertTriangle className="mx-auto h-10 w-10 text-brand-danger" aria-hidden="true" />
        <h1 className="mt-4 text-lg font-semibold text-neutral-900">{t("Something went wrong")}</h1>
        <p className="mt-2 text-sm text-neutral-500">{t("We couldn't load this page. Check your connection and try again.")}</p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-neutral-400">
            {t("Reference:")} {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t("Try again")}
        </button>
      </div>
    </div>
  );
}
