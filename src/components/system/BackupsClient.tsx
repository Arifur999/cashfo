"use client";

import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { SummaryCard } from "@/components/payments/SummaryCard";
import type { BackupRecordRow, BackupStatusSummary } from "@/lib/api";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/t";
import { BackupStatusBadge } from "./BackupStatusBadge";

interface BackupsClientProps {
  backups: BackupRecordRow[];
  summary: BackupStatusSummary;
}

export function BackupsClient({ backups, summary }: BackupsClientProps) {
  const isStale = summary.daysSinceLastBackup !== null && summary.daysSinceLastBackup > 2;

  const displayedBackups = backups;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={Clock}
          label={t("Last Successful Backup")}
          value={summary.lastSuccessfulBackupAt ? new Date(summary.lastSuccessfulBackupAt).toLocaleString() : t("Never")}
        />
        <div className={cn("rounded-2xl bg-white p-5 shadow-sm shadow-black/5", isStale && "ring-2 ring-brand-danger")}>
          <div className={cn("flex items-center gap-2", isStale ? "text-brand-danger" : "text-neutral-400")}>
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">{t("Days Since Last Backup")}</span>
          </div>
          <p className={cn("mt-2 text-2xl font-bold", isStale ? "text-brand-danger" : "text-neutral-900")}>
            {summary.daysSinceLastBackup ?? "—"}
          </p>
        </div>
        <SummaryCard
          icon={CheckCircle}
          label={t("Success Rate (30d)")}
          value={summary.successRate30d !== null ? `${summary.successRate30d}%` : "—"}
        />
      </div>

      <div className="flex items-center justify-end gap-2 text-sm text-neutral-400">
        <AlertTriangle className="h-4 w-4" />
        {t("Real backup automation isn't wired up yet -- no pg_dump/storage upload runs anywhere in this app.")}
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm shadow-black/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t("Started")}</th>
              <th className="px-4 py-3 font-medium">{t("Type")}</th>
              <th className="px-4 py-3 font-medium">{t("Status")}</th>
              <th className="px-4 py-3 font-medium">{t("Size")}</th>
              <th className="px-4 py-3 font-medium">{t("Location")}</th>
              <th className="px-4 py-3 font-medium">{t("Note")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {displayedBackups.map((backup) => (
              <tr key={backup.id} className="hover:bg-neutral-50/60">
                <td className="px-4 py-3 text-neutral-500">{new Date(backup.startedAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-neutral-500">{backup.type}</td>
                <td className="px-4 py-3">
                  <BackupStatusBadge status={backup.status} />
                </td>
                <td className="px-4 py-3 text-neutral-500">{backup.sizeMb !== null ? `${backup.sizeMb} MB` : "—"}</td>
                <td className="px-4 py-3 text-neutral-500">{backup.fileLocation ?? "—"}</td>
                <td className="px-4 py-3 text-brand-danger">{backup.errorMessage ?? ""}</td>
              </tr>
            ))}
            {displayedBackups.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                  {t("No backups yet.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
