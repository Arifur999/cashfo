"use client";

import Card from "@/components/smartly/Card";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const bar = "block animate-pulse rounded-sm bg-[linear-gradient(90deg,var(--surface-sunken)_0%,var(--strip)_50%,var(--surface-sunken)_100%)] motion-reduce:animate-none";

// Where net worth will be, the card's own shape, while its reads finish.
export function NetWorthSkeleton() {
  const { t } = useLocale();
  return (
    <Card padding="none" role="status" aria-label={t("Loading")} className="grid items-center gap-2 p-4 max-md:shadow-none md:grid-cols-[300px_minmax(0,1fr)] md:gap-8 md:p-6">
      <span className="flex flex-col gap-2 md:gap-3">
        <span className={cn(bar, "h-3 w-28")} />
        <span className={cn(bar, "h-8 w-44 md:h-10 md:w-56")} />
        <span className={cn(bar, "h-2.5 w-56 max-w-full")} />
      </span>
      <span className="hidden grid-cols-[repeat(auto-fit,minmax(128px,1fr))] gap-3 md:grid">
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} className={cn(bar, "h-15 rounded-md")} />
        ))}
      </span>
    </Card>
  );
}
