"use client";

import { catchError, type ErrorInfo } from "next/error";
import ErrorState from "@/components/smartly/ErrorState";
import { useLocale } from "@/lib/i18n/LocaleProvider";

function NetWorthError({ onRetry }: { onRetry: () => void }) {
  const { t } = useLocale();
  return <ErrorState title={t("Net worth couldn't load")} description={t("The rest of the page is up to date. Try again in a moment.")} onRetry={onRetry} />;
}

// Net worth's own error screen: a failed wallets, savings, assets or loans
// read says so in its card and leaves the rest of Insights standing. retry()
// renders the route again in a transition; redirect() still gets through.
// (The loans note needs no boundary: it catches its own failure on the
// server, in InsightsNetWorth.tsx.)
export const NetWorthBoundary = catchError((_props: object, { retry }: ErrorInfo) => <NetWorthError onRetry={retry} />);
