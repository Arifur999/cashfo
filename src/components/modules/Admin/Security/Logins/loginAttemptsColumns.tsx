import type { ColumnDef } from "@tanstack/react-table";
import { formatDateTime, formatTimeRange } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { attemptOutcome, type LoginAttemptGroup } from "@/lib/loginAttempts";
import { cn } from "@/lib/utils";
import T from "@/components/shared/T";

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

const outcomeText = (row: LoginAttemptGroup) => {
  const { text, note } = attemptOutcome(row);
  return note ? `${text} (${note})` : text;
};

// One row per attempt, or per burst of failures by one email from one
// network: who and on what device, from where, why it failed, and when.
export const loginAttemptsColumns: ColumnDef<LoginAttemptGroup>[] = [
  {
    id: "email",
    accessorKey: "email",
    header: "Email and device",
    cell: ({ row }) => (
      <span className="flex min-w-0 flex-col gap-px">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-ink">{row.original.email}</span>
          {row.original.attempts.length > 1 && (
            <span className="shrink-0 rounded-full bg-expense-soft px-2 py-px text-caption font-bold text-expense"><T values={{ count: row.original.attempts.length }}>{"{count} tries"}</T>
            </span>
          )}
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
  },
  {
    id: "outcome",
    accessorFn: outcomeText,
    header: "Why it failed",
    cell: ({ row }) => <OutcomeCell row={row.original} />,
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
    meta: { align: "right", exportValue: (row) => formatDateTime(row.lastAt) },
  },
];
