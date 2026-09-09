"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { FlagStatus, Severity, SuspiciousActivityFlagRow } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { runDetectionAction, updateFlagStatusAction } from "@/app/admin/(dashboard)/security/_actions";
import { FlagStatusBadge } from "./FlagStatusBadge";

const STATUS_OPTIONS: FlagStatus[] = ["OPEN", "REVIEWING", "RESOLVED", "FALSE_POSITIVE"];
const SEVERITY_OPTIONS: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const SEVERITY_BORDER: Record<Severity, string> = {
  LOW: "border-l-neutral-300",
  MEDIUM: "border-l-yellow-400",
  HIGH: "border-l-orange-500",
  CRITICAL: "border-l-red-600",
};

interface FlagsClientProps {
  flags: SuspiciousActivityFlagRow[];
}

export function FlagsClient({ flags }: FlagsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isRunningDetection, setIsRunningDetection] = useState(false);

  function updateFilter(key: "status" | "severity", value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.push(`/admin/security/flags?${params.toString()}`));
  }

  async function handleRunDetection() {
    setIsRunningDetection(true);
    const result = await runDetectionAction();
    setIsRunningDetection(false);
    if (result.success && result.data) {
      toast.success(`${t("Detection complete.")} ${result.data.flagsCreated} ${t("new flag(s) created.")}`);
      startTransition(() => router.refresh());
    } else {
      toast.error(result.message ?? t("Failed to run detection"));
    }
  }

  async function handleStatusChange(id: string, status: FlagStatus) {
    const result = await updateFlagStatusAction(id, status);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      toast.error(result.message ?? t("Failed to update flag"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-black/5">
        <select
          value={searchParams.get("status") ?? ""}
          onChange={(e) => updateFilter("status", e.target.value || null)}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">{t("All statuses")}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select
          value={searchParams.get("severity") ?? ""}
          onChange={(e) => updateFilter("severity", e.target.value || null)}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">{t("All severities")}</option>
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={isRunningDetection}
          onClick={handleRunDetection}
          className="ml-auto flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isRunningDetection ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t("Run Detection Now")}
        </button>
      </div>

      <div className={`space-y-3 ${isPending ? "opacity-60" : ""}`}>
        {flags.map((flag) => (
          <div
            key={flag.id}
            className={cn("rounded-2xl border-l-4 bg-white p-5 shadow-sm shadow-black/5", SEVERITY_BORDER[flag.severity])}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-900">{flag.type.replaceAll("_", " ")}</span>
                  <FlagStatusBadge status={flag.status} />
                </div>
                <p className="mt-1 text-sm text-neutral-600">{flag.description}</p>
                <p className="mt-2 text-xs text-neutral-400">
                  {flag.relatedIp && `${t("IP")}: ${flag.relatedIp}`}
                  {flag.relatedAdmin && ` · ${t("Admin")}: ${flag.relatedAdmin.name}`}
                  {" · "}
                  {new Date(flag.createdAt).toLocaleString()}
                </p>
                {flag.reviewer && flag.reviewedAt && (
                  <p className="mt-1 text-xs text-neutral-400">
                    {t("Reviewed by")} {flag.reviewer.name} {t("at")} {new Date(flag.reviewedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <select
                value={flag.status}
                onChange={(e) => handleStatusChange(flag.id, e.target.value as FlagStatus)}
                className="shrink-0 rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
        {flags.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center text-neutral-400 shadow-sm shadow-black/5">
            {t("No flags match this filter.")}
          </div>
        )}
      </div>
    </div>
  );
}
