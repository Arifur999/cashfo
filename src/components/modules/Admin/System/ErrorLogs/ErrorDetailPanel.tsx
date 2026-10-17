"use client";

import { resolveErrorsAction } from "@/app/(dashboardLayout)/admin/system/errors/_action";
import CopyButton from "@/components/shared/CopyButton";
import Card from "@/components/smartly/Card";
import { Button } from "@/components/ui/button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatDateTime, formatRelativeDateTime } from "@/lib/date";
import { ERROR_SOURCE_LABEL, type ErrorGroup, errorFrequency, errorRequest } from "@/lib/errorGroups";
import { queryKeys } from "@/lib/queryKeys";
import { pluralize } from "@/lib/text";
import { cn } from "@/lib/utils";
import { CHIP, ERROR_SEVERITY_CHIP, SOURCE_CHIP } from "./errorChips";

// Everything worth pasting into an issue: the message, how often, where,
// and the newest stack trace.
const detailsText = (group: ErrorGroup) => {
  const [latest] = group.logs;
  return [
    `${group.severity} · ${ERROR_SOURCE_LABEL[group.source]}`,
    group.message,
    `${group.logs.length} times, first ${formatDateTime(group.firstAt)}, last ${formatDateTime(group.lastAt)}`,
    errorRequest(latest, 36),
    latest.stackTrace,
  ]
    .filter(Boolean)
    .join("\n\n");
};

// The picked problem, beside the list: the full message, how often and
// where, the newest stack trace, and "Mark all N fixed".
const ErrorDetailPanel = ({ group }: { group: ErrorGroup }) => {
  const [latest] = group.logs;
  const request = errorRequest(latest, 4);
  const open = group.logs.filter((log) => !log.resolved);

  const { run, isPending } = useActionMutation({
    action: (ids: string[]) => resolveErrorsAction(ids),
    successMessage: ({ count }) => `${pluralize(count, "error")} marked fixed`,
    invalidateKeys: [queryKeys.errorLogs.all],
    refreshRoute: false,
  });

  return (
    <Card padding="none" className="flex flex-col overflow-hidden" aria-labelledby="error-title">
      <div className="flex flex-col gap-2 border-b border-line px-5 py-4">
        <span className="flex flex-wrap items-center gap-2">
          <span className={cn(CHIP, "font-bold tracking-wide", ERROR_SEVERITY_CHIP[group.severity])}>{group.severity}</span>
          <span className={cn(CHIP, "font-semibold", SOURCE_CHIP)}>{ERROR_SOURCE_LABEL[group.source]}</span>
        </span>
        <h2 id="error-title" title={group.message} className="line-clamp-4 font-mono text-body leading-normal font-semibold wrap-anywhere text-ink">
          {group.message}
        </h2>
      </div>
      <dl className="grid grid-cols-[90px_minmax(0,1fr)] gap-x-3 gap-y-2 px-5 py-4 text-small">
        <dt className="text-ink-muted">How often</dt>
        <dd className="font-semibold text-ink">{errorFrequency(group)}</dd>
        {request && (
          <>
            <dt className="text-ink-muted">{latest.source === "ADMIN_FRONTEND" ? "Page" : "Request"}</dt>
            <dd>
              <code className="font-mono text-caption wrap-anywhere text-ink">{request}</code>
            </dd>
          </>
        )}
        {latest.resolvedAt && (
          <>
            <dt className="text-ink-muted">Fixed</dt>
            <dd className="text-ink">{formatRelativeDateTime(latest.resolvedAt)}</dd>
          </>
        )}
      </dl>
      <div className="flex flex-col gap-2 px-5 pb-4">
        <span className="text-small font-semibold text-ink">Stack trace</span>
        <pre className="max-h-72 overflow-auto rounded-md bg-ink px-4 py-3 font-mono text-caption leading-relaxed whitespace-pre-wrap wrap-anywhere text-line-strong">
          {latest.stackTrace ?? "No stack trace was saved with this error."}
        </pre>
      </div>
      <div className="mt-auto flex flex-wrap justify-end gap-2 border-t border-line bg-cream px-5 py-3">
        <CopyButton value={detailsText(group)} label="the error details" text="Copy details" size="md" />
        {open.length > 0 && (
          <Button type="button" disabled={isPending} className="h-10 bg-emerald px-4 font-semibold hover:bg-emerald/90" onClick={() => void run(open.map((log) => log.id))}>
            {isPending ? "Marking..." : open.length === 1 ? "Mark fixed" : `Mark all ${open.length} fixed`}
          </Button>
        )}
      </div>
    </Card>
  );
};

export default ErrorDetailPanel;
