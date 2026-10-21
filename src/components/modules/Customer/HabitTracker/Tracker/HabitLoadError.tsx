"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import ErrorState from "@/components/smartly/ErrorState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface HabitLoadErrorProps {
  // The page's own name, as the menu says it ("My library").
  title: string;
  // What could not be read, as one sentence.
  message: string;
}

// A habit page whose data could not be read: still the page, under its own
// heading, saying so with a way to try again -- never an empty shelf, which
// would look like "all my books are gone".
export function HabitLoadError({ title, message }: HabitLoadErrorProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <PageFrame className="gap-5">
      <PageHeader eyebrow={t("Habits")} tone="habits" title={t(title)} />
      <ErrorState title={t(message)} onRetry={isPending ? undefined : () => startTransition(() => router.refresh())} />
    </PageFrame>
  );
}
