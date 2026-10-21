"use client";

import Link from "next/link";
import ErrorState from "@/components/smartly/ErrorState";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface LoadErrorProps {
  // "Couldn't load payments", in English: translated here.
  title: string;
  onRetry: () => void;
  // The list without its filters, offered while any are set: a filter the
  // server refuses (an old link's value) would fail every retry.
  clearHref?: string;
  className?: string;
}

// What a money list, board or row of figures shows when its read failed (a
// 5xx, a timeout, no network): that it failed -- never "No payments yet" or
// a row of zeros -- and a way to try again.
const LoadError = ({ title, onRetry, clearHref, className }: LoadErrorProps) => {
  const { t } = useLocale();
  return (
    <ErrorState
      title={t(title)}
      description={
        <>
          {t("The server didn't answer. Nothing was changed.")}
          {clearHref && (
            <>
              {" "}
              <Link href={clearHref} className="font-semibold text-emerald hover:underline">
                {t("Clear filters")}
              </Link>
            </>
          )}
        </>
      }
      onRetry={onRetry}
      className={className}
    />
  );
};

export default LoadError;
