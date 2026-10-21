"use client";

import { useId } from "react";
import { resolveErrorsAction } from "@/app/(dashboardLayout)/admin/system/errors/_action";
import CopyButton from "@/components/shared/CopyButton";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatDateTime, formatRelativeDateTime } from "@/lib/date";
import { ERROR_SOURCE_LABEL, type ErrorGroup, errorFrequency, errorRequest } from "@/lib/errorGroups";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { CHIP, ERROR_SEVERITY_CHIP, SOURCE_CHIP } from "./errorChips";

// Everything worth pasting into an issue: the message, how often, where,
// and the newest stack trace. (English: it goes into a bug report.)
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

interface ErrorDetailPanelProps {
  group: ErrorGroup;
  // In the drawer below xl: no card of its own, the actions pinned to the
  // drawer's foot.
  inDrawer?: boolean;
  // "Mark fixed" worked. The group may leave the list, so the board decides
  // where focus goes next.
  onFixed?: (group: ErrorGroup) => void;
}

// The picked problem: the full message, how often and where, the newest
// stack trace, and "Mark all N fixed". Beside the list from xl, in a drawer
// below it.
const ErrorDetailPanel = ({ group, inDrawer = false, onFixed }: ErrorDetailPanelProps) => {
  const headingId = useId();
  const [latest] = group.logs;
  const request = errorRequest(latest, 4);
  const open = group.logs.filter((log) => !log.resolved);
  const { translate, locale } = useLocale();

  const { run, isPending } = useActionMutation({
    action: (ids: string[]) => resolveErrorsAction(ids),
    successMessage: ({ count }) => translate(count === 1 ? "{count} error marked fixed" : "{count} errors marked fixed", { count: formatCount(count, locale) }),
    invalidateKeys: [queryKeys.errorLogs.all],
    refreshRoute: false,
  });
  const fix = async () => {
    if (await run(open.map((log) => log.id))) onFixed?.(group);
  };

  const chips = (
    <span className="flex flex-wrap items-center gap-2">
      <span className={cn(CHIP, "font-bold", locale === "en" && "tracking-wide", ERROR_SEVERITY_CHIP[group.severity])}>
        <T>{group.severity}</T>
      </span>
      <span className={cn(CHIP, "font-semibold", SOURCE_CHIP)}>
        <T>{ERROR_SOURCE_LABEL[group.source]}</T>
      </span>
    </span>
  );
  // Under the drawer's own title it is a level down.
  const Heading = inDrawer ? "h3" : "h2";
  const heading = (
    <Heading id={headingId} title={group.message} className="line-clamp-4 font-mono text-body leading-normal font-semibold wrap-anywhere text-ink">
      {group.message}
    </Heading>
  );
  const facts = (
    <dl className={cn("grid grid-cols-[90px_minmax(0,1fr)] gap-x-3 gap-y-2 text-small", !inDrawer && "px-5 py-4")}>
      <dt className="text-ink-muted">
        <T>How often</T>
      </dt>
      <dd className="font-semibold text-ink">{errorFrequency(group, { t: translate })}</dd>
      {request && (
        <>
          <dt className="text-ink-muted">
            <T>{latest.source === "ADMIN_FRONTEND" ? "Page" : "Request"}</T>
          </dt>
          <dd>
            <code className="font-mono text-caption wrap-anywhere text-ink">{request}</code>
          </dd>
        </>
      )}
      {latest.resolvedAt && (
        <>
          <dt className="text-ink-muted">
            <T>Fixed</T>
          </dt>
          <dd className="text-ink">{formatRelativeDateTime(latest.resolvedAt, { t: translate })}</dd>
        </>
      )}
    </dl>
  );
  const stack = (
    <div className={cn("flex flex-col gap-2", !inDrawer && "px-5 pb-4")}>
      <span className="text-small font-semibold text-ink">
        <T>Stack trace</T>
      </span>
      <pre className="max-h-72 overflow-auto rounded-md bg-ink px-4 py-3 font-mono text-caption leading-relaxed whitespace-pre-wrap wrap-anywhere text-line-strong">
        {latest.stackTrace ?? translate("No stack trace was saved with this error.")}
      </pre>
    </div>
  );
  const actions = (
    <>
      <CopyButton value={detailsText(group)} label="the error details" text="Copy details" size="md" />
      {open.length > 0 && (
        <Button variant="action" disabled={isPending} onClick={() => void fix()}>
          {isPending ? translate("Marking...") : open.length === 1 ? translate("Mark fixed") : translate("Mark all {count} fixed", { count: formatCount(open.length, locale) })}
        </Button>
      )}
    </>
  );

  if (inDrawer) {
    return (
      <section aria-labelledby={headingId} className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-2">
          {chips}
          {heading}
        </div>
        {facts}
        {stack}
        <div className="-mx-6 mt-auto -mb-5 flex flex-wrap justify-end gap-2 border-t border-line bg-strip px-6 py-4">{actions}</div>
      </section>
    );
  }

  return (
    <Card asChild padding="none" className="flex flex-col overflow-hidden">
      <section aria-labelledby={headingId}>
        <div className="flex flex-col gap-2 border-b border-line px-5 py-4">
          {chips}
          {heading}
        </div>
        {facts}
        {stack}
        <div className="mt-auto flex flex-wrap justify-end gap-2 border-t border-line bg-strip px-5 py-3">{actions}</div>
      </section>
    </Card>
  );
};

export default ErrorDetailPanel;
