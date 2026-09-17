"use client";

import { AlertTriangle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { BulkNotificationCampaignRow, NotificationTemplateRow, SubscriptionPlanOption } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { cancelCampaignAction } from "@/app/admin/(dashboard)/notifications/_actions";
import { CampaignStatusBadge } from "./CampaignStatusBadge";
import { NotificationChannelBadge } from "./NotificationChannelBadge";
import { NewCampaignModal } from "./NewCampaignModal";

const SENDABLE = new Set(["DRAFT", "SCHEDULED"]);

function describeFilter(filter: { planId?: string; status?: string }, planOptions: SubscriptionPlanOption[]): string {
  const parts: string[] = [];
  if (filter.planId) {
    const plan = planOptions.find((p) => p.id === filter.planId);
    parts.push(`Plan = ${plan?.name ?? filter.planId}`);
  }
  if (filter.status) parts.push(`Status = ${filter.status}`);
  return parts.length > 0 ? parts.join(", ") : "All users";
}

interface CampaignsClientProps {
  campaigns: BulkNotificationCampaignRow[];
  templates: NotificationTemplateRow[];
  planOptions: SubscriptionPlanOption[];
  canManage: boolean;
}

export function CampaignsClient({ campaigns, templates, planOptions, canManage }: CampaignsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isNewCampaignOpen, setIsNewCampaignOpen] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  async function handleCancel(id: string) {
    setActioningId(id);
    const result = await cancelCampaignAction(id);
    setActioningId(null);
    if (result.success) {
      toast.success(t("Campaign cancelled."));
      startTransition(() => router.refresh());
    } else {
      toast.error(result.message ?? t("Failed to cancel campaign"));
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsNewCampaignOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
          >
            <Plus className="h-4 w-4" />
            {t("New Campaign")}
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <AlertTriangle className="h-4 w-4" />
        {t("Real delivery isn't wired up yet -- no email/SMS/push provider is integrated, so campaigns can be drafted and cancelled but not sent.")}
      </div>

      <div className={`overflow-x-auto rounded-2xl bg-white shadow-sm shadow-black/5 ${isPending ? "opacity-60" : ""}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t("Title")}</th>
              <th className="px-4 py-3 font-medium">{t("Target")}</th>
              <th className="px-4 py-3 font-medium">{t("Channel")}</th>
              <th className="px-4 py-3 font-medium">{t("Status")}</th>
              <th className="px-4 py-3 font-medium">{t("Sent / Failed")}</th>
              {canManage && <th className="px-4 py-3 font-medium text-right">{t("Actions")}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="hover:bg-neutral-50/60">
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-900">{campaign.title}</p>
                  <p className="font-mono text-xs text-neutral-400">{campaign.templateKey}</p>
                </td>
                <td className="px-4 py-3 text-neutral-500">{describeFilter(campaign.targetFilter, planOptions)}</td>
                <td className="px-4 py-3">
                  <NotificationChannelBadge channel={campaign.channel} />
                </td>
                <td className="px-4 py-3">
                  <CampaignStatusBadge status={campaign.status} />
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {campaign.sentCount} / {campaign.failedCount}
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    {SENDABLE.has(campaign.status) && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={actioningId === campaign.id}
                          onClick={() => handleCancel(campaign.id)}
                          className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
                        >
                          <X className="h-3 w-3" />
                          {t("Cancel")}
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="px-4 py-10 text-center text-neutral-400">
                  {t("No campaigns yet.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canManage && (
        <NewCampaignModal
          open={isNewCampaignOpen}
          onClose={() => setIsNewCampaignOpen(false)}
          templates={templates}
          planOptions={planOptions}
        />
      )}
    </div>
  );
}
