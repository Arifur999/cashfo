"use client";

import { useQuery } from "@tanstack/react-query";
import { useId, useMemo } from "react";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import ErrorState from "@/components/smartly/ErrorState";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow } from "@/components/smartly/list";
import { formatDateTime, formatRelativeDateTime } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";
import { formatPercent } from "@/lib/number";
import { cn } from "@/lib/utils";
import { adminAccountsQuery } from "@/queries/security.queries";
import { backupsQuery, backupStatusSummaryQuery } from "@/queries/system.queries";
import type { BackupStatus, IBackupRecord } from "@/types/system.types";
import { type BackupAgeTone, backupAgeTone } from "./backupAge";

const ROWS_SHOWN = 8;

// Started | Type | Result | Size from md up. Phones get two columns: the
// time over its type on the left, the result over its size on the right,
// and what happened across the row under them.
const COLUMNS = "md:grid-cols-[160px_112px_minmax(0,1fr)_96px]";

const RESULT: Record<BackupStatus, { label: string; tone: "mint" | "expense" | "warning" }> = {
  SUCCESS: { label: "Done", tone: "mint" },
  FAILED: { label: "Failed", tone: "expense" },
  IN_PROGRESS: { label: "Running", tone: "warning" },
};

const AGE_TONE: Record<BackupAgeTone, string> = { ok: "text-ink", warning: "text-warning", danger: "text-expense" };

const sizeText = (sizeMb: number | null, locale: Locale) => (sizeMb === null ? "—" : `${formatCount(Math.round(sizeMb), locale)} MB`);

// "Took 4 minutes", or what went wrong.
const resultNote = (backup: IBackupRecord, t: Translate, locale: Locale) => {
  if (backup.errorMessage) return backup.errorMessage;
  if (!backup.completedAt) return "";
  const minutes = Math.max(1, Math.round((new Date(backup.completedAt).getTime() - new Date(backup.startedAt).getTime()) / 60_000));
  return minutes === 1 ? t("Took a minute") : t("Took {count} minutes", { count: formatCount(minutes, locale) });
};

// One figure over the runs. Stacked on phones, each with a line under it;
// side by side from sm, with a line between.
const SummaryCell = ({ label, value, sub, valueClassName }: { label: string; value: string; sub?: string; valueClassName?: string }) => (
  <div className="flex flex-col gap-0.5 border-b border-divider px-4 py-3 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0 md:px-6">
    <span className="text-small text-ink-muted">
      <T>{label}</T>
    </span>
    <span className={cn("text-h3 font-bold tabular-nums", valueClassName ?? "text-ink")}>{value}</span>
    {sub && (
      <span className="text-caption text-ink-muted">
        <T>{sub}</T>
      </span>
    )}
  </div>
);

