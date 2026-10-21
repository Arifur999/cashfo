"use client";

import Link from "next/link";
import Chip from "@/components/smartly/Chip";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { UserOrigin } from "@/lib/navItem";
import { cn } from "@/lib/utils";
import { daysUsedLabel, moreWorkspacesLabel, type OwnWorkspaceFields, ownWorkspaceLabel, type WorkspaceListFields, workspaceNamesLabel } from "./peopleDisplay";
import { usePersonHref } from "./usePersonHref";

// Cells of the people lists that need the reader's language and digits:
// the column definitions are plain data and can't call useLocale().

interface OwnWorkspaceCellProps {
  // The row's own workspace: its name and, from newer responses, its kind.
  workspace: OwnWorkspaceFields;
  // How many workspaces they own in all; more than one adds a "+2" chip.
  count?: number;
  // Owners names it in full: it is the workspace Reset data wipes.
  long?: boolean;
}

// The person's own workspace (the personal one, in the reader's words) and,
// beside it, how many more they have.
export const OwnWorkspaceCell = ({ workspace, count = 1, long = false }: OwnWorkspaceCellProps) => {
  const { t, locale } = useLocale();
  const label = ownWorkspaceLabel(workspace, t, long ? "Personal workspace" : "Personal");
  const extra = count - 1;
  const more = label && extra > 0 ? moreWorkspacesLabel(extra, t, locale) : null;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className={label ? "truncate text-ink-2" : "text-ink-muted"}>{label ?? "—"}</span>
      {more && (
        <Chip tone="neutral" size="sm" title={more}>
          <span aria-hidden="true">+{formatCount(extra, locale)}</span>
          <span className="sr-only">{more}</span>
        </Chip>
      )}
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
