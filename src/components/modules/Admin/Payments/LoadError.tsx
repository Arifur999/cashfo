"use client";

import Link from "next/link";
import Button from "@/components/smartly/Button";
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
// a row of zeros -- and a way to try again, with Clear filters beside it.
const LoadError = ({ title, onRetry, clearHref, className }: LoadErrorProps) => {
  const { t } = useLocale();
  return (
    <ErrorState
      title={t(title)}
      description={t("The server didn't answer. Nothing was changed.")}
      onRetry={onRetry}
      secondaryAction={
        clearHref && (
          <Button asChild variant="secondary">
            <Link href={clearHref}>{t("Clear filters")}</Link>
          </Button>
        )
      }
      className={className}
    />
  );
};

export default LoadError;
