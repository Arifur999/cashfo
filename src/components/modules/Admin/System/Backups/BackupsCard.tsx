"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import Card from "@/components/smartly/Card";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatRelativeDateTime } from "@/lib/date";
import { formatNumber, formatPercent } from "@/lib/number";
import { cn } from "@/lib/utils";
import { adminAccountsQuery } from "@/queries/security.queries";
import { backupsQuery, backupStatusSummaryQuery } from "@/queries/system.queries";
import type { BackupStatus, IBackupRecord } from "@/types/system.types";

const ROWS_SHOWN = 8;

const RESULT: Record<BackupStatus, { label: string; chip: string }> = {
  SUCCESS: { label: "Done", chip: "bg-mint-50 text-brand-ink" },
  FAILED: { label: "Failed", chip: "bg-expense-soft text-expense" },
  IN_PROGRESS: { label: "Running", chip: "bg-warning-soft text-warning" },
};

const sizeText = (sizeMb: number | null) => (sizeMb === null ? "—" : `${formatNumber(Math.round(sizeMb))} MB`);

// "Took 4 minutes", or what went wrong.
const resultNote = (backup: IBackupRecord) => {
  if (backup.errorMessage) return backup.errorMessage;
  if (!backup.completedAt) return "";
  const minutes = Math.max(1, Math.round((new Date(backup.completedAt).getTime() - new Date(backup.startedAt).getTime()) / 60_000));
  return `Took ${minutes === 1 ? "a minute" : `${minutes} minutes`}`;
};

const SummaryCell = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
  <div className="flex flex-col gap-0.5 border-r border-surface-sunken px-5 py-3 last:border-r-0">
    <span className="text-small text-ink-muted">{label}</span>
    <span className="text-h3 font-bold text-ink tabular-nums">{value}</span>
    <span className="text-caption text-ink-muted">{sub}</span>
  </div>
);

// The design's backups card: the last good backup and how reliable they
// have been, then the latest runs. Nothing backs the database up yet (a NEW
// item in the design notes), so "Back up now" stays off and says why.
const BackupsCard = () => {
  const summary = useQuery(backupStatusSummaryQuery()).data?.data;
  const backups = useQuery(backupsQuery()).data?.data;
  const admins = useQuery(adminAccountsQuery()).data?.data;
  const nameById = useMemo(() => new Map((admins ?? []).map((admin) => [admin.id, admin.name])), [admins]);

  const rows = backups ?? [];
  const lastGood = rows.find((backup) => backup.status === "SUCCESS");

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-title text-ink">Backups</h2>
          <span className="text-small text-ink-muted">Not automated yet: nothing backs the database up at night. Runs recorded so far show here.</span>
        </div>
        <Button type="button" variant="outline" disabled title="Backups aren't wired up yet" className="h-9 shrink-0 self-start border-line-strong bg-surface px-4 font-semibold text-ink sm:self-auto">
          Back up now
        </Button>
      </div>
      <div className="grid grid-cols-1 border-y border-surface-sunken sm:grid-cols-3">
        <SummaryCell
          label="Last good backup"
          value={summary?.lastSuccessfulBackupAt ? formatRelativeDateTime(summary.lastSuccessfulBackupAt) : "Never"}
          sub={lastGood ? sizeText(lastGood.sizeMb) : "No backup yet"}
        />
        <SummaryCell
          label="Worked, last 30 days"
          value={formatPercent(summary?.successRate30d)}
          sub={summary?.finishedLast30d ? `${formatNumber(summary.succeededLast30d)} of ${formatNumber(summary.finishedLast30d)} backups` : "No backups in 30 days"}
        />
        <SummaryCell label="Days since a good backup" value={formatNumber(summary?.daysSinceLastBackup)} sub="Worth a look after 2 days" />
      </div>
      <table className="w-full table-fixed text-body">
        <colgroup>
          <col className="w-40" />
          <col className="w-28" />
          <col />
          <col className="w-24" />
        </colgroup>
        <thead className="bg-cream text-caption font-medium text-ink-muted">
          <tr className="border-b border-line">
            <th scope="col" className="px-5 py-2 text-left font-medium">
              Started
            </th>
            <th scope="col" className="py-2 text-left font-medium">
              Type
            </th>
            <th scope="col" className="py-2 pl-3 text-left font-medium">
              Result
            </th>
            <th scope="col" className="px-5 py-2 text-right font-medium">
              Size
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-5 py-6 text-center text-small text-ink-muted">
                No backups recorded yet.
              </td>
            </tr>
          ) : (
            rows.slice(0, ROWS_SHOWN).map((backup) => {
              const by = backup.type === "MANUAL" ? nameById.get(backup.triggeredBy) : null;
              const note = resultNote(backup);
              return (
                <tr key={backup.id} className="h-11.5 border-b border-surface-sunken last:border-b-0">
                  <td className="px-5 text-ink-2" title={formatDateTime(backup.startedAt)}>
                    {formatRelativeDateTime(backup.startedAt)}
                  </td>
                  <td>
                    <span className="flex flex-col">
                      <span>{backup.type === "MANUAL" ? "Manual" : "Scheduled"}</span>
                      {by && <span className="text-caption text-ink-muted">{by}</span>}
                    </span>
                  </td>
                  <td className="pl-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-caption font-semibold", RESULT[backup.status].chip)}>{RESULT[backup.status].label}</span>
                      {note && <span className="truncate text-small text-ink-muted">{note}</span>}
                    </span>
                  </td>
                  <td className="px-5 text-right tabular-nums">{sizeText(backup.sizeMb)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </Card>
  );
};

export default BackupsCard;
