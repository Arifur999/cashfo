import type { ColumnDef } from "@tanstack/react-table";
import { formatDateTime, formatTimeRange } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { attemptOutcome, type LoginAttemptGroup } from "@/lib/loginAttempts";
import { cn } from "@/lib/utils";
import type { LoginAttemptRow } from "./loginAttemptRows";

const OUTCOME_TONE = { income: "text-emerald", expense: "text-expense", warning: "text-warning" } as const;

// Why it failed, and what followed, in the reader's language.
const OutcomeCell = ({ row }: { row: LoginAttemptGroup }) => {
  const { translate } = useLocale();
  const { text, note, tone } = attemptOutcome(row, { t: translate });
  return (
    <span className="flex flex-col gap-px">
      <span className={cn("font-semibold", OUTCOME_TONE[tone])}>{text}</span>
      {note && <span className="text-caption text-ink-muted">{note}</span>}
    </span>
  );
};

const WhenCell = ({ row }: { row: LoginAttemptGroup }) => {
  const { translate } = useLocale();
  return formatTimeRange(row.firstAt, row.lastAt, { t: translate });
};

// "5 tries" on a burst, or "At least 20 tries" when it runs past this page.
// White with a red edge, so it keeps its shape on the burst's red row.
const TriesChip = ({ row }: { row: LoginAttemptRow }) => {
  const { translate, locale } = useLocale();
  const count = formatCount(row.attempts.length, locale);
  return (
    <span className="shrink-0 rounded-full border border-expense-line bg-surface px-2 py-px text-caption font-bold text-expense">
      {translate(row.clipped ? "At least {count} tries" : "{count} tries", { count })}
    </span>
  );
};

const outcomeText = (row: LoginAttemptGroup) => {
  const { text, note } = attemptOutcome(row);
  return note ? `${text} (${note})` : text;
};

// One row per attempt, or per burst of failures by one email from one
// network: who and on what device, from where, why it failed, and when.
export const loginAttemptsColumns: ColumnDef<LoginAttemptRow>[] = [
  {
    id: "email",
    accessorKey: "email",
    header: "Email and device",
    cell: ({ row }) => (
      <span className="flex min-w-0 flex-col gap-px">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-ink">{row.original.email}</span>
          {row.original.attempts.length > 1 && <TriesChip row={row.original} />}
        </span>
        <span className="text-small text-ink-muted">{row.original.deviceLabel}</span>
      </span>
    ),
    meta: { exportValue: (row) => `${row.email} (${row.deviceLabel})` },
  },
  {
    id: "ipAddress",
    accessorKey: "ipAddress",
    header: "IP address",
    cell: ({ row }) => <code className="font-mono text-small whitespace-nowrap text-ink-2">{row.original.ipAddress}</code>,
    meta: { width: 124 },
  },
  {
    id: "outcome",
    accessorFn: outcomeText,
    header: "Why it failed",
    cell: ({ row }) => <OutcomeCell row={row.original} />,
    meta: { width: 210 },
  },
  {
    id: "when",
    accessorKey: "lastAt",
    header: "When",
    cell: ({ row }) => (
      <span className="block text-right text-small whitespace-nowrap text-ink-2" title={formatDateTime(row.original.lastAt)}>
        <WhenCell row={row.original} />
      </span>
    ),
    meta: { width: 130, align: "right", exportValue: (row) => formatDateTime(row.lastAt) },
  },
];