// The design's backups card: the last good backup and how reliable they
// have been, then the latest runs. Nothing backs the database up yet (a NEW
// item in the design notes), so "Back up now" stays off and says why, in
// words anyone can read, not a hover tip.
const BackupsCard = () => {
  const { translate, locale } = useLocale();
  const offReasonId = useId();
  const summaryQuery = useQuery(backupStatusSummaryQuery());
  const runsQuery = useQuery(backupsQuery());
  const admins = useQuery(adminAccountsQuery()).data?.data;
  const nameById = useMemo(() => new Map((admins ?? []).map((admin) => [admin.id, admin.name])), [admins]);

  const summary = summaryQuery.data?.data;
  const runs = runsQuery.data?.data ?? [];
  const lastGood = runs.find((backup) => backup.status === "SUCCESS");
  const count = (value: number) => formatCount(value, locale);
  // A failed read is not "no backup yet": the card says it couldn't load.
  const failed = (summaryQuery.isError && !summaryQuery.data) || (runsQuery.isError && !runsQuery.data);

  const titleRow = (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between md:px-6">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-title text-ink">
          <T>Backups</T>
        </h2>
        <span className="text-small text-ink-muted">
          <T>Not automated yet: nothing backs the database up at night. Runs recorded so far show here.</T>
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
        <Button variant="secondary" size="sm" disabled aria-describedby={offReasonId}>
          <T>Back up now</T>
        </Button>
        <span id={offReasonId} className="text-caption text-ink-muted">
          <T>Backups aren&apos;t wired up yet</T>
        </span>
      </div>
    </div>
  );

  if (failed) {
    return (
      <Card padding="none" className="overflow-hidden">
        {titleRow}
        <ErrorState
          bordered={false}
          className="border-t border-line"
          title={translate("Couldn't load the backups")}
          onRetry={() => {
            void summaryQuery.refetch();
            void runsQuery.refetch();
          }}
        />
      </Card>
    );
  }

  const days = summary?.daysSinceLastBackup ?? null;
  // Until the first read lands the figures show a dash and no sub line, so
  // a slow or retried read never reads as "Never" or "No backups".
  const header = (
    <>
      {titleRow}
      <div className="grid grid-cols-1 border-t border-divider border-b border-b-line sm:grid-cols-3">
        <SummaryCell
          label="Last good backup"
          value={summary ? (summary.lastSuccessfulBackupAt ? formatRelativeDateTime(summary.lastSuccessfulBackupAt, { t: translate }) : translate("Never")) : "—"}
          sub={runsQuery.isPending ? undefined : lastGood ? sizeText(lastGood.sizeMb, locale) : "No backup yet"}
        />
        <SummaryCell
          label="Worked, last 30 days"
          value={summary ? toLocaleDigits(formatPercent(summary.successRate30d), locale) : "—"}
          sub={
            !summary
              ? undefined
              : summary.finishedLast30d
                ? translate("{done} of {total} backups", { done: count(summary.succeededLast30d), total: count(summary.finishedLast30d) })
                : "No backups in 30 days"
          }
        />
        {/* Goes amber after two days and red after a week, or with none at all. */}
        <SummaryCell
          label="Days since a good backup"
          value={summary ? (days === null ? translate("No good backup yet") : count(days)) : "—"}
          valueClassName={summary ? AGE_TONE[backupAgeTone(days)] : undefined}
          sub="Worth a look after 2 days"
        />
      </div>
    </>
  );

  const footer =
    runs.length > ROWS_SHOWN ? (
      <ListFooter>
        <p>{translate("Showing the newest {shown} of {total} backups", { shown: count(ROWS_SHOWN), total: count(runs.length) })}</p>
      </ListFooter>
    ) : undefined;

  return (
    <ListCard label={translate("Backup runs")} header={header} footer={footer}>
      {runsQuery.isPending ? (
        <ListEmpty title={translate("Loading...")} />
      ) : runs.length === 0 ? (
        <ListEmpty title={translate("No backups recorded yet.")} />
      ) : (
        <>
          <ListHead columns={COLUMNS}>
            <ListHeadCell>
              <T>Started</T>
            </ListHeadCell>
            <ListHeadCell>
              <T>Type</T>
            </ListHeadCell>
            <ListHeadCell>
              <T>Result</T>
            </ListHeadCell>
            <ListHeadCell align="end">
              <T>Size</T>
            </ListHeadCell>
          </ListHead>
          {runs.slice(0, ROWS_SHOWN).map((backup) => {
            const by = backup.type === "MANUAL" ? nameById.get(backup.triggeredBy) : null;
            const type = translate(backup.type === "MANUAL" ? "Manual" : "Scheduled");
            const note = resultNote(backup, translate, locale);
            const size = sizeText(backup.sizeMb, locale);
            const result = RESULT[backup.status];
            return (
              <ListRow key={backup.id} columns={COLUMNS} density="dense">
                <ListCell className="flex flex-col gap-0.5">
                  <span className="text-ink-2" title={formatDateTime(backup.startedAt)}>
                    {formatRelativeDateTime(backup.startedAt, { t: translate })}
                  </span>
                  <span className="text-caption text-ink-muted md:hidden">{by ? `${type} · ${by}` : type}</span>
                </ListCell>
                <ListCell className="hidden flex-col md:flex">
                  <span>{type}</span>
                  {by && <span className="text-caption text-ink-muted">{by}</span>}
                </ListCell>
                <ListCell className="flex flex-col items-end gap-1 md:flex-row md:items-center md:gap-2">
                  <Chip tone={result.tone} size="sm">
                    {translate(result.label)}
                  </Chip>
                  {note && (
                    <span className="hidden min-w-0 text-small text-ink-muted md:line-clamp-2" title={note}>
                      {note}
                    </span>
                  )}
                  <span className="text-caption text-ink-muted tabular-nums md:hidden">{size}</span>
                </ListCell>
                <ListCell align="end" className="hidden tabular-nums md:block">
                  {size}
                </ListCell>
                {note && (
                  <ListCell className="col-span-2 line-clamp-2 text-caption text-ink-muted md:hidden" title={note}>
                    {note}
                  </ListCell>
                )}
              </ListRow>
            );
          })}
        </>
      )}
    </ListCard>
  );
};

export default BackupsCard;
