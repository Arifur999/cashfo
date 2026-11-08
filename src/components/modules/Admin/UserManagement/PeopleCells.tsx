"use client";

import Link from "next/link";
import PlanChipCell from "@/components/shared/cell/PlanChipCell";
import { formatDate } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { UserOrigin } from "@/lib/navItem";
import { cn } from "@/lib/utils";
import { daysUsedLabel, type WorkspaceListFields, workspaceNamesLabel } from "./peopleDisplay";
import { usePersonHref } from "./usePersonHref";

// Cells of the people lists that need the reader's language and digits:
// the column definitions are plain data and can't call useLocale().

// The plan chip, with "Trial ends 4 Oct" under it while a free trial runs.
export const PlanCell = ({ plan, trialEndsAt }: { plan: string | null; trialEndsAt?: string | null }) => {
  const { t, locale } = useLocale();
  if (!trialEndsAt || !plan) return <PlanChipCell plan={plan} />;
  return (
    <span className="flex flex-col items-start gap-0.5">
      <PlanChipCell plan={plan} />
      <span className="text-[11.5px] leading-tight whitespace-nowrap text-warning">{t("Trial ends {date}", { date: formatDate(trialEndsAt, "d MMM", "—", locale) })}</span>
    </span>
  );
};

// "12 days" in the reader's digits; "Joined today" on the first day.
export const DaysUsedCell = ({ days }: { days: number }) => {
  const { t, locale } = useLocale();
  return <span className="text-ink-2 tabular-nums">{daysUsedLabel(days, t, locale)}</span>;
};

// A count in the reader's digits, with an optional sign ("+2").
export const CountCell = ({ value, prefix = "", className }: { value: number; prefix?: string; className?: string }) => {
  const { locale } = useLocale();
  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {formatCount(value, locale)}
    </span>
  );
};

// Every workspace a person owns, the personal one in the reader's words.
// The line is cut to the column, so the whole list is its tooltip.
export const WorkspaceNamesCell = ({ row }: { row: WorkspaceListFields }) => {
  const { t } = useLocale();
  const text = workspaceNamesLabel(row, t);
  return (
    <span className="truncate text-small text-ink-muted" title={text}>
      {text}
    </span>
  );
};

// The person's name as a real link to their page, so the row has a named,
// focusable way in besides the row click (which it doesn't trigger again).
// No prefetch: a 100-row page would fire 100 route prefetches at once.
export const PersonLinkCell = ({ userId, name, from }: { userId: string; name: string; from?: UserOrigin }) => {
  const personHref = usePersonHref(from);
  return (
    <Link
      href={personHref(userId)}
      prefetch={false}
      onClick={(event) => event.stopPropagation()}
      className="truncate font-semibold text-ink hover:underline"
    >
      {name}
    </Link>
  );
};
