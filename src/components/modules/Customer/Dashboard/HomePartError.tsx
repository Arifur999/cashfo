"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/smartly/Button";
import ErrorState from "@/components/smartly/ErrorState";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// What a part of Home shows when its read failed (an outage, a timeout,
// the throttle): it couldn't load, nothing was lost, and Try again reads
// the page afresh. The rest of Home stays up around it. `compact` is one
// line and a text button, for a small card (the phone's half-width ones,
// the money cards) that the full panel would spill out of or tower over.
export function HomePartError({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { t } = useLocale();
  const router = useRouter();

  if (compact) {
    return (
      <div className={cn("flex flex-col items-start gap-2", className)}>
        <p className="text-small text-ink-muted">{t("Couldn't load this part right now.")}</p>
        {/* A 44px target in a line's room, that wraps rather than run past a narrow card's edge. */}
        <Button variant="link" size="sm" onClick={() => router.refresh()} className="-my-3 h-auto min-h-11 px-0 text-left whitespace-normal">
          {t("Try again")}
        </Button>
      </div>
    );
  }

  return <ErrorState title={t("Couldn't load this part right now")} onRetry={() => router.refresh()} bordered={false} className={cn("p-4", className)} />;
}
