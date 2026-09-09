"use client";

import { AlertTriangle, CheckCircle, Clock, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { SummaryCard } from "@/components/payments/SummaryCard";
import type { BackupRecordRow, BackupStatusSummary } from "@/lib/api";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/t";
import { triggerBackupAction } from "@/app/admin/(dashboard)/system/_actions";
import { BackupStatusBadge } from "./BackupStatusBadge";

interface BackupsClientProps {
  backups: BackupRecordRow[];
  summary: BackupStatusSummary;
}

export function BackupsClient({ backups, summary }: BackupsClientProps) {
  const router = useRouter();
  const [isTriggering, setIsTriggering] = useState(false);
  const [optimisticBackup, setOptimisticBackup] = useState<BackupRecordRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const isStale = summary.daysSinceLastBackup !== null && summary.daysSinceLastBackup > 2;

  async function handleTrigger() {
    setIsTriggering(true);
    const result = await triggerBackupAction();
    setIsTriggering(false);
    if (result.success && result.data) {
      setOptimisticBackup(result.data);
      toast.success(t("Backup started."));
      // The backend simulates the job completing ~3s later (see
      // BackupsService.trigger) -- refresh shortly after so the
      // IN_PROGRESS -> SUCCESS transition shows up without a manual reload.
      setTimeout(() => {
        setOptimisticBackup(null);
        startTransition(() => router.refresh());
      }, 3500);
    } else {
      toast.error(result.message ?? t("Failed to trigger backup"));
    }
  }

  const displayedBackups = optimisticBackup ? [optimisticBackup, ...backups] : backups;

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

      <div className="flex justify-end">
        <button
          type="button"
          disabled={isTriggering || Boolean(optimisticBackup)}
          onClick={handleTrigger}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isTriggering || optimisticBackup ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t("Trigger Backup Now")}
        </button>
      </div>

      <div className={`overflow-x-auto rounded-2xl bg-white shadow-sm shadow-black/5 ${isPending ? "opacity-60" : ""}`}>
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
