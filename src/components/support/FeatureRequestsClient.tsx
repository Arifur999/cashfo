"use client";

import { ArrowBigUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import type { FeatureRequestRow, FeatureRequestStatus } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { updateFeatureRequestStatusAction } from "@/app/admin/(dashboard)/feature-requests/_actions";
import { FeatureRequestStatusBadge } from "./FeatureRequestStatusBadge";

const STATUS_OPTIONS: FeatureRequestStatus[] = ["SUBMITTED", "UNDER_REVIEW", "PLANNED", "IN_PROGRESS", "SHIPPED", "DECLINED"];

interface FeatureRequestsClientProps {
  requests: FeatureRequestRow[];
  canManage: boolean;
}

export function FeatureRequestsClient({ requests, canManage }: FeatureRequestsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateFilter(status: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (status) params.set("status", status);
    else params.delete("status");
    startTransition(() => router.push(`/admin/feature-requests?${params.toString()}`));
  }

  async function handleStatusChange(id: string, status: FeatureRequestStatus) {
    const result = await updateFeatureRequestStatusAction(id, status);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      toast.error(result.message ?? t("Failed to update feature request"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-black/5">
        <select
          value={searchParams.get("status") ?? ""}
          onChange={(e) => updateFilter(e.target.value || null)}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">{t("All statuses")}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className={`space-y-3 ${isPending ? "opacity-60" : ""}`}>
        {requests.map((request) => (
          <div key={request.id} className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm shadow-black/5">
            <div className="flex flex-col items-center rounded-xl bg-neutral-50 px-3 py-2 text-neutral-600">
              <ArrowBigUp className="h-5 w-5" />
              <span className="text-sm font-semibold text-neutral-900">{request.voteCount}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-neutral-900">{request.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{request.description}</p>
              <div className="mt-2">
                <FeatureRequestStatusBadge status={request.status} />
              </div>
            </div>
            {canManage && (
              <select
                value={request.status}
                onChange={(e) => handleStatusChange(request.id, e.target.value as FeatureRequestStatus)}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
        {requests.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center text-neutral-400 shadow-sm shadow-black/5">
            {t("No feature requests match this filter.")}
          </div>
        )}
      </div>
    </div>
  );
}
